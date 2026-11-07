import { NextResponse } from 'next/server'
import {
  getBookingsCollection,
  getAttendanceLogsCollection,
  getExpertsCollection,
  toObjectId,
  type AttendanceStatus,
} from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { submitAttendanceReport, applyJoinTrackingAttendance } from '@/lib/booking/attendance'
import { syncBookingMeetTelemetry } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

async function verifyAdminAuth() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return null
  }
  return session
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAuth()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingIdParam = searchParams.get('bookingId')

    const bookingsCol = await getBookingsCollection()
    const attendanceLogsCol = await getAttendanceLogsCollection()
    const expertsCol = await getExpertsCollection()

    // Single booking audit inspection
    if (bookingIdParam) {
      const bObjId = toObjectId(bookingIdParam)
      const booking = await bookingsCol.findOne({ _id: bObjId })

      if (!booking) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
      }

      const expertDoc = await expertsCol.findOne({ _id: booking.expertId })
      const forceSync = searchParams.get('syncMeet') === '1'

      if (booking.googleMeetLink && booking.deliveryMode !== 'IN_PERSON') {
        try {
          await syncBookingMeetTelemetry(booking, {
            force: forceSync,
            expertName: expertDoc?.name,
          })
          await applyJoinTrackingAttendance(booking, new Date())
        } catch {
          // ignore
        }
      }

      const auditLogs = await attendanceLogsCol
        .find({ bookingId: bObjId })
        .sort({ submittedAt: -1 })
        .toArray()

      return NextResponse.json({
        success: true,
        data: {
          booking: {
            ...booking,
            _id: booking._id?.toString(),
            expertId: booking.expertId.toString(),
            expertName: expertDoc?.name || 'Expert',
          },
          auditLogs: auditLogs.map((l) => ({
            ...l,
            _id: l._id?.toString(),
            bookingId: l.bookingId.toString(),
            userId: l.userId?.toString(),
          })),
        },
      })
    }

    // Filtered list & counters query
    const statusFilter = searchParams.get('status') // attendanceStatus
    const expertIdFilter = searchParams.get('expertId')
    const clientSearch = searchParams.get('clientSearch')?.trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = Number(searchParams.get('limit')) || 50

    const query: any = { status: 'confirmed' }

    if (statusFilter && statusFilter !== 'all') {
      query.attendanceStatus = statusFilter
    }

    if (expertIdFilter && expertIdFilter !== 'all') {
      query.expertId = toObjectId(expertIdFilter)
    }

    if (clientSearch) {
      query.$or = [
        { clientName: { $regex: clientSearch, $options: 'i' } },
        { clientEmail: { $regex: clientSearch, $options: 'i' } },
        { reference: { $regex: clientSearch, $options: 'i' } },
      ]
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate }
    } else if (startDate) {
      query.date = { $gte: startDate }
    } else if (endDate) {
      query.date = { $lte: endDate }
    }

    // Compute stats across all confirmed bookings
    const [
      totalSessions,
      completed,
      clientAbsent,
      expertAbsent,
      bothAbsent,
      disputed,
      pending,
      bookings,
    ] = await Promise.all([
      bookingsCol.countDocuments({ status: 'confirmed' }),
      bookingsCol.countDocuments({ status: 'confirmed', attendanceStatus: 'completed' }),
      bookingsCol.countDocuments({ status: 'confirmed', attendanceStatus: 'client_absent' }),
      bookingsCol.countDocuments({ status: 'confirmed', attendanceStatus: 'expert_absent' }),
      bookingsCol.countDocuments({ status: 'confirmed', attendanceStatus: 'both_absent' }),
      bookingsCol.countDocuments({ status: 'confirmed', attendanceStatus: 'disputed' }),
      bookingsCol.countDocuments({
        status: 'confirmed',
        $or: [{ attendanceStatus: 'pending' }, { attendanceStatus: { $exists: false } }],
      }),
      bookingsCol
        .find(query)
        .sort({ sessionStartAt: -1, date: -1, time: -1 })
        .limit(limit)
        .toArray(),
    ])

    // Load expert names map
    const expertIds = [...new Set(bookings.map((b) => b.expertId.toString()))]
    const expertDocs = await expertsCol
      .find({ _id: { $in: expertIds.map((id) => toObjectId(id)) } })
      .toArray()
    const expertMap = new Map(expertDocs.map((e) => [e._id.toString(), e.name]))

    // Auto-resolve attendance from Meet join tracking for sessions that have ended
    const now = new Date()
    for (const b of bookings) {
      if (b.attendanceStatus === 'pending' || !b.attendanceStatus) {
        try {
          await applyJoinTrackingAttendance(b, now)
        } catch {
          // ignore
        }
      }
    }

    const formattedBookings = bookings.map((b) => ({
      _id: b._id?.toString(),
      reference: b.reference,
      expertId: b.expertId.toString(),
      expertName: expertMap.get(b.expertId.toString()) || 'Expert',
      clientName: b.clientName,
      clientEmail: b.clientEmail,
      serviceTitle: b.serviceTitle,
      date: b.date,
      time: b.time,
      durationMinutes: b.durationMinutes,
      deliveryMode: b.deliveryMode || 'ONLINE',
      googleMeetLink: b.googleMeetLink,
      status: b.status,
      attendanceStatus: b.attendanceStatus || 'pending',
      attendanceSource: b.attendanceSource,
      meetingJoins: b.meetingJoins,
      googleMeetTelemetry: b.googleMeetTelemetry,
      expertAttendanceReport: b.expertAttendanceReport,
      clientAttendanceReport: b.clientAttendanceReport,
      attendanceDisputeResolution: b.attendanceDisputeResolution,
      sessionStartAt: b.sessionStartAt,
      sessionEndAt: b.sessionEndAt,
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions,
        completed,
        clientAbsent,
        expertAbsent,
        bothAbsent,
        disputed,
        pending,
      },
      bookings: formattedBookings,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admin attendance data' },
      { status: 500 }
    )
  }
}

// PATCH: Manual Admin Dispute Resolution & Status Override
export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdminAuth()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId, finalStatus, notes } = body

    if (!bookingId || !finalStatus) {
      return NextResponse.json(
        { success: false, error: 'bookingId and finalStatus are required' },
        { status: 400 }
      )
    }

    const validStatuses: AttendanceStatus[] = [
      'completed',
      'client_absent',
      'expert_absent',
      'both_absent',
      'disputed',
      'cancelled',
      'pending',
    ]

    if (!validStatuses.includes(finalStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid final status: ${finalStatus}` },
        { status: 400 }
      )
    }

    const result = await submitAttendanceReport({
      bookingId,
      userRole: 'admin',
      userId: admin.userId,
      response: 'admin_override',
      adminOverrideStatus: finalStatus,
      notes: notes || 'Admin manual resolution',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resolve attendance dispute' },
      { status: 500 }
    )
  }
}

