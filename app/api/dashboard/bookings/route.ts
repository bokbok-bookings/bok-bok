import { confirmBookingAndCreateCalendar, deleteCalendarEvent } from '@/lib/google-calendar'
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
    const { id, action, adminNotes } = body

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'Booking ID and action (approve | reject | cancel) are required' },
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

      // Auto-create Google Calendar event with Google Meet link (invites Client, Expert, and bokbok.bookings@gmail.com)
      try {
        await confirmBookingAndCreateCalendar(bookingObjId.toString())
      } catch (calErr: any) {
        console.error('[Google Calendar] Failed to create event on approve:', calErr?.message)
      }
    } else if (action === 'reject') {
      updateDoc.status = 'rejected'
      updateDoc.paymentStatus = 'rejected'
      updateDoc.adminNotes = adminNotes || 'Payment receipt not accepted'

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      if ((existing as any).googleCalendarEventId) {
        try {
          await deleteCalendarEvent((existing as any).googleCalendarEventId)
        } catch (calErr: any) {
          console.error('[Google Calendar] Failed to delete event on reject:', calErr?.message)
        }
      }
    } else if (action === 'cancel') {
      updateDoc.status = 'cancelled'
      if (adminNotes) updateDoc.adminNotes = adminNotes

      await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateDoc })

      if ((existing as any).googleCalendarEventId) {
        try {
          await deleteCalendarEvent((existing as any).googleCalendarEventId)
        } catch (calErr: any) {
          console.error('[Google Calendar] Failed to delete event on cancel:', calErr?.message)
        }
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
