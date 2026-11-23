import type { BookingDoc, ComplaintDoc } from '@/lib/db'

export type ReviewEligibilityReason =
  | 'open'
  | 'already_reviewed'
  | 'not_confirmed'
  | 'on_hold'
  | 'session_not_ended'
  | 'waiting_period'

export interface ReviewEligibilityResult {
  isOpen: boolean
  reason: ReviewEligibilityReason
  opensAt: Date | null
  reportingWindowHours: number
  isOnHold: boolean
}

const HOLD_ATTENDANCE_STATUSES = new Set([
  'disputed',
  'expert_absent',
  'both_absent',
  'cancelled',
])

const ACTIVE_COMPLAINT_STATUSES = new Set(['pending', 'under_review'])

/**
 * Evaluates whether the post-session review window is open for a booking.
 *
 * Rules:
 * 1. Booking must be confirmed and not already reviewed.
 * 2. Nothing is on hold: no active/open complaint (pending or under_review) and
 *    attendanceStatus is not disputed / expert_absent / both_absent / cancelled.
 * 3. The post-session problem/refund reporting period (default 24h after sessionEndAt)
 *    must be completely over (`now >= sessionEndAt + reportingWindowHours`).
 */
export function evaluateReviewEligibility(params: {
  booking: Pick<
    BookingDoc,
    'status' | 'attendanceStatus' | 'hasReview' | 'hasComplaint'
  >
  sessionEndAt: Date | null | undefined
  complaint?: Pick<ComplaintDoc, 'status'> | null
  hasExistingReview?: boolean
  reportingWindowHours?: number
  now?: Date
}): ReviewEligibilityResult {
  const {
    booking,
    sessionEndAt,
    complaint,
    hasExistingReview,
    reportingWindowHours = 24,
    now = new Date(),
  } = params

  const opensAt = sessionEndAt
    ? new Date(sessionEndAt.getTime() + reportingWindowHours * 60 * 60 * 1000)
    : null

  const isOnHold = Boolean(
    HOLD_ATTENDANCE_STATUSES.has(booking.attendanceStatus || '') ||
      (complaint && ACTIVE_COMPLAINT_STATUSES.has(complaint.status)) ||
      (booking.hasComplaint && !complaint)
  )

  if (hasExistingReview || booking.hasReview) {
    return {
      isOpen: false,
      reason: 'already_reviewed',
      opensAt,
      reportingWindowHours,
      isOnHold,
    }
  }

  if (booking.status !== 'confirmed') {
    return {
      isOpen: false,
      reason: 'not_confirmed',
      opensAt,
      reportingWindowHours,
      isOnHold,
    }
  }

  if (isOnHold) {
    return {
      isOpen: false,
      reason: 'on_hold',
      opensAt,
      reportingWindowHours,
      isOnHold: true,
    }
  }

  if (!sessionEndAt || !opensAt || now < sessionEndAt) {
    return {
      isOpen: false,
      reason: 'session_not_ended',
      opensAt,
      reportingWindowHours,
      isOnHold: false,
    }
  }

  if (now < opensAt) {
    return {
      isOpen: false,
      reason: 'waiting_period',
      opensAt,
      reportingWindowHours,
      isOnHold: false,
    }
  }

  return {
    isOpen: true,
    reason: 'open',
    opensAt,
    reportingWindowHours,
    isOnHold: false,
  }
}
