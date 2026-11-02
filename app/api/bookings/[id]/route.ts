import { NextResponse } from 'next/server'
import { getBookingsCollection, getServicesCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { resolveExpertContact, computeSessionBounds } from '@/lib/email/scheduler'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const unwrappedParams =
      typeof (context.params as any)?.then === 'function'
        ? await (context.params as Promise<{ id: string }>)
        : (context.params as { id: string })
    const { id } = unwrappedParams

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    const bookingObjId = toObjectId(id)
    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Authorization check: either valid token, or logged-in client/expert/admin
    const session = await getSession()
    const isTokenAuthorized = token && booking.rescheduleToken && token === booking.rescheduleToken
    const isAdmin = session?.role === 'admin'
    const isExpertOwner =
      session?.role === 'expert' &&
      session?.expertId &&
      session.expertId === booking.expertId.toString()
    const isClientOwner =
      session?.userId && booking.clientId && session.userId === booking.clientId.toString()

    if (!isTokenAuthorized && !isAdmin && !isExpertOwner && !isClientOwner) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view this booking' },
        { status: 403 }
      )
    }

    // Resolve expert details
    const { expertDoc, expertName, expertEmail } = await resolveExpertContact(booking.expertId)

    // Calculate deadline
    const deadlineHours = booking.rescheduleDeadlineHours || expertDoc?.rescheduleDeadlineHours || 24
    let startAt = booking.sessionStartAt
    let endAt = booking.sessionEndAt

    if (!startAt || !endAt) {
      const bounds = computeSessionBounds(
        booking.date,
        booking.time,
        booking.durationMinutes || 45,
        booking.timezone || 'Africa/Cairo'
      )
      startAt = bounds.sessionStartAt
      endAt = bounds.sessionEndAt
    }

    const rescheduleDeadlineAt = new Date(startAt.getTime() - deadlineHours * 60 * 60 * 1000)
    const now = new Date()
    const isRescheduleAllowed = now < rescheduleDeadlineAt

    // Check attendance reporting window
    const reportingDeadlineAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000)
    const isAttendanceReportingOpen = now >= endAt && now <= reportingDeadlineAt

    return NextResponse.json({
      success: true,
      data: {
        _id: booking._id?.toString(),
        reference: booking.reference,
        serviceTitle: booking.serviceTitle,
        expertId: booking.expertId.toString(),
        expertName,
        expertRole: expertDoc?.role,
        expertImage: expertDoc?.image || expertDoc?.avatarUrl,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        clientPhone: booking.clientPhone,
        date: booking.date,
        time: booking.time,
        durationMinutes: booking.durationMinutes,
        amount: booking.amount,
        currency: booking.currency || 'EGP',
        status: booking.status,
        deliveryMode: booking.deliveryMode || 'ONLINE',
        googleMeetLink: booking.googleMeetLink,
        googleMeetUpdatedAt: booking.googleMeetUpdatedAt,
        timezone: booking.timezone || 'Africa/Cairo',
        sessionStartAt: startAt,
        sessionEndAt: endAt,
        rescheduleDeadlineHours: deadlineHours,
        rescheduleDeadlineAt,
        isRescheduleAllowed,
        attendanceStatus: booking.attendanceStatus || 'pending',
        isAttendanceReportingOpen,
        expertAttendanceReport: booking.expertAttendanceReport,
        clientAttendanceReport: booking.clientAttendanceReport,
        rescheduleHistory: booking.rescheduleHistory || [],
        userRoleInView: isAdmin ? 'admin' : isExpertOwner ? 'expert' : 'client',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch booking details' },
      { status: 500 }
    )
  }
}

