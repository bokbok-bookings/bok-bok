import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getBookingsCollection, getExpertsCollection, getServicesCollection, getReviewsCollection, getComplaintsCollection } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { computeSessionBounds } from '@/lib/email/scheduler'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 })
    }

    const userObjId = new ObjectId(session.userId)
    const userEmail = (session.email || '').toLowerCase().trim()

    const bookingsCol = await getBookingsCollection()
    const expertsCol = await getExpertsCollection()
    const servicesCol = await getServicesCollection()
    const reviewsCol = await getReviewsCollection()
    const complaintsCol = await getComplaintsCollection()

    // Find all bookings where client is the user or matched by email
    const filterQuery: any = {
      $or: [
        { clientId: userObjId },
        ...(userEmail ? [{ clientEmail: userEmail }] : []),
      ],
    }

    const rawBookings = await bookingsCol
      .find(filterQuery)
      .sort({ createdAt: -1 })
      .toArray()

    const expertIds = Array.from(new Set(rawBookings.map((b) => b.expertId?.toString()).filter(Boolean))) as string[]
    const serviceIds = Array.from(new Set(rawBookings.map((b) => b.serviceId?.toString()).filter(Boolean))) as string[]

    const [expertDocs, serviceDocs] = await Promise.all([
      expertsCol.find({ _id: { $in: expertIds.map((id) => new ObjectId(id)) } }).toArray(),
      servicesCol.find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } }).toArray(),
    ])

    const expertMap = new Map(expertDocs.map((e) => [e._id.toString(), e]))
    const serviceMap = new Map(serviceDocs.map((s) => [s._id.toString(), s]))

    // Check reviews and complaints for these bookings
    const bookingIds = rawBookings.map((b) => b._id as ObjectId)
    const [existingReviews, existingComplaints] = await Promise.all([
      reviewsCol.find({ bookingId: { $in: bookingIds } }).toArray(),
      complaintsCol.find({ bookingId: { $in: bookingIds } }).toArray(),
    ])

    const reviewMap = new Map(existingReviews.map((r) => [r.bookingId.toString(), r]))
    const complaintMap = new Map(existingComplaints.map((c) => [c.bookingId.toString(), c]))

    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    let totalBookings = rawBookings.length
    let upcomingCount = 0
    let completedCount = 0
    let pendingVerificationCount = 0
    let issuesCount = 0

    const enrichedBookings = rawBookings.map((booking) => {
      const exp = booking.expertId ? expertMap.get(booking.expertId.toString()) : null
      const srv = booking.serviceId ? serviceMap.get(booking.serviceId.toString()) : null
      const existingReview = reviewMap.get(booking._id!.toString())
      const existingComplaint = complaintMap.get(booking._id!.toString())

      const timezone = booking.timezone || 'Africa/Cairo'
      let sessionStart = booking.sessionStartAt
      let sessionEnd = booking.sessionEndAt

      if (!sessionStart || !sessionEnd) {
        try {
          const bounds = computeSessionBounds(
            booking.date,
            booking.time,
            booking.durationMinutes || 45,
            timezone
          )
          sessionStart = bounds.sessionStartAt
          sessionEnd = bounds.sessionEndAt
        } catch {
          sessionStart = undefined
          sessionEnd = undefined
        }
      }

      const isPast = sessionEnd ? now > sessionEnd : booking.date < todayStr
      const isConfirmed = booking.status === 'confirmed'
      const isPending = ['pending', 'awaiting_payment', 'awaiting_verification'].includes(booking.status)
      const isCancelled = booking.status === 'cancelled' || booking.status === 'rejected'
      const isDisputed = booking.attendanceStatus === 'disputed' || Boolean(existingComplaint)

      // Active 15 minutes before session until session ends
      const isJoinable = Boolean(
        isConfirmed &&
        booking.googleMeetLink &&
        sessionStart &&
        sessionEnd &&
        now.getTime() >= sessionStart.getTime() - 15 * 60 * 1000 &&
        now.getTime() <= sessionEnd.getTime()
      )

      // Reschedule eligibility: upcoming, confirmed or pending, not cancelled, and within expert deadline window
      const deadlineHours = booking.rescheduleDeadlineHours || exp?.rescheduleDeadlineHours || 24
      const rescheduleDeadlineAt = sessionStart
        ? new Date(sessionStart.getTime() - deadlineHours * 60 * 60 * 1000)
        : null
      const canReschedule = Boolean(
        !isPast &&
        !isCancelled &&
        rescheduleDeadlineAt &&
        now < rescheduleDeadlineAt
      )

      // Review eligibility: session is past or attendance marked completed, and hasn't reviewed yet
      const canReview = Boolean(
        (isPast || booking.attendanceStatus === 'completed') &&
        !isCancelled &&
        !existingReview
      )

      // Complaint eligibility: can file if hasn't filed yet or not cancelled
      const canComplain = Boolean(!existingComplaint)

      // Calculate stats
      if (isConfirmed && !isPast) {
        upcomingCount++
      } else if (isConfirmed && isPast) {
        completedCount++
      } else if (isPending) {
        pendingVerificationCount++
      }

      if (isDisputed || booking.attendanceStatus === 'client_absent' || booking.attendanceStatus === 'expert_absent') {
        issuesCount++
      }

      return {
        _id: booking._id!.toString(),
        reference: booking.reference || `BK-${booking._id!.toString().slice(-4).toUpperCase()}`,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        attendanceStatus: booking.attendanceStatus || 'pending',
        date: booking.date,
        time: booking.time,
        durationMinutes: booking.durationMinutes || 45,
        amount: booking.amount,
        currency: booking.currency || 'EGP',
        googleMeetLink: booking.googleMeetLink,
        rescheduleToken: booking.rescheduleToken,
        createdAt: booking.createdAt,
        isPast,
        isJoinable,
        canReschedule,
        canReview,
        canComplain,
        deadlineHours,
        rescheduleDeadlineAt: rescheduleDeadlineAt?.toISOString(),
        expert: {
          id: exp?._id?.toString() || booking.expertId?.toString(),
          name: exp?.name || 'Expert',
          slug: exp?.slug || booking.expertSlug || '',
          avatarUrl: exp?.avatarUrl || exp?.image || '',
          role: exp?.role || '',
        },
        service: {
          id: srv?._id?.toString() || booking.serviceId?.toString(),
          title: srv?.title || booking.serviceTitle || { en: 'Consultation Session', ar: 'جلسة استشارية' },
          slug: srv?.slug || '',
        },
        review: existingReview
          ? {
              _id: existingReview._id?.toString(),
              expertRating: existingReview.expertRating,
              expertReviewText: existingReview.expertReviewText,
              serviceRating: existingReview.serviceRating,
              serviceReviewText: existingReview.serviceReviewText,
              createdAt: existingReview.createdAt,
            }
          : null,
        complaint: existingComplaint
          ? {
              _id: existingComplaint._id?.toString(),
              category: existingComplaint.category,
              subject: existingComplaint.subject,
              description: existingComplaint.description,
              status: existingComplaint.status,
              createdAt: existingComplaint.createdAt,
              resolution: existingComplaint.resolution,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalBookings,
        upcomingCount,
        completedCount,
        pendingVerificationCount,
        issuesCount,
      },
      bookings: enrichedBookings,
    })
  } catch (error: any) {
    console.error('Failed to load client bookings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

