import { NextResponse } from 'next/server'
import { getBookingsCollection, toObjectId, type RescheduleHistoryEntry } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { getExpertSlotsForDate } from '@/lib/availability-server'
import {
  computeSessionBounds,
  resolveExpertContact,
  getAppBaseUrl,
} from '@/lib/email/scheduler'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import { renderRescheduleConfirmedEmail } from '@/lib/email/templates'
import { updateCalendarEvent } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const unwrappedParams =
      typeof (context.params as any)?.then === 'function'
        ? await (context.params as Promise<{ id: string }>)
        : (context.params as { id: string })
    const { id } = unwrappedParams

    const { searchParams } = new URL(request.url)
    const queryToken = searchParams.get('token')

    const body = await request.json()
    const { newDate, newTime, reason, token: bodyToken } = body
    const token = queryToken || bodyToken

    if (!newDate || !newTime) {
      return NextResponse.json(
        { success: false, error: 'newDate (YYYY-MM-DD) and newTime (HH:mm) are required' },
        { status: 400 }
      )
    }

    const bookingObjId = toObjectId(id)
    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Determine caller role & authorization
    const session = await getSession()
    const isTokenValid = token && booking.rescheduleToken && token === booking.rescheduleToken
    const isAdmin = session?.role === 'admin'
    const isExpertOwner =
      session?.role === 'expert' &&
      session?.expertId &&
      session.expertId === booking.expertId.toString()
    const isClientSession =
      (session?.userId && booking.clientId && session.userId === booking.clientId.toString()) ||
      (session?.email && booking.clientEmail && session.email.toLowerCase() === booking.clientEmail.toLowerCase())

    let callerRole: 'client' | 'expert' | 'admin' | null = null

    if (isAdmin) {
      callerRole = 'admin'
    } else if (isExpertOwner) {
      callerRole = 'expert'
    } else if (isTokenValid || isClientSession) {
      callerRole = 'client'
    }

    if (!callerRole) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to reschedule this booking' },
        { status: 403 }
      )
    }

    // Calculate deadline and verify eligibility
    const { expertDoc, expertName, expertEmail } = await resolveExpertContact(booking.expertId)
    const deadlineHours = booking.rescheduleDeadlineHours || expertDoc?.rescheduleDeadlineHours || 24

    const timezone = booking.timezone || 'Africa/Cairo'
    let startAt = booking.sessionStartAt
    if (!startAt) {
      const bounds = computeSessionBounds(booking.date, booking.time, booking.durationMinutes || 45, timezone)
      startAt = bounds.sessionStartAt
    }

    const rescheduleDeadlineAt = new Date(startAt.getTime() - deadlineHours * 60 * 60 * 1000)
    const now = new Date()

    // Enforce expert's deadline policy for clients
    if (callerRole === 'client' && now >= rescheduleDeadlineAt) {
      return NextResponse.json(
        {
          success: false,
          error: `Rescheduling deadline has passed. The expert's policy requires changes at least ${deadlineHours} hours before the session.`,
          deadlinePassed: true,
          rescheduleDeadlineAt,
        },
        { status: 403 }
      )
    }

    // Verify slot availability with expert's schedule engine
    const availableSlots = await getExpertSlotsForDate(
      booking.expertId.toString(),
      newDate,
      booking.durationMinutes || 45
    )

    const slotMatch = availableSlots.find((s) => s.time === newTime)
    if (!slotMatch || !slotMatch.available) {
      return NextResponse.json(
        {
          success: false,
          error: 'The requested time slot is not available. Please choose another slot.',
        },
        { status: 409 }
      )
    }

    // Compute new session bounds
    const newBounds = computeSessionBounds(
      newDate,
      newTime,
      booking.durationMinutes || 45,
      timezone
    )

    const historyEntry: RescheduleHistoryEntry = {
      previousDate: booking.date,
      previousTime: booking.time,
      newDate,
      newTime,
      changedByRole: callerRole,
      reason: reason?.trim() || undefined,
      changedAt: now,
    }

    // Update booking in MongoDB and reset reminder state so new reminders fire
    await bookingsCol.updateOne(
      { _id: bookingObjId },
      {
        $set: {
          date: newDate,
          time: newTime,
          sessionStartAt: newBounds.sessionStartAt,
          sessionEndAt: newBounds.sessionEndAt,
          updatedAt: now,
          'reminders.dayOfReminderSentAt': undefined,
          'reminders.beforeSessionReminderSentAt': undefined,
          'reminders.attendancePromptSentAt': undefined,
          'reminders.missingMeetLinkAlertSentAt': undefined,
        },
        $inc: { rescheduleCount: 1 },
        $push: { rescheduleHistory: historyEntry } as any,
      }
    )

    // Keep Google Meet / Calendar event time synced if an event was created
    if (booking.googleCalendarEventId) {
      await updateCalendarEvent(booking.googleCalendarEventId, {
        date: newDate,
        time: newTime,
        durationMinutes: booking.durationMinutes || 45,
      })
    }

    // Send Reschedule Confirmation Email to both Client and Expert
    const baseUrl = getAppBaseUrl()
    const rescheduleUrl = booking.rescheduleToken
      ? `${baseUrl}/bookings/${booking._id}?token=${booking.rescheduleToken}`
      : undefined
    const serviceTitle =
      booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'
    const updatedBooking = {
      ...booking,
      date: newDate,
      time: newTime,
      sessionStartAt: newBounds.sessionStartAt,
      sessionEndAt: newBounds.sessionEndAt,
    }

    try {
      // To Client
      const clientEmailData = renderRescheduleConfirmedEmail({
        booking: updatedBooking,
        expertName,
        clientName: booking.clientName,
        serviceTitle,
        previousDate: booking.date,
        previousTime: booking.time,
        changedByRole: callerRole,
        meetLink: booking.googleMeetLink,
        rescheduleUrl,
      })
      await sendTransactionalEmail({
        bookingId: booking._id,
        emailType: 'reschedule_confirmed',
        recipientEmail: booking.clientEmail,
        recipientName: booking.clientName,
        recipientRole: 'client',
        subject: clientEmailData.subject,
        html: clientEmailData.html,
        text: clientEmailData.text,
      })

      // To Expert
      if (expertEmail) {
        const expertEmailData = renderRescheduleConfirmedEmail({
          booking: updatedBooking,
          expertName,
          clientName: booking.clientName,
          serviceTitle,
          previousDate: booking.date,
          previousTime: booking.time,
          changedByRole: callerRole,
          meetLink: booking.googleMeetLink,
          rescheduleUrl,
        })
        await sendTransactionalEmail({
          bookingId: booking._id,
          emailType: 'reschedule_confirmed',
          recipientEmail: expertEmail,
          recipientName: expertName,
          recipientRole: 'expert',
          subject: expertEmailData.subject,
          html: expertEmailData.html,
          text: expertEmailData.text,
        })
      }
    } catch (emailErr) {
      console.error('[Reschedule] Failed to send notification email:', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: `Booking successfully rescheduled to ${newDate} at ${newTime}`,
      newDate,
      newTime,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reschedule booking' },
      { status: 500 }
    )
  }
}

