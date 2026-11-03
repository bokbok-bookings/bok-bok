import { ObjectId } from 'mongodb'
import {
  getBookingsCollection,
  getExpertsCollection,
  getUsersCollection,
  getSettingsCollection,
  type BookingDoc,
  type ExpertDoc,
} from '@/lib/db'
import { sendTransactionalEmail, processEmailRetries } from '@/lib/email/mailer'
import {
  renderDayOfReminderEmail,
  // renderBeforeSessionReminderEmail, // Uncomment with CHECK 3 when upgrading to Vercel Pro
  renderMissingMeetLinkAlertEmail,
  renderAttendancePromptEmail,
} from '@/lib/email/templates'

const DEFAULT_TIMEZONE = 'Africa/Cairo'

/**
 * Converts local date and time string in a given timezone into exact UTC timestamps.
 */
export function computeSessionBounds(
  dateStr: string,
  timeStr: string,
  durationMinutes: number,
  timeZone = DEFAULT_TIMEZONE
): { sessionStartAt: Date; sessionEndAt: Date } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  const invDate = new Date(dt.toLocaleString('en-US', { timeZone: 'UTC' }))
  const targetDate = new Date(dt.toLocaleString('en-US', { timeZone }))
  const diffMs = invDate.getTime() - targetDate.getTime()

  const sessionStartAt = new Date(dt.getTime() + diffMs)
  const sessionEndAt = new Date(sessionStartAt.getTime() + Math.max(15, durationMinutes) * 60 * 1000)

  return { sessionStartAt, sessionEndAt }
}

/**
 * Get the current date string (YYYY-MM-DD) in a specific timezone.
 */
export function getCurrentDateInTimezone(
  timeZone = DEFAULT_TIMEZONE,
  date: Date = new Date()
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export interface PlatformMeetingSettings {
  beforeSessionReminderMinutes: 10 | 15 | 20 | 30
  attendanceReportingWindowHours: number
}

const DEFAULT_PLATFORM_SETTINGS: PlatformMeetingSettings = {
  beforeSessionReminderMinutes: 15,
  attendanceReportingWindowHours: 24,
}

export async function getPlatformMeetingSettings(): Promise<PlatformMeetingSettings> {
  try {
    const settingsCol = await getSettingsCollection()
    const doc = await settingsCol.findOne({ key: 'platform_meeting_settings' })
    if (doc?.value) {
      return {
        beforeSessionReminderMinutes: doc.value.beforeSessionReminderMinutes || 15,
        attendanceReportingWindowHours: doc.value.attendanceReportingWindowHours || 24,
      }
    }
  } catch (err) {
    console.error('Failed to load platform meeting settings, using defaults:', err)
  }
  return DEFAULT_PLATFORM_SETTINGS
}

export async function savePlatformMeetingSettings(
  updates: Partial<PlatformMeetingSettings>
): Promise<PlatformMeetingSettings> {
  const settingsCol = await getSettingsCollection()
  const current = await getPlatformMeetingSettings()
  const merged: PlatformMeetingSettings = {
    ...current,
    ...updates,
  }

  await settingsCol.updateOne(
    { key: 'platform_meeting_settings' },
    {
      $set: {
        key: 'platform_meeting_settings',
        value: merged,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  return merged
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

/**
 * Resolves an expert's name and user email address from their expert profile.
 */
export async function resolveExpertContact(expertId: ObjectId): Promise<{
  expertDoc: ExpertDoc | null
  expertName: string
  expertEmail?: string
}> {
  const expertsCol = await getExpertsCollection()
  const usersCol = await getUsersCollection()

  const expertDoc = await expertsCol.findOne({ _id: expertId })
  if (!expertDoc) {
    return { expertDoc: null, expertName: 'Bok Bok Expert', expertEmail: undefined }
  }

  let expertEmail: string | undefined = undefined

  if (expertDoc.userId) {
    const userDoc = await usersCol.findOne({ _id: expertDoc.userId })
    if (userDoc?.email) expertEmail = userDoc.email
  }

  if (!expertEmail) {
    const userByExpertId = await usersCol.findOne({ expertId: expertDoc._id })
    if (userByExpertId?.email) expertEmail = userByExpertId.email
  }

  return {
    expertDoc,
    expertName: expertDoc.name || 'Bok Bok Expert',
    expertEmail,
  }
}

/**
 * Core notification processor executed by the background scheduler / cron.
 */
export async function processAutomatedReminders(): Promise<{
  dayOfReminders: number
  beforeSessionReminders: number
  missingMeetAlerts: number
  attendancePrompts: number
  retriedEmails: number
}> {
  const bookingsCol = await getBookingsCollection()
  const platformSettings = await getPlatformMeetingSettings()
  const baseUrl = getAppBaseUrl()
  const now = new Date()

  let dayOfReminders = 0
  let beforeSessionReminders = 0
  let missingMeetAlerts = 0
  let attendancePrompts = 0

  // 1. Fetch confirmed bookings that might require notifications
  // Looking at bookings active from today onwards, or completed recently
  const activeBookings = await bookingsCol
    .find({
      status: 'confirmed',
    })
    .sort({ sessionStartAt: 1 })
    .toArray()

  for (const booking of activeBookings) {
    const timezone = booking.timezone || DEFAULT_TIMEZONE
    const isOnline = booking.deliveryMode !== 'IN_PERSON'

    // Compute or ensure session timestamps
    let startAt = booking.sessionStartAt
    let endAt = booking.sessionEndAt

    if (!startAt || !endAt) {
      const bounds = computeSessionBounds(booking.date, booking.time, booking.durationMinutes || 45, timezone)
      startAt = bounds.sessionStartAt
      endAt = bounds.sessionEndAt

      // Cache timestamps in DB
      await bookingsCol.updateOne(
        { _id: booking._id },
        { $set: { sessionStartAt: startAt, sessionEndAt: endAt } }
      )
    }

    const { expertName, expertEmail } = await resolveExpertContact(booking.expertId)
    const serviceTitle =
      booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'
    const rescheduleUrl = booking.rescheduleToken
      ? `${baseUrl}/bookings/${booking._id}?token=${booking.rescheduleToken}`
      : undefined
    const dashboardUrl = `${baseUrl}/dashboard/bookings`
    const meetLink = booking.googleMeetLink?.trim() || ''

    const todayInTimezone = getCurrentDateInTimezone(timezone)
    const isSessionToday = booking.date === todayInTimezone
    const hasSessionPassed = now >= startAt
    const hasSessionEnded = now >= endAt

    // ------------------------------------------------------------------------
    // CHECK 1: Missing Google Meet Link Alert (to Expert)
    // ------------------------------------------------------------------------
    if (isOnline && !meetLink && !hasSessionEnded) {
      // If session is today and link is missing, alert the expert once
      if (isSessionToday && !booking.reminders?.missingMeetLinkAlertSentAt) {
        // Lock and alert
        const lock = await bookingsCol.updateOne(
          {
            _id: booking._id,
            'reminders.missingMeetLinkAlertSentAt': { $exists: false },
          },
          {
            $set: {
              'reminders.missingMeetLinkAlertSentAt': now,
            },
          }
        )

        if (lock.modifiedCount > 0 && expertEmail) {
          const emailContent = renderMissingMeetLinkAlertEmail({
            booking,
            expertName,
            clientName: booking.clientName,
            serviceTitle,
            dashboardUrl,
          })

          await sendTransactionalEmail({
            bookingId: booking._id,
            emailType: 'missing_meet_link_alert',
            recipientEmail: expertEmail,
            recipientName: expertName,
            recipientRole: 'expert',
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          })

          missingMeetAlerts++
        }
      }
    }

    // ------------------------------------------------------------------------
    // CHECK 2: Reminder 1 (First Reminder of the Day)
    // ------------------------------------------------------------------------
    // Sent once on session date to BOTH client and expert.
    // If online, REQUIRE Google Meet link before sending to client.
    if (
      isSessionToday &&
      !hasSessionPassed &&
      !booking.reminders?.dayOfReminderSentAt &&
      (!isOnline || meetLink) // Prevent sending if meet link is missing
    ) {
      // Atomic lock
      const lock = await bookingsCol.updateOne(
        {
          _id: booking._id,
          'reminders.dayOfReminderSentAt': { $exists: false },
        },
        {
          $set: {
            'reminders.dayOfReminderSentAt': now,
          },
        }
      )

      if (lock.modifiedCount > 0) {
        // Send to Client
        const clientEmailData = renderDayOfReminderEmail({
          booking,
          expertName,
          clientName: booking.clientName,
          serviceTitle,
          meetLink,
          rescheduleUrl,
          recipientRole: 'client',
        })

        await sendTransactionalEmail({
          bookingId: booking._id,
          emailType: 'reminder_day_of',
          recipientEmail: booking.clientEmail,
          recipientName: booking.clientName,
          recipientRole: 'client',
          subject: clientEmailData.subject,
          html: clientEmailData.html,
          text: clientEmailData.text,
        })

        // Send to Expert
        if (expertEmail) {
          const expertEmailData = renderDayOfReminderEmail({
            booking,
            expertName,
            clientName: booking.clientName,
            serviceTitle,
            meetLink,
            rescheduleUrl,
            recipientRole: 'expert',
          })

          await sendTransactionalEmail({
            bookingId: booking._id,
            emailType: 'reminder_day_of',
            recipientEmail: expertEmail,
            recipientName: expertName,
            recipientRole: 'expert',
            subject: expertEmailData.subject,
            html: expertEmailData.html,
            text: expertEmailData.text,
          })
        }

        dayOfReminders++
      }
    }

    // ------------------------------------------------------------------------
    // CHECK 3: Reminder 2 (Before the Session - e.g. 15 minutes before)
    // Commented out while on Vercel Hobby plan (daily cron).
    // Uncomment when upgrading to Vercel Pro with "*/14 * * * *" in vercel.json.
    // ------------------------------------------------------------------------
    /*
    const reminderIntervalMins = platformSettings.beforeSessionReminderMinutes || 15
    const msUntilStart = startAt.getTime() - now.getTime()

    // Trigger if session starts within the reminder threshold (or up to 1 tick cycle ahead) and has not yet started
    const isWithinBeforeWindow = msUntilStart > 0 && msUntilStart <= (reminderIntervalMins + 14) * 60 * 1000

    if (
      isWithinBeforeWindow &&
      !booking.reminders?.beforeSessionReminderSentAt &&
      (!isOnline || meetLink) // Block if meet link is missing
    ) {
      // Atomic lock
      const lock = await bookingsCol.updateOne(
        {
          _id: booking._id,
          'reminders.beforeSessionReminderSentAt': { $exists: false },
        },
        {
          $set: {
            'reminders.beforeSessionReminderSentAt': now,
          },
        }
      )

      if (lock.modifiedCount > 0) {
        // Send to Client
        const clientEmailData = renderBeforeSessionReminderEmail({
          booking,
          expertName,
          clientName: booking.clientName,
          serviceTitle,
          meetLink,
          minutesBefore: reminderIntervalMins,
          recipientRole: 'client',
        })

        await sendTransactionalEmail({
          bookingId: booking._id,
          emailType: 'reminder_before_session',
          recipientEmail: booking.clientEmail,
          recipientName: booking.clientName,
          recipientRole: 'client',
          subject: clientEmailData.subject,
          html: clientEmailData.html,
          text: clientEmailData.text,
        })

        // Send to Expert
        if (expertEmail) {
          const expertEmailData = renderBeforeSessionReminderEmail({
            booking,
            expertName,
            clientName: booking.clientName,
            serviceTitle,
            meetLink,
            minutesBefore: reminderIntervalMins,
            recipientRole: 'expert',
          })

          await sendTransactionalEmail({
            bookingId: booking._id,
            emailType: 'reminder_before_session',
            recipientEmail: expertEmail,
            recipientName: expertName,
            recipientRole: 'expert',
            subject: expertEmailData.subject,
            html: expertEmailData.html,
            text: expertEmailData.text,
          })
        }

        beforeSessionReminders++
      }
    }
    */

    // ------------------------------------------------------------------------
    // CHECK 4: Post-Session Attendance Prompt
    // ------------------------------------------------------------------------
    // Triggered after session ends, within reporting window (e.g. 24h)
    const reportingHours = platformSettings.attendanceReportingWindowHours || 24
    const deadlineMs = endAt.getTime() + reportingHours * 60 * 60 * 1000
    const isWithinReportingWindow = now >= endAt && now.getTime() <= deadlineMs

    if (
      isWithinReportingWindow &&
      !booking.reminders?.attendancePromptSentAt &&
      booking.attendanceStatus !== 'completed' &&
      booking.attendanceStatus !== 'cancelled'
    ) {
      const lock = await bookingsCol.updateOne(
        {
          _id: booking._id,
          'reminders.attendancePromptSentAt': { $exists: false },
        },
        {
          $set: {
            'reminders.attendancePromptSentAt': now,
          },
        }
      )

      if (lock.modifiedCount > 0) {
        const clientAttendanceUrl = rescheduleUrl
          ? `${rescheduleUrl}#attendance`
          : `${baseUrl}/bookings/${booking._id}`
        const expertAttendanceUrl = `${baseUrl}/dashboard/bookings`

        // Send to Client
        const clientPrompt = renderAttendancePromptEmail({
          booking,
          expertName,
          clientName: booking.clientName,
          serviceTitle,
          party: 'client',
          attendanceUrl: clientAttendanceUrl,
          reportingWindowHours: reportingHours,
        })

        await sendTransactionalEmail({
          bookingId: booking._id,
          emailType: 'attendance_prompt',
          recipientEmail: booking.clientEmail,
          recipientName: booking.clientName,
          recipientRole: 'client',
          subject: clientPrompt.subject,
          html: clientPrompt.html,
          text: clientPrompt.text,
        })

        // Send to Expert
        if (expertEmail) {
          const expertPrompt = renderAttendancePromptEmail({
            booking,
            expertName,
            clientName: booking.clientName,
            serviceTitle,
            party: 'expert',
            attendanceUrl: expertAttendanceUrl,
            reportingWindowHours: reportingHours,
          })

          await sendTransactionalEmail({
            bookingId: booking._id,
            emailType: 'attendance_prompt',
            recipientEmail: expertEmail,
            recipientName: expertName,
            recipientRole: 'expert',
            subject: expertPrompt.subject,
            html: expertPrompt.html,
            text: expertPrompt.text,
          })
        }

        attendancePrompts++
      }
    }
  }

  // 2. Process any failed emails eligible for retry
  const retriedEmails = await processEmailRetries()

  return {
    dayOfReminders,
    beforeSessionReminders,
    missingMeetAlerts,
    attendancePrompts,
    retriedEmails,
  }
}

