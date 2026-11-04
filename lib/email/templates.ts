import type { BookingDoc, ExpertDoc } from '@/lib/db'

function emailLayout({
  title,
  preheader,
  contentHtml,
}: {
  title: string
  preheader: string
  contentHtml: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #fbfaf7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #14243b; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e7e2da; overflow: hidden; margin-top: 24px; margin-bottom: 24px; }
    .header { background-color: #14243b; padding: 32px 32px 28px; text-align: center; }
    .brand { font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0; }
    .brand-accent { color: #FCAD35; }
    .tagline { color: #8b94a1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .body { padding: 36px 32px; }
    .h1 { font-size: 22px; font-weight: 700; color: #14243b; margin: 0 0 16px; line-height: 1.3; }
    .p { font-size: 14px; line-height: 1.6; color: #4a5568; margin: 0 0 16px; }
    .highlight-card { background-color: #faf8f5; border: 1px solid #eeeae4; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eeeae4; font-size: 13px; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #8b94a1; font-weight: 600; }
    .meta-val { color: #14243b; font-weight: 700; text-align: right; }
    .btn { display: inline-block; background-color: #FCAD35; color: #142D4E !important; font-size: 14px; font-weight: 700; padding: 14px 28px; text-decoration: none; border-radius: 9999px; text-align: center; margin: 12px 0; }
    .btn-secondary { background-color: #14243b; }
    .btn-meet { background-color: #00796b; }
    .footer { background-color: #faf8f5; border-top: 1px solid #eeeae4; padding: 24px 32px; text-align: center; font-size: 12px; color: #8b94a1; }
    .alert-box { background-color: #FFF6D9; border: 1px solid #FCAD35; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #142D4E; line-height: 1.5; }
    .success-box { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #065f46; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#fbfaf7;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fbfaf7; padding: 16px;">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1 class="brand">Bok<span class="brand-accent">Bok</span></h1>
            <div class="tagline">Expert Consultations &amp; Knowledge</div>
          </div>
          <div class="body">
            ${contentHtml}
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px;">&copy; ${new Date().getFullYear()} Bok Bok. All rights reserved.</p>
            <p style="margin: 0; font-size: 11px;">Exclusively using Google Meet for all online sessions. Google Calendar is not required.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

interface CommonEmailParams {
  booking: BookingDoc
  expertName: string
  clientName: string
  serviceTitle: string
  rescheduleUrl?: string
  bookingUrl?: string
}

/**
 * 1. Booking Confirmation Email
 */
export function renderBookingConfirmationEmail(params: CommonEmailParams & {
  recipientRole: 'client' | 'expert'
  meetLink?: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, rescheduleUrl, bookingUrl, recipientRole, meetLink } = params
  const isClient = recipientRole === 'client'

  const subject = isClient
    ? `Booking Confirmed: ${serviceTitle} with ${expertName} [${booking.reference || 'BK'}]`
    : `New Confirmed Session: ${serviceTitle} with ${clientName} [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1">${isClient ? 'Your Consultation is Confirmed!' : 'You Have a Confirmed Session!'}</h2>
    <p class="p">
      ${isClient
      ? `Hello ${clientName}, your appointment with <strong>${expertName}</strong> has been confirmed. Below are your session details and access information.`
      : `Hello ${expertName}, a new booking with client <strong>${clientName}</strong> has been confirmed.`}
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Reference</span>
        <span class="meta-val">${booking.reference || booking._id?.toString() || '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Service</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date</span>
        <span class="meta-val">${booking.date}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Time</span>
        <span class="meta-val">${booking.time} (${booking.timezone || 'Africa/Cairo'})</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Duration</span>
        <span class="meta-val">${booking.durationMinutes} minutes</span>
      </div>
      ${meetLink ? `
      <div class="meta-row" style="background-color: #e6f4f1; margin: 8px -8px -8px; padding: 10px 8px; border-radius: 8px;">
        <span class="meta-label" style="color: #00796b;">Google Meet</span>
        <span class="meta-val"><a href="${meetLink}" target="_blank" style="color: #00796b; font-weight: bold;">${meetLink}</a></span>
      </div>` : ''}
    </div>

    ${meetLink ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${meetLink}" target="_blank" class="btn btn-meet">Join Google Meet Session</a>
      </div>
    ` : `
      <div class="alert-box">
        <strong>Google Meet Link:</strong> The meeting link is being configured by the expert and will be sent to you prior to the session.
      </div>
    `}

    ${rescheduleUrl ? `
      <div style="margin: 28px 0 16px; border-top: 1px solid #eeeae4; pt: 20px;">
        <p class="p" style="font-size: 13px; color: #637084;">
          Need to reschedule? You can change your appointment time up to ${booking.rescheduleDeadlineHours || 24} hours before the session.
        </p>
        <a href="${rescheduleUrl}" target="_blank" class="btn btn-secondary" style="font-size: 12px; padding: 10px 20px;">
          Manage or Reschedule Booking
        </a>
      </div>
    ` : ''}
  `

  const text = `${isClient ? 'Booking Confirmed!' : 'New Confirmed Booking!'}
Service: ${serviceTitle}
Expert: ${expertName}
Client: ${clientName}
Date: ${booking.date}
Time: ${booking.time} (${booking.timezone || 'Africa/Cairo'})
Duration: ${booking.durationMinutes}m
${meetLink ? `Google Meet Link: ${meetLink}\n` : ''}
${rescheduleUrl ? `Reschedule or manage your booking here: ${rescheduleUrl}\n` : ''}
Reference: ${booking.reference || ''}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Your session on ${booking.date} at ${booking.time} is confirmed.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 2. Meeting Link Updated Email
 */
export function renderMeetLinkUpdatedEmail(params: CommonEmailParams & {
  recipientRole: 'client' | 'expert'
  meetLink: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, meetLink, rescheduleUrl } = params

  const subject = `Updated Google Meet Link: ${serviceTitle} [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1">Meeting Link Updated</h2>
    <p class="p">
      The Google Meet link for your upcoming session has been updated. Please use the new link below to join the call.
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Session</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date &amp; Time</span>
        <span class="meta-val">${booking.date} at ${booking.time} (${booking.timezone || 'Africa/Cairo'})</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Updated Link</span>
        <span class="meta-val"><a href="${meetLink}" target="_blank" style="color: #00796b; font-weight: bold;">${meetLink}</a></span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${meetLink}" target="_blank" class="btn btn-meet">Open Updated Google Meet</a>
    </div>

    ${rescheduleUrl ? `
      <p class="p" style="font-size: 12px; color: #8b94a1; text-align: center;">
        <a href="${rescheduleUrl}" style="color: #14243b; font-weight: 600;">View Booking Details</a>
      </p>
    ` : ''}
  `

  const text = `Updated Google Meet Link:
Session: ${serviceTitle}
Date & Time: ${booking.date} at ${booking.time}
New Meet Link: ${meetLink}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `New Google Meet link updated for your session on ${booking.date}.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 3. Alert to Expert: Missing Google Meet Link
 */
export function renderMissingMeetLinkAlertEmail(params: CommonEmailParams & {
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, dashboardUrl } = params

  const subject = `Action Required: Add Google Meet Link for ${clientName} [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1" style="color: #b83a2c;">Action Required: Missing Google Meet Link</h2>
    <p class="p">
      Hello ${expertName}, your upcoming session with <strong>${clientName}</strong> is scheduled soon, but the <strong>Google Meet link has not been added yet</strong>.
    </p>
    <div class="alert-box">
      <strong>Important:</strong> Automated reminders to the client have been paused because the meeting link is missing. Please add your Google Meet link immediately so the client can receive their joining link.
    </div>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Client</span>
        <span class="meta-val">${clientName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Session</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Scheduled For</span>
        <span class="meta-val">${booking.date} at ${booking.time} (${booking.timezone || 'Africa/Cairo'})</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${dashboardUrl}" target="_blank" class="btn">Add Google Meet Link in Dashboard</a>
    </div>
  `

  const text = `Action Required: Missing Google Meet link for booking ${booking.reference || ''}.
Session with ${clientName} on ${booking.date} at ${booking.time}.
Please open your dashboard to add the Google Meet link: ${dashboardUrl}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Action Required: Add Google Meet link for ${clientName}.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 4. Reminder 1: First Reminder of the Day
 */
export function renderDayOfReminderEmail(params: CommonEmailParams & {
  recipientRole: 'client' | 'expert'
  meetLink: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, meetLink, rescheduleUrl, recipientRole } = params
  const isClient = recipientRole === 'client'

  const subject = `Today's Session: ${serviceTitle} at ${booking.time} [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1">Reminder: Your Session is Today!</h2>
    <p class="p">
      Hello ${isClient ? clientName : expertName}, this is a reminder that your session is scheduled for <strong>today</strong> at <strong>${booking.time}</strong>.
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Session</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">With</span>
        <span class="meta-val">${isClient ? expertName : clientName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Time</span>
        <span class="meta-val">${booking.time} (${booking.timezone || 'Africa/Cairo'})</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Duration</span>
        <span class="meta-val">${booking.durationMinutes} minutes</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Google Meet Link</span>
        <span class="meta-val"><a href="${meetLink}" target="_blank" style="color: #00796b; font-weight: bold;">${meetLink}</a></span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${meetLink}" target="_blank" class="btn btn-meet">Join Google Meet</a>
    </div>

    ${rescheduleUrl ? `
      <p class="p" style="font-size: 12px; color: #8b94a1; text-align: center;">
        <a href="${rescheduleUrl}" style="color: #14243b; font-weight: 600;">View Session &amp; Reschedule Details</a>
      </p>
    ` : ''}
  `

  const text = `Reminder: Your session is today!
Service: ${serviceTitle}
Time: ${booking.time} (${booking.timezone || 'Africa/Cairo'})
Google Meet Link: ${meetLink}
Reference: ${booking.reference || ''}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Your session is today at ${booking.time}. Google Meet link included.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 5. Reminder 2: Before the Session (10-30m)
 */
export function renderBeforeSessionReminderEmail(params: CommonEmailParams & {
  recipientRole: 'client' | 'expert'
  meetLink: string
  minutesBefore: number
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, meetLink, minutesBefore, recipientRole } = params
  const isClient = recipientRole === 'client'

  const subject = `Starting in ${minutesBefore} Minutes: ${serviceTitle} [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1">Starting in ${minutesBefore} Minutes!</h2>
    <p class="p">
      Hello ${isClient ? clientName : expertName}, your session is about to begin. Please click the button below to join the Google Meet room.
    </p>

    <div class="highlight-card" style="border: 2px solid #00796b;">
      <div class="meta-row">
        <span class="meta-label">Session</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Starting At</span>
        <span class="meta-val" style="font-size: 16px; color: #00796b;">${booking.time} (${booking.timezone || 'Africa/Cairo'})</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Joining Link</span>
        <span class="meta-val"><a href="${meetLink}" target="_blank" style="color: #00796b; font-weight: bold;">${meetLink}</a></span>
      </div>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${meetLink}" target="_blank" class="btn btn-meet" style="font-size: 16px; padding: 16px 36px;">
        👉 Join Google Meet Now
      </a>
    </div>
  `

  const text = `Starting in ${minutesBefore} Minutes!
Session: ${serviceTitle}
Time: ${booking.time}
Join Link: ${meetLink}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Starting in ${minutesBefore} minutes: ${serviceTitle}. Join now!`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 6. Reschedule Confirmation Email
 */
export function renderRescheduleConfirmedEmail(params: CommonEmailParams & {
  previousDate: string
  previousTime: string
  changedByRole: 'client' | 'expert' | 'admin'
  meetLink?: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, previousDate, previousTime, changedByRole, meetLink, rescheduleUrl } = params

  const subject = `Session Rescheduled: ${serviceTitle} is now on ${booking.date} at ${booking.time}`

  const contentHtml = `
    <h2 class="h1">Session Rescheduled</h2>
    <p class="p">
      Your session has been successfully rescheduled by the <strong>${changedByRole}</strong>.
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Service</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row" style="opacity: 0.7;">
        <span class="meta-label">Previous Time</span>
        <span class="meta-val"><del>${previousDate} at ${previousTime}</del></span>
      </div>
      <div class="meta-row" style="background-color: #ecfdf5; margin: 8px -8px -8px; padding: 10px 8px; border-radius: 8px;">
        <span class="meta-label" style="color: #065f46;">New Date &amp; Time</span>
        <span class="meta-val" style="color: #065f46; font-size: 15px;">${booking.date} at ${booking.time} (${booking.timezone || 'Africa/Cairo'})</span>
      </div>
      ${meetLink ? `
      <div class="meta-row">
        <span class="meta-label">Google Meet Link</span>
        <span class="meta-val"><a href="${meetLink}" target="_blank" style="color: #00796b; font-weight: bold;">${meetLink}</a></span>
      </div>` : ''}
    </div>

    ${meetLink ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${meetLink}" target="_blank" class="btn btn-meet">Open Google Meet</a>
      </div>
    ` : ''}

    ${rescheduleUrl ? `
      <p class="p" style="font-size: 12px; color: #8b94a1; text-align: center;">
        <a href="${rescheduleUrl}" style="color: #14243b; font-weight: 600;">View Updated Booking Page</a>
      </p>
    ` : ''}
  `

  const text = `Session Rescheduled:
Service: ${serviceTitle}
Previous: ${previousDate} at ${previousTime}
New Time: ${booking.date} at ${booking.time}
${meetLink ? `Google Meet Link: ${meetLink}\n` : ''}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Your session has been rescheduled to ${booking.date} at ${booking.time}.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 7. Post-Session Attendance Prompt Email
 */
export function renderAttendancePromptEmail(params: CommonEmailParams & {
  party: 'client' | 'expert'
  attendanceUrl: string
  reportingWindowHours: number
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, party, attendanceUrl, reportingWindowHours } = params
  const isClient = party === 'client'

  const subject = `Please Confirm: Did your session take place? [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1">Did Your Session Take Place?</h2>
    <p class="p">
      Hello ${isClient ? clientName : expertName}, your scheduled session <strong>${serviceTitle}</strong> has ended.
    </p>
    <p class="p">
      To maintain quality and keep accurate records, please confirm whether the session took place and whether both parties attended.
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Session</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date &amp; Time</span>
        <span class="meta-val">${booking.date} at ${booking.time}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Reporting Window</span>
        <span class="meta-val">Within ${reportingWindowHours} hours</span>
      </div>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${attendanceUrl}" target="_blank" class="btn">Confirm Session Attendance</a>
    </div>

    <p class="p" style="font-size: 12px; color: #8b94a1; text-align: center;">
      If you experienced any issues or the other party was absent, you will be able to report it on the confirmation page.
    </p>
  `

  const text = `Did your session take place?
Session: ${serviceTitle}
Date & Time: ${booking.date} at ${booking.time}
Please confirm attendance within ${reportingWindowHours} hours: ${attendanceUrl}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Please confirm attendance for ${serviceTitle}.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 8. Attendance Dispute Notification to Admin
 */
export function renderAttendanceDisputeAdminEmail(params: CommonEmailParams & {
  expertReport: string
  clientReport: string
  adminDisputeUrl: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, expertReport, clientReport, adminDisputeUrl } = params

  const subject = `[Dispute Alert] Conflicting Attendance for Booking ${booking.reference || booking._id?.toString()}`

  const contentHtml = `
    <h2 class="h1" style="color: #b83a2c;">Attendance Dispute Flagged</h2>
    <p class="p">
      The client and expert submitted conflicting attendance reports for booking <strong>#${booking.reference || booking._id?.toString()}</strong>.
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Service</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Expert (${expertName}) Report</span>
        <span class="meta-val" style="color: #b83a2c; font-weight: bold;">${expertReport}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Client (${clientName}) Report</span>
        <span class="meta-val" style="color: #b83a2c; font-weight: bold;">${clientReport}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Session Date</span>
        <span class="meta-val">${booking.date} at ${booking.time}</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${adminDisputeUrl}" target="_blank" class="btn btn-secondary">Review &amp; Resolve Dispute</a>
    </div>
  `

  const text = `Attendance Dispute Flagged:
Booking: ${booking.reference || ''}
Expert (${expertName}): ${expertReport}
Client (${clientName}): ${clientReport}
Resolve at: ${adminDisputeUrl}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Conflicting attendance reports for booking ${booking.reference || ''}.`,
      contentHtml,
    }),
    text,
  }
}

