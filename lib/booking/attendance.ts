import { ObjectId } from 'mongodb'
import {
  getBookingsCollection,
  getAttendanceLogsCollection,
  toObjectId,
  type BookingDoc,
  type AttendanceStatus,
  type AttendanceReport,
} from '@/lib/db'
import { getPlatformMeetingSettings, resolveExpertContact, getAppBaseUrl } from '@/lib/email/scheduler'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import { renderAttendanceDisputeAdminEmail } from '@/lib/email/templates'
import { syncBookingMeetTelemetry } from '@/lib/google-calendar'

export interface AttendanceSubmissionInput {
  bookingId: string | ObjectId
  userRole: 'client' | 'expert' | 'admin'
  userId?: string | ObjectId
  response: 'attended' | 'absent' | 'admin_override'
  notes?: string
  adminOverrideStatus?: AttendanceStatus
}

export interface AttendanceSubmissionResult {
  success: boolean
  previousStatus: AttendanceStatus
  updatedStatus: AttendanceStatus
  isDisputed: boolean
  message: string
}

/**
 * Computes the verified attendance status from client and expert reports.
 */
export function resolveAttendanceStatus(
  expertResponse?: 'attended' | 'absent',
  clientResponse?: 'attended' | 'absent',
  isDeadlineExpired = false
): AttendanceStatus {
  // If both submitted
  if (expertResponse && clientResponse) {
    if (expertResponse === 'attended' && clientResponse === 'attended') {
      return 'completed'
    }
    if (expertResponse === 'absent' && clientResponse === 'absent') {
      return 'both_absent'
    }
    // Conflicting reports: Attended/Absent or Absent/Attended
    return 'disputed'
  }

  // If only one submitted and deadline expired
  if (isDeadlineExpired) {
    if (expertResponse === 'attended' && !clientResponse) {
      return 'completed' // or client didn't dispute within window
    }
    if (expertResponse === 'absent' && !clientResponse) {
      return 'client_absent'
    }
    if (clientResponse === 'attended' && !expertResponse) {
      return 'completed'
    }
    if (clientResponse === 'absent' && !expertResponse) {
      return 'expert_absent'
    }
  }

  return 'pending'
}

/**
 * Automatically derives attendance from Google Meet REST API telemetry + tracked joins
 * once the session has ended.
 *
 * - Both client & expert joined (and did not immediately drop within <2 min if telemetry duration is known) -> 'completed'
 * - Reporting window expired, no reports:
 *     only expert joined                   -> 'client_absent'
 *     only client joined                   -> 'expert_absent'
 *
 * Never overrides manual reports, disputes, or admin resolutions.
 * Returns the new status when an update was applied, otherwise null.
 */
export async function applyJoinTrackingAttendance(
  booking: BookingDoc,
  now: Date = new Date(),
  reportingWindowHours = 24
): Promise<AttendanceStatus | null> {
  if (!booking._id || booking.status !== 'confirmed') return null
  if (booking.deliveryMode === 'IN_PERSON') return null
  if (booking.attendanceStatus && booking.attendanceStatus !== 'pending') return null
  if (booking.attendanceDisputeResolution) return null

  const sessionEndAt = booking.sessionEndAt
  if (!sessionEndAt || now < sessionEndAt) return null

  // Sync latest Google Meet conferenceRecords & participantSessions (join/leave/duration)
  if (booking.googleMeetLink) {
    try {
      await syncBookingMeetTelemetry(booking)
    } catch {
      // Fall back to existing meetingJoins if Meet API sync fails
    }
  }

  const clientJoin = booking.meetingJoins?.client
  const expertJoin = booking.meetingJoins?.expert
  const clientJoined = Boolean(clientJoin?.firstJoinedAt)
  const expertJoined = Boolean(expertJoin?.firstJoinedAt)
  const hasReports = Boolean(booking.clientAttendanceReport || booking.expertAttendanceReport)
  const deadlineExpired =
    now.getTime() > sessionEndAt.getTime() + reportingWindowHours * 60 * 60 * 1000

  // Minimum call stay threshold (in minutes) when Google Meet API duration is available
  const minRequiredMinutes = Math.min(
    5,
    Math.max(2, Math.floor((booking.durationMinutes || 45) * 0.15))
  )
  const clientStayedEnough =
    clientJoin?.durationMinutes === undefined || clientJoin.durationMinutes >= minRequiredMinutes
  const expertStayedEnough =
    expertJoin?.durationMinutes === undefined || expertJoin.durationMinutes >= minRequiredMinutes

  const hasTelemetryDuration =
    clientJoin?.durationMinutes !== undefined || expertJoin?.durationMinutes !== undefined
  const source: NonNullable<BookingDoc['attendanceSource']> = hasTelemetryDuration
    ? 'meet_api_telemetry'
    : 'meet_join_tracking'

  let newStatus: AttendanceStatus | null = null
  if (clientJoined && expertJoined && clientStayedEnough && expertStayedEnough) {
    newStatus = 'completed'
  } else if (deadlineExpired && !hasReports) {
    if (expertJoined && expertStayedEnough && (!clientJoined || !clientStayedEnough)) {
      newStatus = 'client_absent'
    } else if (clientJoined && clientStayedEnough && (!expertJoined || !expertStayedEnough)) {
      newStatus = 'expert_absent'
    }
  }

  if (!newStatus) return null

  const bookingsCol = await getBookingsCollection()
  const res = await bookingsCol.updateOne(
    {
      _id: booking._id,
      $or: [{ attendanceStatus: 'pending' }, { attendanceStatus: { $exists: false } }],
    },
    {
      $set: {
        attendanceStatus: newStatus,
        attendanceSource: source,
        updatedAt: now,
      },
    }
  )

  if (res.modifiedCount > 0) {
    const attendanceLogsCol = await getAttendanceLogsCollection()
    const clientDurationNote =
      clientJoin?.durationMinutes !== undefined ? ` (${clientJoin.durationMinutes}m)` : ''
    const expertDurationNote =
      expertJoin?.durationMinutes !== undefined ? ` (${expertJoin.durationMinutes}m)` : ''
    await attendanceLogsCol.insertOne({
      bookingId: booking._id,
      userRole: 'admin',
      attendanceResponse: 'admin_override',
      previousStatus: booking.attendanceStatus || 'pending',
      updatedStatus: newStatus,
      notes: `Auto-resolved from Google Meet telemetry (client joined: ${clientJoined}${clientDurationNote}, expert joined: ${expertJoined}${expertDurationNote})`,
      submittedAt: now,
    } as any)
    booking.attendanceStatus = newStatus
    booking.attendanceSource = source
    return newStatus
  }

  return null
}

/**
 * Records an attendance report from either Client, Expert, or Admin resolution.
 */
export async function submitAttendanceReport(
  input: AttendanceSubmissionInput
): Promise<AttendanceSubmissionResult> {
  const bookingsCol = await getBookingsCollection()
  const attendanceLogsCol = await getAttendanceLogsCollection()
  const platformSettings = await getPlatformMeetingSettings()

  const bookingObjId = toObjectId(input.bookingId)
  const booking = await bookingsCol.findOne({ _id: bookingObjId })

  if (!booking) {
    throw new Error('Booking not found')
  }

  if (booking.status !== 'confirmed') {
    throw new Error('Attendance can only be tracked for confirmed bookings')
  }

  const previousStatus: AttendanceStatus = booking.attendanceStatus || 'pending'
  const now = new Date()
  const sessionEndAt = booking.sessionEndAt || new Date(booking.date + 'T' + booking.time)

  // Check if session has actually taken place
  if (now < sessionEndAt && input.userRole !== 'admin') {
    throw new Error('Attendance can only be reported after the scheduled session ends')
  }

  // Check reporting deadline window for non-admins
  const reportingHours = platformSettings.attendanceReportingWindowHours || 24
  const reportingDeadline = new Date(sessionEndAt.getTime() + reportingHours * 60 * 60 * 1000)
  const isDeadlineExpired = now > reportingDeadline

  if (isDeadlineExpired && input.userRole !== 'admin') {
    throw new Error(
      `The attendance reporting window (${reportingHours} hours after session) has closed. Please contact support/admin.`
    )
  }

  // 1. ADMIN OVERRIDE FLOW
  if (input.userRole === 'admin') {
    if (!input.adminOverrideStatus) {
      throw new Error('Admin override status is required')
    }

    const updatedStatus = input.adminOverrideStatus
    const adminObjId = input.userId ? toObjectId(input.userId) : new ObjectId()

    await bookingsCol.updateOne(
      { _id: bookingObjId },
      {
        $set: {
          attendanceStatus: updatedStatus,
          attendanceDisputeResolution: {
            resolvedBy: adminObjId,
            finalStatus: updatedStatus,
            reason: input.notes || 'Admin manual resolution',
            resolvedAt: now,
          },
          updatedAt: now,
        },
      }
    )

    // Append to immutable audit trail
    await attendanceLogsCol.insertOne({
      bookingId: bookingObjId,
      userId: adminObjId,
      userRole: 'admin',
      attendanceResponse: 'admin_override',
      previousStatus,
      updatedStatus,
      notes: input.notes,
      submittedAt: now,
    })

    return {
      success: true,
      previousStatus,
      updatedStatus,
      isDisputed: false,
      message: `Admin successfully updated session attendance to ${updatedStatus}`,
    }
  }

  // 2. CLIENT OR EXPERT SUBMISSION FLOW
  if (input.response !== 'attended' && input.response !== 'absent') {
    throw new Error('Invalid attendance response. Must be "attended" or "absent"')
  }

  const reportDoc: AttendanceReport = {
    response: input.response,
    notes: input.notes ? input.notes.trim() : undefined,
    submittedAt: now,
    userId: input.userId ? toObjectId(input.userId) : undefined,
    userRole: input.userRole as 'client' | 'expert',
  }

  let expertReport = booking.expertAttendanceReport
  let clientReport = booking.clientAttendanceReport

  if (input.userRole === 'expert') {
    expertReport = reportDoc
  } else if (input.userRole === 'client') {
    clientReport = reportDoc
  }

  // Tracked Google Meet joins count as implicit "attended" evidence for a party
  // that has not submitted an explicit report yet.
  const expertEvidence =
    expertReport?.response ?? (booking.meetingJoins?.expert?.firstJoinedAt ? 'attended' : undefined)
  const clientEvidence =
    clientReport?.response ?? (booking.meetingJoins?.client?.firstJoinedAt ? 'attended' : undefined)

  const updatedStatus = resolveAttendanceStatus(expertEvidence, clientEvidence, isDeadlineExpired)

  const updateFields: any = {
    attendanceStatus: updatedStatus,
    attendanceSource: 'reports',
    updatedAt: now,
  }

  if (input.userRole === 'expert') {
    updateFields.expertAttendanceReport = reportDoc
  } else {
    updateFields.clientAttendanceReport = reportDoc
  }

  await bookingsCol.updateOne({ _id: bookingObjId }, { $set: updateFields })

  // Insert audit log
  await attendanceLogsCol.insertOne({
    bookingId: bookingObjId,
    userId: reportDoc.userId,
    userRole: input.userRole,
    attendanceResponse: input.response,
    previousStatus,
    updatedStatus,
    notes: input.notes,
    submittedAt: now,
  })

  // 3. IF DISPUTED, NOTIFY ADMIN
  const isDisputed = updatedStatus === 'disputed'
  if (isDisputed) {
    try {
      const { expertName } = await resolveExpertContact(booking.expertId)
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'bokbok.bookings@gmail.com'
      const baseUrl = getAppBaseUrl()
      const adminDisputeUrl = `${baseUrl}/admin/attendance`
      const serviceTitle =
        booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'

      const emailData = renderAttendanceDisputeAdminEmail({
        booking,
        expertName,
        clientName: booking.clientName,
        serviceTitle,
        expertReport: expertReport?.response === 'attended' ? 'Session Attended' : 'Client Was Absent (No-Show)',
        clientReport: clientReport?.response === 'attended' ? 'Session Attended' : 'Expert Was Absent',
        adminDisputeUrl,
      })

      await sendTransactionalEmail({
        bookingId: booking._id,
        emailType: 'attendance_dispute_admin',
        recipientEmail: adminEmail,
        recipientRole: 'admin',
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      })
    } catch (err) {
      console.error('[Attendance] Failed to send admin dispute alert:', err)
    }
  }

  return {
    success: true,
    previousStatus,
    updatedStatus,
    isDisputed,
    message: isDisputed
      ? 'Attendance submitted. Conflicting reports detected — session has been flagged for admin review.'
      : 'Attendance confirmation submitted successfully.',
  }
}

