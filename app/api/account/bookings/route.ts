import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getBookingsCollection, getExpertsCollection, getServicesCollection, getReviewsCollection, getComplaintsCollection } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { computeSessionBounds, getPlatformMeetingSettings } from '@/lib/email/scheduler'
import { MEET_UNLOCK_MINUTES_BEFORE, MEET_GRACE_MINUTES_AFTER_END } from '@/lib/booking/access'
import { evaluateReviewEligibility } from '@/lib/booking/review-eligibility'

export const dynamic = 'force-dynamic'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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

    // Find all bookings where client is the user or matched by email (case-insensitive for legacy bookings)
    const filterQuery: any = {
      $or: [
        { clientId: userObjId },
        ...(userEmail
          ? [{ clientEmail: { $regex: `^${escapeRegex(userEmail)}$`, $options: 'i' } }]
          : []),
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

    const platformSettings = await getPlatformMeetingSettings()
    const reportingWindowHours = platformSettings.attendanceReportingWindowHours || 24

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

      // Active 15 minutes before session until 30 minutes after session end (matching /api/bookings/[id]/join)
      const isJoinable = Boolean(
        isConfirmed &&
        booking.googleMeetLink &&
        sessionStart &&
        sessionEnd &&
        now.getTime() >= sessionStart.getTime() - MEET_UNLOCK_MINUTES_BEFORE * 60 * 1000 &&
        now.getTime() <= sessionEnd.getTime() + MEET_GRACE_MINUTES_AFTER_END * 60 * 1000
      )

      const isEventBooking = Boolean(
        booking.bookingType === 'WORKSHOP' ||
        booking.bookingType === 'WEBINAR' ||
        srv?.bookingType === 'WORKSHOP' ||
        srv?.bookingType === 'WEBINAR' ||
        booking.reference?.startsWith('EV-')
      )
      const isWaitlisted = booking.status === 'waitlisted'

      // Reschedule eligibility: 1-on-1 consultations only (group workshops/webinars cannot be individually rescheduled)
      const deadlineHours = booking.rescheduleDeadlineHours || exp?.rescheduleDeadlineHours || 24
      const rescheduleDeadlineAt = sessionStart
        ? new Date(sessionStart.getTime() - deadlineHours * 60 * 60 * 1000)
        : null
      const canReschedule = Boolean(
        !isEventBooking &&
        !isWaitlisted &&
        !isPast &&
        !isCancelled &&
        rescheduleDeadlineAt &&
        now < rescheduleDeadlineAt
      )

      const canCancelRegistration = Boolean(
        isEventBooking &&
        !isPast &&
        !isCancelled
      )

      // Post-event recording & materials (strictly for confirmed attendees once session has started/ended)
      const canAccessEventResources = Boolean(
        isEventBooking &&
        isConfirmed &&
        (isPast || (sessionStart && now >= sessionStart))
      )

      // Review eligibility: opens only after the post-session refund/problem period ends and nothing is on hold
      const reviewEligibility = evaluateReviewEligibility({
        booking,
        sessionEndAt: sessionEnd,
        complaint: existingComplaint,
        hasExistingReview: Boolean(existingReview),
        reportingWindowHours,
        now,
      })
      const canReview = reviewEligibility.isOpen

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
        hasMeetLink: Boolean(booking.googleMeetLink),
        meetJoinUrl:
          isConfirmed && booking.googleMeetLink
            ? `/api/bookings/${booking._id!.toString()}/join${booking.rescheduleToken ? `?token=${encodeURIComponent(booking.rescheduleToken)}` : ''
            }`
            : undefined,
        sessionStartAt: sessionStart?.toISOString(),
        sessionEndAt: sessionEnd?.toISOString(),
        rescheduleToken: booking.rescheduleToken,
        createdAt: booking.createdAt,
        isPast,
        isJoinable,
        isEventBooking,
        bookingType: booking.bookingType || srv?.bookingType || 'APPOINTMENT',
        registrationType: booking.registrationType || 'seat',
        canReschedule,
        canCancelRegistration,
        canReview,
        canComplain,
        deadlineHours,
        rescheduleDeadlineAt: rescheduleDeadlineAt?.toISOString(),
        eventSessions: isEventBooking && srv?.event?.sessions ? srv.event.sessions : undefined,
        recordingUrl: canAccessEventResources ? srv?.event?.recordingUrl : undefined,
        materials: canAccessEventResources ? srv?.event?.materials : undefined,
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

/**
 * PATCH /api/account/bookings
 * Allows a logged-in client to cancel their own upcoming Workshop/Webinar registration (or leave waitlist),
 * releasing their reserved seat if they held one.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { bookingId, action } = body

    if (!bookingId || action !== 'cancel_event_registration') {
      return NextResponse.json(
        { success: false, error: 'bookingId and action=cancel_event_registration are required' },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(bookingId)) {
      return NextResponse.json({ success: false, error: 'Invalid bookingId' }, { status: 400 })
    }

    const userObjId = new ObjectId(session.userId)
    const userEmail = (session.email || '').toLowerCase().trim()
    const bookingsCol = await getBookingsCollection()
    const servicesCol = await getServicesCollection()

    const booking = await bookingsCol.findOne({
      _id: new ObjectId(bookingId),
      $or: [
        { clientId: userObjId },
        ...(userEmail ? [{ clientEmail: { $regex: `^${escapeRegex(userEmail)}$`, $options: 'i' } }] : []),
      ],
    })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 })
    }

    const isEvent =
      booking.bookingType === 'WORKSHOP' ||
      booking.bookingType === 'WEBINAR' ||
      booking.reference?.startsWith('EV-')

    if (!isEvent) {
      return NextResponse.json(
        { success: false, error: 'Only workshop/webinar registrations can be cancelled here' },
        { status: 400 }
      )
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return NextResponse.json({ success: true, message: 'Registration is already cancelled' })
    }

    const heldSeat = booking.status !== 'waitlisted'

    await bookingsCol.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: 'cancelled',
          attendanceStatus: 'cancelled',
          updatedAt: new Date(),
        },
      }
    )

    if (heldSeat && booking.serviceId) {
      await servicesCol.updateOne(
        {
          _id: booking.serviceId,
          bookingType: { $in: ['WORKSHOP', 'WEBINAR'] },
          'event.registeredCount': { $gt: 0 },
        },
        { $inc: { 'event.registeredCount': -1 } }
      )
    }

    return NextResponse.json({
      success: true,
      message: heldSeat
        ? 'Your registration has been cancelled and your seat has been released.'
        : 'You have been removed from the waitlist.',
    })
  } catch (error: any) {
    console.error('Failed to cancel event registration:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

