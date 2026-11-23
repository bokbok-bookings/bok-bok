import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import {
  getBookingsCollection,
  getComplaintsCollection,
  toObjectId,
  type ComplaintCategory,
} from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { resolveTokenRole } from '@/lib/booking/access'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES: ComplaintCategory[] = [
  'no_show',
  'technical_issue',
  'session_shortened',
  'service_quality',
  'billing_payment',
  'other',
]

export async function POST(request: Request) {
  try {
    const session = await getSession()

    const body = await request.json()
    const { bookingId, token, category, subject, description } = body

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 })
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Valid complaint category is required' },
        { status: 400 }
      )
    }

    const sanitizedSubject = typeof subject === 'string' ? subject.trim().slice(0, 150) : ''
    const sanitizedDescription = typeof description === 'string' ? description.trim().slice(0, 3000) : ''

    if (sanitizedSubject.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Subject must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (sanitizedDescription.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Description must be at least 10 characters' },
        { status: 400 }
      )
    }

    const bookingObjId = toObjectId(bookingId)
    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const isClientTokenValid = resolveTokenRole(booking, token) === 'client'
    const userMatchesId = Boolean(
      session?.userId && booking.clientId && booking.clientId.toString() === session.userId
    )
    const userMatchesEmail = Boolean(
      session?.email &&
        booking.clientEmail &&
        booking.clientEmail.toLowerCase() === session.email.toLowerCase()
    )

    if (!session?.userId && !isClientTokenValid) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 })
    }

    if (!userMatchesId && !userMatchesEmail && !isClientTokenValid) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to submit a complaint for this booking' },
        { status: 403 }
      )
    }

    if (booking.clientAttendanceReport?.response === 'attended') {
      return NextResponse.json(
        {
          success: false,
          error:
            'You have already confirmed that this session was completed with no problems. Dispute window is closed.',
        },
        { status: 400 }
      )
    }

    const complaintsCol = await getComplaintsCollection()
    const existingComplaint = await complaintsCol.findOne({ bookingId: bookingObjId })
    if (existingComplaint) {
      return NextResponse.json(
        { success: false, error: 'A complaint has already been submitted for this booking' },
        { status: 400 }
      )
    }

    const now = new Date()
    const complaintDoc = {
      bookingId: bookingObjId,
      clientId: session?.userId ? new ObjectId(session.userId) : booking.clientId || new ObjectId(),
      clientName: session?.displayName || booking.clientName || 'Client',
      clientEmail: (session?.email || booking.clientEmail).toLowerCase(),
      expertId: booking.expertId,
      serviceId: booking.serviceId,
      category,
      subject: sanitizedSubject,
      description: sanitizedDescription,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    }

    const insertResult = await complaintsCol.insertOne(complaintDoc as any)

    // Update booking attendance status to 'disputed' if session was no-show or prematurely ended
    const bookingUpdates: any = {
      hasComplaint: true,
      complaintId: insertResult.insertedId,
      updatedAt: now,
    }

    if (['no_show', 'session_shortened', 'technical_issue'].includes(category)) {
      bookingUpdates.attendanceStatus = 'disputed'
    }

    await bookingsCol.updateOne({ _id: bookingObjId }, { $set: bookingUpdates })

    return NextResponse.json({
      success: true,
      complaintId: insertResult.insertedId.toString(),
      message: 'Your report has been submitted to support and our admin team will review it promptly.',
    })
  } catch (error: any) {
    console.error('Failed to submit complaint:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

