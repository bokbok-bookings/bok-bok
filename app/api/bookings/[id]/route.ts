import { NextResponse } from 'next/server'
import {
  getBookingsCollection,
  getServicesCollection,
  getReviewsCollection,
  getComplaintsCollection,
  toObjectId,
} from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import {
  resolveExpertContact,
  computeSessionBounds,
  getPlatformMeetingSettings,
} from '@/lib/email/scheduler'
import { resolveTokenRole, MEET_UNLOCK_MINUTES_BEFORE, MEET_GRACE_MINUTES_AFTER_END } from '@/lib/booking/access'
import { applyJoinTrackingAttendance } from '@/lib/booking/attendance'
import { evaluateReviewEligibility } from '@/lib/booking/review-eligibility'
import {
  syncBookingMeetTelemetry,
  ensureBookingMeetDirectEntry,
  matchParticipantsToRoles,
} from '@/lib/google-calendar'
import { checkRateLimit } from '@/lib/rate-limit'
import { createBookingRefundPolicySnapshot } from '@/lib/services/refund-policies'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const rateLimit = checkRateLimit(request, 'booking-detail', 60, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      )
    }

    const unwrappedParams =
      typeof (context.params as any)?.then === 'function'
        ? await (context.params as Promise<{ id: string }>)
        : (context.params as { id: string })
    const { id } = unwrappedParams

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    let bookingObjId
    try {
      bookingObjId = toObjectId(id)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 })
    }

    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Authorization check: either valid token (client or expert), or logged-in client/expert/admin
    const session = await getSession()
    const tokenRole = resolveTokenRole(booking, token)
    const isTokenAuthorized = Boolean(tokenRole)
    const isAdmin = session?.role === 'admin'
    const isExpertOwner =
      tokenRole === 'expert' ||
      Boolean(
        session?.role === 'expert' &&
        session?.expertId &&
        session.expertId === booking.expertId.toString()
      )
    const isClientOwner = Boolean(
      (session?.userId && booking.clientId && session.userId === booking.clientId.toString()) ||
      (session?.email &&
        booking.clientEmail &&
        session.email.toLowerCase().trim() === booking.clientEmail.toLowerCase().trim())
    )

    if (!isTokenAuthorized && !isAdmin && !isExpertOwner && !isClientOwner) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view this booking' },
        { status: 403 }
      )
    }

    // Resolve expert & optional service details
    const { expertDoc, expertName, expertEmail } = await resolveExpertContact(booking.expertId)
    let serviceDoc: any = null
    if (booking.serviceId) {
      try {
        const servicesCol = await getServicesCollection()
        serviceDoc = await servicesCol.findOne({ _id: toObjectId(booking.serviceId) })
      } catch {
        serviceDoc = null
      }
    }

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
    const isEventBooking = Boolean(
      booking.bookingType === 'WORKSHOP' ||
      booking.bookingType === 'WEBINAR' ||
      serviceDoc?.bookingType === 'WORKSHOP' ||
      serviceDoc?.bookingType === 'WEBINAR' ||
      booking.reference?.startsWith('EV-')
    )
    const MAX_CLIENT_RESCHEDULES = 2
    const rescheduleCount = booking.rescheduleCount || 0
    const isRescheduleAllowed =
      !isEventBooking &&
      booking.status !== 'cancelled' &&
      booking.status !== 'rejected' &&
      now < rescheduleDeadlineAt &&
      (isAdmin || isExpertOwner || rescheduleCount < MAX_CLIENT_RESCHEDULES)

    // Check attendance reporting window (opens when session starts and extends through the dispute/refund window)
    const platformSettings = await getPlatformMeetingSettings()
    const reportingWindowHours = platformSettings.attendanceReportingWindowHours || 24
    const reportingDeadlineAt = new Date(endAt.getTime() + reportingWindowHours * 60 * 60 * 1000)
    const isAttendanceReportingOpen = now >= startAt && now <= reportingDeadlineAt

    // Sync Google Meet conferenceRecords & participantSessions (join, leave, duration)
    // once the 15-minute pre-session window opens or when explicitly requested (?syncMeet=1)
    const forceSyncMeet = searchParams.get('syncMeet') === '1'
    const meetUnlockAt = new Date(startAt.getTime() - 15 * 60 * 1000)
    if (
      booking.status === 'confirmed' &&
      booking.deliveryMode !== 'IN_PERSON' &&
      booking.googleMeetLink &&
      (forceSyncMeet || now >= meetUnlockAt)
    ) {
      if (now >= meetUnlockAt && now <= endAt) {
        try {
          await ensureBookingMeetDirectEntry(booking)
        } catch (err) {
          console.warn('Google Meet direct entry setup failed:', err)
        }
      }
      try {
        await syncBookingMeetTelemetry(booking, { force: forceSyncMeet, expertName })
      } catch (err) {
        console.warn('Google Meet telemetry sync failed:', err)
      }
    }

    // Auto-resolve attendance from tracked Google Meet joins/telemetry once the session has ended
    if (!booking.sessionEndAt) booking.sessionEndAt = endAt
    try {
      await applyJoinTrackingAttendance(booking, now)
    } catch (err) {
      console.warn('Join-tracking attendance resolution failed:', err)
    }

    const userRoleInView = tokenRole ?? (isAdmin ? 'admin' : isExpertOwner ? 'expert' : 'client')
    const viewerToken = token && tokenRole ? token : undefined
    const meetCloseAt = new Date(endAt.getTime() + MEET_GRACE_MINUTES_AFTER_END * 60 * 1000)
    const isMeetWindowOpen =
      booking.status === 'confirmed' && now >= meetUnlockAt && now <= meetCloseAt

    // Evaluate post-session review eligibility (opens after refund/problem period is over & nothing is on hold)
    const [reviewsCol, complaintsCol] = await Promise.all([
      getReviewsCollection(),
      getComplaintsCollection(),
    ])
    const [existingReview, existingComplaint] = await Promise.all([
      reviewsCol.findOne({ bookingId: bookingObjId }),
      complaintsCol.findOne({ bookingId: bookingObjId }),
    ])
    const reviewEligibility = evaluateReviewEligibility({
      booking,
      sessionEndAt: endAt,
      complaint: existingComplaint,
      hasExistingReview: Boolean(existingReview),
      reportingWindowHours,
      now,
    })

    return NextResponse.json({
      success: true,
      data: {
        _id: booking._id?.toString(),
        reference: booking.reference,
        serviceId: booking.serviceId?.toString(),
        bookingType: booking.bookingType || serviceDoc?.bookingType || 'APPOINTMENT',
        breakAfterMinutes: serviceDoc?.breakAfterMinutes || 0,
        minNoticeHours:
          serviceDoc?.minNoticeHours !== undefined ? Number(serviceDoc.minNoticeHours) : 24,
        serviceTitle: booking.serviceTitle,
        serviceImage: serviceDoc?.thumbnailUrl || null,
        expertId: booking.expertId.toString(),
        expertName,
        expertRole: expertDoc?.role,
        expertImage: expertDoc?.image || expertDoc?.avatarUrl,
        clientName: booking.clientName,
        ...(isAdmin ? { clientEmail: booking.clientEmail, clientPhone: booking.clientPhone } : {}),
        date: booking.date,
        time: booking.time,
        durationMinutes: booking.durationMinutes,
        amount: booking.amount,
        currency: booking.currency || 'EGP',
        status: booking.status,
        paymentMethod: booking.paymentMethod || (booking.paymentReceiptUrl ? 'instapay' : null),
        paymentStatus: booking.paymentStatus || null,
        hasPaymentReceipt: Boolean(booking.paymentReceiptUrl),
        cancellation: booking.cancellation || null,
        deliveryMode: booking.deliveryMode || 'ONLINE',
        hasMeetLink: Boolean(booking.googleMeetLink),
        googleMeetLink: isAdmin || isMeetWindowOpen ? booking.googleMeetLink : undefined,
        googleMeetUpdatedAt: booking.googleMeetUpdatedAt,
        timezone: booking.timezone || 'Africa/Cairo',
        sessionStartAt: startAt,
        sessionEndAt: endAt,
        rescheduleDeadlineHours: deadlineHours,
        rescheduleDeadlineAt,
        isRescheduleAllowed,
        rescheduleCount,
        maxReschedules: MAX_CLIENT_RESCHEDULES,
        originalSessionStartAt: booking.originalSessionStartAt || null,
        maxRefundPercentageCap:
          typeof booking.maxRefundPercentageCap === 'number'
            ? booking.maxRefundPercentageCap
            : null,
        refundPolicy:
          booking.refundPolicy ||
          (serviceDoc?.refundPolicy
            ? createBookingRefundPolicySnapshot(serviceDoc.refundPolicy)
            : createBookingRefundPolicySnapshot(null)),
        attendanceStatus: booking.attendanceStatus || 'pending',
        attendanceSource: booking.attendanceSource,
        isAttendanceReportingOpen,
        reportingDeadlineAt,
        expertAttendanceReport: booking.expertAttendanceReport,
        clientAttendanceReport: booking.clientAttendanceReport,
        ...(() => {
          let telemetry = booking.googleMeetTelemetry || null
          if (telemetry?.participants?.length) {
            telemetry = {
              ...telemetry,
              participants: matchParticipantsToRoles({
                participants: telemetry.participants,
                clientName: booking.clientName,
                expertName,
                clientJoin: booking.meetingJoins?.client,
                expertJoin: booking.meetingJoins?.expert,
              }),
            }
          }

          const resolvedJoins = {
            client: booking.meetingJoins?.client ? { ...booking.meetingJoins.client } : null,
            expert: booking.meetingJoins?.expert ? { ...booking.meetingJoins.expert } : null,
          }

          if (telemetry?.participants?.length) {
            const expertParts = telemetry.participants.filter((p: any) => p.matchedRole === 'expert')
            if (expertParts.length > 0 && resolvedJoins.expert) {
              const totalJoins = expertParts.reduce((acc: number, p: any) => acc + (p.sessionsCount || 1), 0)
              resolvedJoins.expert.joinCount = Math.max(resolvedJoins.expert.joinCount || 0, totalJoins, expertParts.length)
              const totalDurationSec = expertParts.reduce((acc: number, p: any) => acc + (p.durationSeconds || 0), 0)
              if (totalDurationSec > (resolvedJoins.expert.durationSeconds || 0)) {
                resolvedJoins.expert.durationSeconds = totalDurationSec
                resolvedJoins.expert.durationMinutes = Math.max(1, Math.round(totalDurationSec / 60))
              }
            }

            const clientParts = telemetry.participants.filter((p: any) => p.matchedRole === 'client')
            if (clientParts.length > 0 && resolvedJoins.client) {
              const totalJoins = clientParts.reduce((acc: number, p: any) => acc + (p.sessionsCount || 1), 0)
              resolvedJoins.client.joinCount = Math.max(resolvedJoins.client.joinCount || 0, totalJoins, clientParts.length)
              const totalDurationSec = clientParts.reduce((acc: number, p: any) => acc + (p.durationSeconds || 0), 0)
              if (totalDurationSec > (resolvedJoins.client.durationSeconds || 0)) {
                resolvedJoins.client.durationSeconds = totalDurationSec
                resolvedJoins.client.durationMinutes = Math.max(1, Math.round(totalDurationSec / 60))
              }
            }
          }

          return {
            meetingJoins: resolvedJoins,
            googleMeetTelemetry: telemetry,
          }
        })(),
        meetJoinUrl: `/api/bookings/${booking._id?.toString()}/join${viewerToken ? `?token=${encodeURIComponent(viewerToken)}` : ''
          }`,
        rescheduleHistory: booking.rescheduleHistory || [],
        hasReview: Boolean(existingReview || booking.hasReview),
        review: existingReview
          ? {
            _id: existingReview._id?.toString(),
            expertRating: existingReview.expertRating,
            expertReviewText: existingReview.expertReviewText,
            serviceRating: existingReview.serviceRating,
            serviceReviewText: existingReview.serviceReviewText,
            platformFeedback: existingReview.platformFeedback,
            createdAt: existingReview.createdAt,
          }
          : null,
        hasComplaint: Boolean(existingComplaint || booking.hasComplaint),
        complaint: existingComplaint
          ? {
            _id: existingComplaint._id?.toString(),
            category: existingComplaint.category,
            subject: existingComplaint.subject,
            status: existingComplaint.status,
            createdAt: existingComplaint.createdAt,
          }
          : null,
        reviewEligibility: {
          isOpen: reviewEligibility.isOpen,
          reason: reviewEligibility.reason,
          opensAt: reviewEligibility.opensAt?.toISOString() || null,
          reportingWindowHours: reviewEligibility.reportingWindowHours,
          isOnHold: reviewEligibility.isOnHold,
        },
        userRoleInView,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch booking details' },
      { status: 500 }
    )
  }
}

