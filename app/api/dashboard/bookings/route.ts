import {
  confirmBookingAndCreateCalendar,
  deleteCalendarEvent,
  getGoogleCalendarConnectionStatus,
  syncMissingMeetLinksForConfirmedBookings,
} from '@/lib/google-calendar'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getBookingsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

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

// PATCH: Approve / Decline / Cancel booking, or Generate / Sync Google Meet link(s)
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
    const { id, action, adminNotes, forceRecreate } = body

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
            'Booking ID and action (approve | reject | cancel | generate_meet) are required',
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

    // Generate / Retry Google Meet link for an already-confirmed booking
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
        return NextResponse.json({
          success: true,
          googleMeetCreated: Boolean(updated.googleMeetLink),
          googleMeetLink: updated.googleMeetLink || '',
          googleCalendarEventLink: updated.googleCalendarEventLink || '',
          message: updated.googleMeetLink
            ? 'Google Meet link created and calendar invitations sent.'
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
      updatedAt: new Date(),
    }

    if (action === 'approve') {
      updateDoc.status = 'confirmed'
      updateDoc.paymentStatus = 'verified'
      updateDoc.verifiedBy = new ObjectId(auth.session.userId)
      updateDoc.verifiedAt = new Date()
      if (adminNotes) updateDoc.adminNotes = adminNotes

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      // Auto-create Google Calendar event with Google Meet link (invites Client, Expert, and central BokBok email)
      try {
        const updatedBooking = await confirmBookingAndCreateCalendar(bookingObjId.toString())
        return NextResponse.json({
          success: true,
          googleMeetCreated: Boolean(updatedBooking.googleMeetLink),
          googleMeetLink: updatedBooking.googleMeetLink || '',
          googleCalendarEventLink: updatedBooking.googleCalendarEventLink || '',
          message: updatedBooking.googleMeetLink
            ? 'Booking confirmed and Google Meet link created & emailed to attendees.'
            : 'Booking confirmed.',
        })
      } catch (calErr: any) {
        console.error('[Google Calendar] Failed to create event on approve:', calErr?.message)
        return NextResponse.json({
          success: true,
          googleMeetCreated: false,
          calendarWarning:
            calErr?.message ||
            'Booking was marked confirmed, but Google Meet link generation failed.',
          message:
            'Booking marked confirmed, but Google Meet link could not be generated automatically.',
        })
      }
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
      if (adminNotes) updateDoc.adminNotes = adminNotes

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      if (existing.googleCalendarEventId) {
        try {
          await deleteCalendarEvent(existing.googleCalendarEventId)
        } catch (calErr: any) {
          console.error('[Google Calendar] Failed to delete event on cancel:', calErr?.message)
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported booking action: ${String(action)}` },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${action}d successfully`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update booking' },
      { status: 500 },
    )
  }
}
