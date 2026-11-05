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
  getGoogleCalendarConnectionStatus,
  syncMissingMeetLinksForConfirmedBookings,
} from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

function isValidHttpsUrl(raw?: string): boolean {
  if (!raw) return false
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
      return {
        error: 'No expert profile associated with this account',
        status: 403,
        expertId: null,
        session: null,
      }
    }
    return { error: null, status: 200, expertId: toObjectId(session.expertId), session }
  }

  return { error: 'Access denied', status: 403, expertId: null, session: null }
}

// GET: List bookings with optional status filter (and optional Google Calendar connection status for admins)
export async function GET(request: Request) {
  try {
    const auth = await resolveAuth(request)
    if (auth.error || !auth.session) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status },
      )
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const includeCalendarStatus = searchParams.get('includeCalendarStatus') === 'true'
    const refreshCalendarStatus = searchParams.get('refreshCalendarStatus') === 'true'
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)

    const bookingsCol = await getBookingsCollection()
    const filter: any = {}

    if (auth.expertId) {
      filter.expertId = auth.expertId
    }

    if (statusParam === 'awaiting_verification' || statusParam === 'pending') {
      filter.status = { $in: ['awaiting_verification', 'pending', 'awaiting_payment'] }
    } else if (statusParam && statusParam !== 'all') {
      filter.status = statusParam
    }

    const docs = await bookingsCol.find(filter).sort({ createdAt: -1 }).limit(limit).toArray()

    const formatted = docs.map((b) => ({
      ...b,
      _id: b._id.toString(),
      expertId: b.expertId.toString(),
      serviceId: b.serviceId?.toString(),
      googleMeetLink: b.googleMeetLink || '',
      googleCalendarEventLink: b.googleCalendarEventLink || '',
      googleCalendarEventId: b.googleCalendarEventId || '',
      googleMeetError: b.googleMeetError || '',
    }))

    let calendarStatus = undefined
    if (includeCalendarStatus && auth.session.role === 'admin') {
      calendarStatus = await getGoogleCalendarConnectionStatus(refreshCalendarStatus)
    }

    return NextResponse.json(
      {
        success: true,
        data: formatted,
        ...(calendarStatus ? { calendarStatus } : {}),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bookings' },
      { status: 500 },
    )
  }
}

// PATCH: Approve / Decline / Cancel booking, or Generate / Update / Sync Google Meet link(s)
export async function PATCH(request: Request) {
  try {
    const auth = await resolveAuth(request)
    if (auth.error || !auth.session) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status },
      )
    }

    const body = await request.json()
    const { id, action, adminNotes, googleMeetLink, forceRecreate } = body

    // Bulk action for admins: generate missing Google Meet links for all confirmed upcoming/today bookings
    if (action === 'sync_all_missing_meet') {
      if (auth.session.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Only administrators can run bulk Google Meet sync.' },
          { status: 403 },
        )
      }
      const syncResult = await syncMissingMeetLinksForConfirmedBookings()
      if (syncResult.syncedCount === 0 && syncResult.failedCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              syncResult.errors[0] ||
              'Failed to generate Google Meet links. Please check Google Calendar connection.',
            syncResult,
          },
          { status: 502 },
        )
      }
      return NextResponse.json({
        success: true,
        message:
          syncResult.syncedCount > 0
            ? `Generated Google Meet links for ${syncResult.syncedCount} confirmed booking(s): ${syncResult.syncedReferences.join(', ')}`
            : 'All upcoming confirmed bookings already have Google Meet links.',
        syncResult,
      })
    }

    if (!id || !action) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Booking ID and action (approve | reject | cancel | generate_meet | update_meet_link) are required',
        },
        { status: 400 },
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
        { status: 404 },
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

    // Generate / Retry Google Meet link via Google Calendar OAuth for an already-confirmed booking
    if (action === 'generate_meet') {
      if (existing.status !== 'confirmed') {
        return NextResponse.json(
          {
            success: false,
            error: 'Booking must be confirmed before generating a Google Meet link.',
          },
          { status: 400 },
        )
      }

      try {
        const updated = await confirmBookingAndCreateCalendar(bookingObjId.toString(), {
          forceRecreate: Boolean(forceRecreate),
        })

        if (updated.googleMeetLink) {
          try {
            const clientEmailData = renderMeetLinkUpdatedEmail({
              booking: updated,
              expertName,
              clientName: existing.clientName,
              serviceTitle,
              meetLink: updated.googleMeetLink,
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

            if (expertEmail) {
              const expertEmailData = renderMeetLinkUpdatedEmail({
                booking: updated,
                expertName,
                clientName: existing.clientName,
                serviceTitle,
                meetLink: updated.googleMeetLink,
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
            console.error('[Email Notification] Failed to send generated meet link email:', emailErr)
          }
        }

        return NextResponse.json({
          success: true,
          googleMeetCreated: Boolean(updated.googleMeetLink),
          googleMeetLink: updated.googleMeetLink || '',
          googleCalendarEventLink: updated.googleCalendarEventLink || '',
          message: updated.googleMeetLink
            ? 'Google Meet link created and invitations sent to attendees.'
            : 'Calendar event created (in-person session without video link).',
        })
      } catch (calErr: any) {
        return NextResponse.json(
          {
            success: false,
            googleMeetCreated: false,
            error: calErr?.message || 'Failed to generate Google Meet link.',
          },
          { status: 502 },
        )
      }
    }

    const updateDoc: any = {
      updatedAt: now,
    }

    if (action === 'approve') {
      const manualLink = (googleMeetLink || '').trim()
      if (manualLink && !isValidHttpsUrl(manualLink)) {
        return NextResponse.json(
          { success: false, error: 'Manual Google Meet link must be a valid https:// URL.' },
          { status: 400 },
        )
      }

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
          existing.timezone || 'Africa/Cairo',
        )
        updateDoc.sessionStartAt = bounds.sessionStartAt
        updateDoc.sessionEndAt = bounds.sessionEndAt
      }

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      // Automatically generate a real Google Meet link via BokBok Google OAuth integration
      let finalMeetLink = (manualLink || existing.googleMeetLink?.trim() || '').trim()
      let calendarEventLink = existing.googleCalendarEventLink || ''
      let calendarWarning: string | undefined = undefined

      if (!finalMeetLink && existing.deliveryMode !== 'IN_PERSON') {
        try {
          const calBooking = await confirmBookingAndCreateCalendar(bookingObjId.toString())
          if (calBooking?.googleMeetLink) {
            finalMeetLink = calBooking.googleMeetLink
            updateDoc.googleMeetLink = calBooking.googleMeetLink
          }
          if (calBooking?.googleCalendarEventId) {
            updateDoc.googleCalendarEventId = calBooking.googleCalendarEventId
          }
          if (calBooking?.googleCalendarEventLink) {
            calendarEventLink = calBooking.googleCalendarEventLink
            updateDoc.googleCalendarEventLink = calBooking.googleCalendarEventLink
          }
        } catch (calErr: any) {
          console.error('[Google Calendar] Failed to create event on approve:', calErr?.message)
          calendarWarning =
            calErr?.message ||
            'Booking was marked confirmed, but Google Meet link generation failed.'
        }
      } else if (finalMeetLink && finalMeetLink !== existing.googleMeetLink) {
        await bookingsCol.updateOne(
          { _id: bookingObjId },
          {
            $set: { googleMeetLink: finalMeetLink, googleMeetUpdatedAt: now },
            $unset: { googleMeetError: '' },
          },
        )
      }

      // Send Confirmation Email to Client and Expert with Google Meet link
      try {
        const updatedBooking = {
          ...existing,
          ...updateDoc,
          googleMeetLink: finalMeetLink || undefined,
        }

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
        const sessionStart =
          updatedBooking.sessionStartAt ||
          computeSessionBounds(
            existing.date,
            existing.time,
            existing.durationMinutes || 45,
            timezone,
          ).sessionStartAt

        if (
          existing.date === todayInTz &&
          now < sessionStart &&
          finalMeetLink &&
          !existing.reminders?.dayOfReminderSentAt
        ) {
          await bookingsCol.updateOne(
            { _id: bookingObjId },
            { $set: { 'reminders.dayOfReminderSentAt': now } },
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

      return NextResponse.json({
        success: true,
        googleMeetCreated: Boolean(finalMeetLink),
        googleMeetLink: finalMeetLink || '',
        googleCalendarEventLink: calendarEventLink,
        ...(calendarWarning ? { calendarWarning } : {}),
        message: calendarWarning
          ? 'Booking marked confirmed, but Google Meet link could not be generated automatically.'
          : finalMeetLink
            ? 'Booking confirmed and Google Meet link created & emailed to attendees.'
            : 'Booking confirmed.',
      })
    } else if (action === 'update_meet_link') {
      const trimmedLink = (googleMeetLink || '').trim()
      if (!trimmedLink || !isValidHttpsUrl(trimmedLink)) {
        return NextResponse.json(
          { success: false, error: 'A valid https:// Google Meet link is required' },
          { status: 400 },
        )
      }

      updateDoc.googleMeetLink = trimmedLink
      updateDoc.googleMeetUpdatedAt = now

      await bookingsCol.updateOne(
        { _id: bookingObjId },
        {
          $set: updateDoc,
          $unset: { googleMeetError: '' },
        },
      )

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

      return NextResponse.json({
        success: true,
        googleMeetCreated: true,
        googleMeetLink: trimmedLink,
        message: 'Google Meet link saved and emailed to attendees.',
      })
    } else if (action === 'reject') {
      updateDoc.status = 'rejected'
      updateDoc.paymentStatus = 'rejected'
      updateDoc.adminNotes = adminNotes || 'Payment receipt not accepted'

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      if (existing.googleCalendarEventId) {
        try {
          await deleteCalendarEvent(existing.googleCalendarEventId)
        } catch (calErr: any) {
          console.error('[Google Calendar] Failed to delete event on reject:', calErr?.message)
        }
      }
    } else if (action === 'cancel') {
      updateDoc.status = 'cancelled'
      updateDoc.attendanceStatus = 'cancelled'
      if (adminNotes) updateDoc.adminNotes = adminNotes

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      if (existing.googleCalendarEventId) {
        try {
          await deleteCalendarEvent(existing.googleCalendarEventId)
        } catch (calErr: any) {
          console.error('[Google Calendar] Failed to delete event on cancel:', calErr?.message)
        }
      }
    } else if (action === 'edit') {
      const { updates } = body
      if (updates && typeof updates === 'object') {
        if (updates.clientName) updateDoc.clientName = String(updates.clientName).trim()
        if (updates.clientEmail) updateDoc.clientEmail = String(updates.clientEmail).trim().toLowerCase()
        if (updates.clientPhone !== undefined) updateDoc.clientPhone = String(updates.clientPhone).trim()
        if (updates.date) updateDoc.date = updates.date
        if (updates.time) updateDoc.time = updates.time
        if (updates.durationMinutes !== undefined) updateDoc.durationMinutes = Number(updates.durationMinutes) || 30
        if (updates.amount !== undefined) updateDoc.amount = Number(updates.amount) || 0
        if (updates.currency) updateDoc.currency = updates.currency
        if (updates.status) {
          updateDoc.status = updates.status
          if (updates.status === 'confirmed' && !existing.sessionStartAt) {
            updateDoc.attendanceStatus = 'pending'
          }
        }
        if (updates.paymentStatus) updateDoc.paymentStatus = updates.paymentStatus
        if (updates.googleMeetLink !== undefined) updateDoc.googleMeetLink = updates.googleMeetLink
        if (updates.adminNotes !== undefined) updateDoc.adminNotes = updates.adminNotes
      }
      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported booking action: ${String(action)}` },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${action === 'cancel' ? 'cancelled' : `${action}d`} successfully`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update booking' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await resolveAuth(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    if (auth.session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only administrators can delete bookings.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id') || searchParams.get('bookingId')
    if (!id) {
      try {
        const body = await request.json()
        id = body.id || body.bookingId
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 })
    }

    const bookingObjId = toObjectId(id)
    const bookingsCol = await getBookingsCollection()

    const existing = await bookingsCol.findOne({ _id: bookingObjId })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    if (existing.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(existing.googleCalendarEventId)
      } catch (calErr: any) {
        console.error('[Google Calendar] Failed to delete event on booking delete:', calErr?.message)
      }
    }

    await bookingsCol.deleteOne({ _id: bookingObjId })

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete booking' },
      { status: 500 }
    )
  }
}
