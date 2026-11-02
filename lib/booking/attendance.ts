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

  const updatedStatus = resolveAttendanceStatus(
    expertReport?.response,
    clientReport?.response,
    isDeadlineExpired
  )

  const updateFields: any = {
    attendanceStatus: updatedStatus,
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
      const adminDisputeUrl = `${baseUrl}/admin?tab=attendance`
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

