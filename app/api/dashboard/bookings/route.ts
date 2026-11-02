import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getBookingsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import {
  resolveExpertContact,
  getAppBaseUrl,
  computeSessionBounds,
  getCurrentDateInTimezone,
} from '@/lib/email/scheduler'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import {
  renderBookingConfirmationEmail,
  renderDayOfReminderEmail,
  renderMeetLinkUpdatedEmail,
} from '@/lib/email/templates'
import {
  confirmBookingAndCreateCalendar,
  deleteCalendarEvent,
} from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

async function resolveAuth(request: Request) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized: Please log in', status: 401, expertId: null, session: null }
  }

  const { searchParams } = new URL(request.url)
  const queryExpertId = searchParams.get('expertId')

  if (session.role === 'admin') {
    if (queryExpertId) {
      return { error: null, status: 200, expertId: toObjectId(queryExpertId), session }
    }
    return { error: null, status: 200, expertId: null, session }
  }

  if (session.role === 'expert') {
    if (!session.expertId) {
      return { error: 'No expert profile associated with this account', status: 403, expertId: null, session: null }
    }
    return { error: null, status: 200, expertId: toObjectId(session.expertId), session }
  }

  return { error: 'Access denied', status: 403, expertId: null, session: null }
}

// GET: List bookings with optional status filter
export async function GET(request: Request) {
  try {
    const auth = await resolveAuth(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const limit = Number(searchParams.get('limit')) || 50

    const bookingsCol = await getBookingsCollection()
    const filter: any = {}

    if (auth.expertId) {
      filter.expertId = auth.expertId // Native BSON ObjectId!
    }

    if (statusParam === 'awaiting_verification' || statusParam === 'pending') {
      filter.status = { $in: ['awaiting_verification', 'pending', 'awaiting_payment'] }
    } else if (statusParam && statusParam !== 'all') {
      filter.status = statusParam
    }

    const docs = await bookingsCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const formatted = docs.map((b) => ({
      ...b,
      _id: b._id.toString(),
      expertId: b.expertId.toString(),
      serviceId: b.serviceId?.toString(),
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

// PATCH: Approve / Decline booking (verify receipt)
export async function PATCH(request: Request) {
  try {
    const auth = await resolveAuth(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const body = await request.json()
    const { id, action, adminNotes, googleMeetLink } = body

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'Booking ID and action (approve | reject | cancel | update_meet_link) are required' },
        { status: 400 }
      )
    }

    const bookingObjId = toObjectId(id)
    const bookingsCol = await getBookingsCollection()

    const filter: any = { _id: bookingObjId }
    if (auth.session.role !== 'admin' && auth.expertId) {
      filter.expertId = auth.expertId
    }

    const existing = await bookingsCol.findOne(filter)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Booking not found or unauthorized' },
        { status: 404 }
      )
    }

    const now = new Date()
    const baseUrl = getAppBaseUrl()
    const { expertName, expertEmail } = await resolveExpertContact(existing.expertId)
    const serviceTitle =
      existing.serviceTitle?.en || existing.serviceTitle?.ar || 'Consultation Session'
    const rescheduleUrl = existing.rescheduleToken
      ? `${baseUrl}/bookings/${existing._id}?token=${existing.rescheduleToken}`
      : undefined

    const updateDoc: any = {
      updatedAt: now,
    }

    if (action === 'approve') {
      updateDoc.status = 'confirmed'
      updateDoc.paymentStatus = 'verified'
      updateDoc.verifiedBy = new ObjectId(auth.session.userId)
      updateDoc.verifiedAt = now
      if (adminNotes) updateDoc.adminNotes = adminNotes

      // Ensure session timestamps exist
      if (!existing.sessionStartAt || !existing.sessionEndAt) {
        const bounds = computeSessionBounds(
          existing.date,
          existing.time,
          existing.durationMinutes || 45,
          existing.timezone || 'Africa/Cairo'
        )
        updateDoc.sessionStartAt = bounds.sessionStartAt
        updateDoc.sessionEndAt = bounds.sessionEndAt
      }

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      // Automatically generate a real Google Meet link via BokBok Google OAuth integration
      let finalMeetLink = (googleMeetLink?.trim() || existing.googleMeetLink?.trim() || '').trim()
      if (!finalMeetLink && existing.deliveryMode !== 'IN_PERSON') {
        try {
          const calBooking = await confirmBookingAndCreateCalendar(bookingObjId.toString())
          if (calBooking?.googleMeetLink) {
            finalMeetLink = calBooking.googleMeetLink
            updateDoc.googleMeetLink = calBooking.googleMeetLink
            updateDoc.googleCalendarEventId = calBooking.googleCalendarEventId
            updateDoc.googleCalendarEventLink = calBooking.googleCalendarEventLink
          }
        } catch (calErr: any) {
          console.error('[Google Meet] Auto-creation failed:', calErr.message)
        }
      } else if (finalMeetLink && finalMeetLink !== existing.googleMeetLink) {
        await bookingsCol.updateOne(
          { _id: bookingObjId },
          { $set: { googleMeetLink: finalMeetLink, googleMeetUpdatedAt: now } }
        )
      }

      // Send Confirmation Email to Client and Expert with Google Meet link
      try {
        const updatedBooking = { ...existing, ...updateDoc, googleMeetLink: finalMeetLink || undefined }

        // To Client
        const clientEmailData = renderBookingConfirmationEmail({
          booking: updatedBooking,
          expertName,
          clientName: existing.clientName,
          serviceTitle,
          rescheduleUrl,
          recipientRole: 'client',
          meetLink: finalMeetLink || undefined,
        })
        await sendTransactionalEmail({
          bookingId: existing._id,
          emailType: 'booking_confirmed',
          recipientEmail: existing.clientEmail,
          recipientName: existing.clientName,
          recipientRole: 'client',
          subject: clientEmailData.subject,
          html: clientEmailData.html,
          text: clientEmailData.text,
        })

        // To Expert
        if (expertEmail) {
          const expertEmailData = renderBookingConfirmationEmail({
            booking: updatedBooking,
            expertName,
            clientName: existing.clientName,
            serviceTitle,
            rescheduleUrl,
            recipientRole: 'expert',
            meetLink: finalMeetLink || undefined,
          })
          await sendTransactionalEmail({
            bookingId: existing._id,
            emailType: 'booking_confirmed',
            recipientEmail: expertEmail,
            recipientName: expertName,
            recipientRole: 'expert',
            subject: expertEmailData.subject,
            html: expertEmailData.html,
            text: expertEmailData.text,
          })
        }

        // If the session is on the same day and scheduled time has not passed, send Reminder 1 immediately
        const timezone = existing.timezone || 'Africa/Cairo'
        const todayInTz = getCurrentDateInTimezone(timezone)
        const sessionStart = updatedBooking.sessionStartAt || computeSessionBounds(existing.date, existing.time, existing.durationMinutes || 45, timezone).sessionStartAt
        if (existing.date === todayInTz && now < sessionStart && finalMeetLink && !existing.reminders?.dayOfReminderSentAt) {
          await bookingsCol.updateOne(
            { _id: bookingObjId },
            { $set: { 'reminders.dayOfReminderSentAt': now } }
          )

          const clientRem1 = renderDayOfReminderEmail({
            booking: updatedBooking,
            expertName,
            clientName: existing.clientName,
            serviceTitle,
            meetLink: finalMeetLink,
            rescheduleUrl,
            recipientRole: 'client',
          })
          await sendTransactionalEmail({
            bookingId: existing._id,
            emailType: 'reminder_day_of',
            recipientEmail: existing.clientEmail,
            recipientName: existing.clientName,
            recipientRole: 'client',
            subject: clientRem1.subject,
            html: clientRem1.html,
            text: clientRem1.text,
          })

          if (expertEmail) {
            const expertRem1 = renderDayOfReminderEmail({
              booking: updatedBooking,
              expertName,
              clientName: existing.clientName,
              serviceTitle,
              meetLink: finalMeetLink,
              rescheduleUrl,
              recipientRole: 'expert',
            })
            await sendTransactionalEmail({
              bookingId: existing._id,
              emailType: 'reminder_day_of',
              recipientEmail: expertEmail,
              recipientName: expertName,
              recipientRole: 'expert',
              subject: expertRem1.subject,
              html: expertRem1.html,
              text: expertRem1.text,
            })
          }
        }
      } catch (emailErr) {
        console.error('[Email Notification] Failed to send confirmation email:', emailErr)
      }
    } else if (action === 'update_meet_link') {
      const trimmedLink = (googleMeetLink || '').trim()
      if (!trimmedLink) {
        return NextResponse.json(
          { success: false, error: 'A valid Google Meet link is required' },
          { status: 400 }
        )
      }

      updateDoc.googleMeetLink = trimmedLink
      updateDoc.googleMeetUpdatedAt = now

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      // If booking is already confirmed, notify both parties of the updated link
      if (existing.status === 'confirmed') {
        try {
          const updatedBooking = { ...existing, ...updateDoc }

          // To Client
          const clientEmailData = renderMeetLinkUpdatedEmail({
            booking: updatedBooking,
            expertName,
            clientName: existing.clientName,
            serviceTitle,
            meetLink: trimmedLink,
            rescheduleUrl,
            recipientRole: 'client',
          })
          await sendTransactionalEmail({
            bookingId: existing._id,
            emailType: 'meet_link_updated',
            recipientEmail: existing.clientEmail,
            recipientName: existing.clientName,
            recipientRole: 'client',
            subject: clientEmailData.subject,
            html: clientEmailData.html,
            text: clientEmailData.text,
          })

          // To Expert
          if (expertEmail) {
            const expertEmailData = renderMeetLinkUpdatedEmail({
              booking: updatedBooking,
              expertName,
              clientName: existing.clientName,
              serviceTitle,
              meetLink: trimmedLink,
              rescheduleUrl,
              recipientRole: 'expert',
            })
            await sendTransactionalEmail({
              bookingId: existing._id,
              emailType: 'meet_link_updated',
              recipientEmail: expertEmail,
              recipientName: expertName,
              recipientRole: 'expert',
              subject: expertEmailData.subject,
              html: expertEmailData.html,
              text: expertEmailData.text,
            })
          }
        } catch (emailErr) {
          console.error('[Email Notification] Failed to send meet link update email:', emailErr)
        }
      }
    } else if (action === 'reject') {
      updateDoc.status = 'rejected'
      updateDoc.paymentStatus = 'rejected'
      updateDoc.adminNotes = adminNotes || 'Payment receipt not accepted'

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      if (existing.googleCalendarEventId) {
        await deleteCalendarEvent(existing.googleCalendarEventId)
      }
    } else if (action === 'cancel') {
      updateDoc.status = 'cancelled'
      updateDoc.attendanceStatus = 'cancelled'
      if (adminNotes) updateDoc.adminNotes = adminNotes

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      if (existing.googleCalendarEventId) {
        await deleteCalendarEvent(existing.googleCalendarEventId)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${action}d successfully`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update booking' },
      { status: 500 }
    )
  }
}
