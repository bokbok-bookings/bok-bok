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
 * 0. Email Verification on Signup
 */
export function renderEmailVerificationEmail(params: {
  name: string
  verificationUrl: string
}): { subject: string; html: string; text: string } {
  const { name, verificationUrl } = params
  const subject = 'Verify your email address - Bok Bok'

  const contentHtml = `
    <h2 class="h1">Welcome to Bok Bok!</h2>
    <p class="p">
      Hello ${name}, thank you for creating your Bok Bok account. Please verify your email address to confirm your registration and activate your account.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" target="_blank" class="btn">Verify Email Address</a>
    </div>

    <div class="alert-box">
      <strong>Security notice:</strong> This verification link will expire in 24 hours. If you did not create a Bok Bok account, you can safely ignore this email.
    </div>

    <p class="p" style="font-size: 12px; color: #8b94a1; word-break: break-all;">
      If the button above does not work, copy and paste this link into your browser:<br/>
      <a href="${verificationUrl}" style="color: #142D4E;">${verificationUrl}</a>
    </p>
  `

  const text = `Welcome to Bok Bok!
Hello ${name},

Please verify your email address by visiting this link:
${verificationUrl}

This link is valid for 24 hours. If you didn't create an account, you can ignore this message.`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: 'Please verify your email address for Bok Bok.',
      contentHtml,
    }),
    text,
  }
}

/**
 * 0.1. Password Reset Request Email
 */
export function renderPasswordResetEmail(params: {
  name: string
  resetUrl: string
}): { subject: string; html: string; text: string } {
  const { name, resetUrl } = params
  const subject = 'Reset your password - Bok Bok'

  const contentHtml = `
    <h2 class="h1">Reset Your Password</h2>
    <p class="p">
      Hello ${name}, we received a request to reset your password for your Bok Bok account. Click the button below to choose a new password.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" target="_blank" class="btn">Reset Password</a>
    </div>

    <div class="alert-box">
      <strong>Important:</strong> This password reset link is valid for 1 hour. If you did not request this password reset, please ignore this email or contact support if you have concerns. Your password will remain unchanged until you access the link above and create a new one.
    </div>

    <p class="p" style="font-size: 12px; color: #8b94a1; word-break: break-all;">
      If the button above does not work, copy and paste this link into your browser:<br/>
      <a href="${resetUrl}" style="color: #142D4E;">${resetUrl}</a>
    </p>
  `

  const text = `Reset Your Password - Bok Bok
Hello ${name},

We received a request to reset your password for your Bok Bok account.

To reset your password, visit the following link:
${resetUrl}

This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: 'Reset your password for Bok Bok.',
      contentHtml,
    }),
    text,
  }
}

/**
 * 0.2. Event Registration Request Received Email (to Registrant)
 */
export function renderEventRegistrationReceivedEmail(params: {
  booking: BookingDoc
  expertName: string
  clientName: string
  serviceTitle: string
  isFree: boolean
  bookingUrl: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, isFree, bookingUrl } = params
  const subject = `Registration Request Received: ${serviceTitle} [${booking.reference || 'EV'}]`

  const contentHtml = `
    <h2 class="h1">We Received Your Registration Request!</h2>
    <p class="p">
      Hello ${clientName}, your spot for <strong>${serviceTitle}</strong> with <strong>${expertName}</strong> is currently reserved pending ${isFree ? 'host/admin approval' : 'payment verification'}.
    </p>

    <div class="highlight-card">
      <div class="meta-row"><span class="meta-label">Reference</span><span class="meta-val">${booking.reference || 'EV'}</span></div>
      <div class="meta-row"><span class="meta-label">Event</span><span class="meta-val">${serviceTitle}</span></div>
      <div class="meta-row"><span class="meta-label">Date</span><span class="meta-val">${booking.date}</span></div>
      <div class="meta-row"><span class="meta-label">Time</span><span class="meta-val">${booking.time} (${booking.timezone || 'Africa/Cairo'})</span></div>
      <div class="meta-row"><span class="meta-label">Fee</span><span class="meta-val">${isFree ? 'Free' : `${booking.amount} ${booking.currency || 'EGP'}`}</span></div>
    </div>

    <div class="alert-box">
      <strong>What happens next?</strong> Once your registration is approved, we will send you a confirmation email with your session access details.
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${bookingUrl}" target="_blank" class="btn">View Registration Status</a>
    </div>
  `

  const text = `Registration Request Received - Bok Bok
Hello ${clientName},

Your registration request for "${serviceTitle}" with ${expertName} (${booking.date} at ${booking.time}) has been received.
Reference: ${booking.reference || 'EV'}
Status: Pending ${isFree ? 'host/admin approval' : 'payment verification'}

View status: ${bookingUrl}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Your registration request for ${serviceTitle} has been received.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 0.3. Event Waitlist / Notify-Me Confirmation Email (to Registrant)
 */
export function renderEventWaitlistJoinedEmail(params: {
  clientName: string
  expertName: string
  serviceTitle: string
  date?: string
  isComingSoon?: boolean
  eventUrl: string
}): { subject: string; html: string; text: string } {
  const { clientName, expertName, serviceTitle, date, isComingSoon, eventUrl } = params
  const subject = isComingSoon
    ? `You're on the Early-Access List: ${serviceTitle}`
    : `You're on the Waitlist: ${serviceTitle}`

  const contentHtml = `
    <h2 class="h1">${isComingSoon ? "You're on the Notification List!" : "You're on the Waitlist!"}</h2>
    <p class="p">
      Hello ${clientName}, thank you for your interest in <strong>${serviceTitle}</strong> with <strong>${expertName}</strong>${date ? ` (${date})` : ''}.
    </p>
    <div class="alert-box">
      ${isComingSoon
      ? 'This event is currently marked as <strong>Coming Soon</strong>. We will notify you as soon as registration opens!'
      : 'This event is currently at full capacity. If a seat opens up or additional spots are added, you will be notified by email.'
    }
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${eventUrl}" target="_blank" class="btn">View Event Details</a>
    </div>
  `

  const text = `${subject}
Hello ${clientName},

${isComingSoon
      ? `We've added you to the early notification list for "${serviceTitle}" with ${expertName}.`
      : `We've added you to the waitlist for "${serviceTitle}" with ${expertName}. We'll email you if a spot opens up.`
    }

Event page: ${eventUrl}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: subject,
      contentHtml,
    }),
    text,
  }
}

/**
 * 0.4. Waitlist Promoted to Confirmed Seat Email
 */
export function renderEventWaitlistPromotedEmail(params: {
  booking: BookingDoc
  expertName: string
  clientName: string
  serviceTitle: string
  bookingUrl: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, bookingUrl } = params
  const subject = `Good News! Your Seat is Confirmed: ${serviceTitle} [${booking.reference || 'EV'}]`

  const contentHtml = `
    <h2 class="h1">A Seat Opened Up — You're In!</h2>
    <p class="p">
      Hello ${clientName}, great news! You have been promoted from the waitlist and your seat for <strong>${serviceTitle}</strong> with <strong>${expertName}</strong> is now <strong>confirmed</strong>.
    </p>

    <div class="highlight-card">
      <div class="meta-row"><span class="meta-label">Reference</span><span class="meta-val">${booking.reference || 'EV'}</span></div>
      <div class="meta-row"><span class="meta-label">Date</span><span class="meta-val">${booking.date}</span></div>
      <div class="meta-row"><span class="meta-label">Time</span><span class="meta-val">${booking.time} (${booking.timezone || 'Africa/Cairo'})</span></div>
    </div>

    <div class="success-box">
      Your joining link will unlock automatically 15 minutes before the session starts on your booking page and in your Bok Bok account.
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${bookingUrl}" target="_blank" class="btn">Open Your Booking Hub</a>
    </div>
  `

  const text = `Good News! Your Seat is Confirmed - Bok Bok
Hello ${clientName},

You have been promoted from the waitlist for "${serviceTitle}" with ${expertName} (${booking.date} at ${booking.time}).
Reference: ${booking.reference || 'EV'}

Open your booking hub: ${bookingUrl}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `You have been promoted from the waitlist for ${serviceTitle}!`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 0.5. Booking Received (Awaiting Verification) Email
 */
export function renderBookingReceivedEmail(params: {
  booking: BookingDoc
  expertName: string
  clientName: string
  serviceTitle: string
  recipientRole: 'client' | 'expert' | 'admin'
  bookingUrl?: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, recipientRole, bookingUrl } = params
  const isClient = recipientRole === 'client'
  const isAdmin = recipientRole === 'admin'

  const subject = isClient
    ? `Booking Request Received: ${serviceTitle} with ${expertName} [${booking.reference || 'BK'}]`
    : isAdmin
      ? `New Booking Received [Awaiting Verification]: ${booking.reference || 'BK'} - ${clientName}`
      : `New Consultation Booked: ${serviceTitle} with ${clientName} [${booking.reference || 'BK'}]`

  const hasHttpsReceipt =
    isAdmin &&
    typeof booking.paymentReceiptUrl === 'string' &&
    booking.paymentReceiptUrl.startsWith('https://')

  const contentHtml = `
    <h2 class="h1">${isClient
      ? 'We Received Your Booking Request!'
      : isAdmin
        ? 'New Booking Awaiting Payment Verification'
        : 'New Booking Received'
    }</h2>
    <p class="p">
      ${isClient
      ? `Hello ${clientName}, thank you for booking a session with <strong>${expertName}</strong>. Our team is currently verifying your payment. Once approved, you will receive full confirmation with your Google Meet link.`
      : isAdmin
        ? `A new booking has been placed by <strong>${clientName}</strong> for <strong>${expertName}</strong> and requires payment verification.`
        : `Hello ${expertName}, client <strong>${clientName}</strong> has submitted a booking request for your service. We are verifying the payment and will confirm the session shortly.`
    }
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Reference</span>
        <span class="meta-val">#${booking.reference || booking._id?.toString()}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Service</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Expert</span>
        <span class="meta-val">${expertName}</span>
      </div>
      ${isAdmin ? `
      <div class="meta-row">
        <span class="meta-label">Client</span>
        <span class="meta-val">${clientName}</span>
      </div>
      ${booking.clientEmail ? `
      <div class="meta-row">
        <span class="meta-label">Client Email</span>
        <span class="meta-val">${booking.clientEmail}</span>
      </div>` : ''}
      ${booking.clientPhone ? `
      <div class="meta-row">
        <span class="meta-label">Client Phone</span>
        <span class="meta-val">${booking.clientPhone}</span>
      </div>` : ''}
      <div class="meta-row">
        <span class="meta-label">Amount</span>
        <span class="meta-val">${booking.amount ?? 0} ${booking.currency || 'EGP'}</span>
      </div>
      ${hasHttpsReceipt ? `
      <div class="meta-row">
        <span class="meta-label">InstaPay Receipt</span>
        <span class="meta-val"><a href="${booking.paymentReceiptUrl}" target="_blank" style="color: #142D4E;">View Receipt ↗</a></span>
      </div>` : ''}
      ` : ''}
      <div class="meta-row">
        <span class="meta-label">Date &amp; Time</span>
        <span class="meta-val">${booking.date} at ${booking.time} (Cairo Time)</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Duration</span>
        <span class="meta-val">${booking.durationMinutes} minutes</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Status</span>
        <span class="meta-val" style="color: #FCAD35;">Awaiting Verification</span>
      </div>
    </div>

    ${bookingUrl
      ? `<div style="text-align: center; margin: 24px 0;">
            <a href="${bookingUrl}" target="_blank" class="btn">${isAdmin ? 'Review & Verify Booking' : 'View Booking Details'}</a>
          </div>`
      : ''
    }
  `

  const adminTextLines = isAdmin
    ? [
      booking.clientEmail ? `Client Email: ${booking.clientEmail}` : '',
      booking.clientPhone ? `Client Phone: ${booking.clientPhone}` : '',
      `Amount: ${booking.amount ?? 0} ${booking.currency || 'EGP'}`,
      hasHttpsReceipt ? `InstaPay Receipt: ${booking.paymentReceiptUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    : ''

  const text = `${subject}
Service: ${serviceTitle}
Expert: ${expertName}
Client: ${clientName}
${adminTextLines ? `${adminTextLines}\n` : ''}Date & Time: ${booking.date} at ${booking.time}
Status: Awaiting Verification
${bookingUrl ? `${isAdmin ? 'Review & Verify Booking' : 'View details'}: ${bookingUrl}` : ''}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Booking ${booking.reference || 'BK'} received and awaiting verification.`,
      contentHtml,
    }),
    text,
  }
}

/**
 * 1. Booking Confirmation Email
 */
export function renderBookingConfirmationEmail(params: CommonEmailParams & {
  recipientRole: 'client' | 'expert'
  meetLink?: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, rescheduleUrl, recipientRole } = params
  const isClient = recipientRole === 'client'

  const subject = isClient
    ? `Booking Confirmed: ${serviceTitle} with ${expertName} [${booking.reference || 'BK'}]`
    : `New Confirmed Session: ${serviceTitle} with ${clientName} [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1">${isClient ? 'Your Consultation is Confirmed!' : 'You Have a Confirmed Session!'}</h2>
    <p class="p">
      ${isClient
      ? `Hello ${clientName}, your appointment with <strong>${expertName}</strong> has been confirmed. Below are your session details.`
      : `Hello ${expertName}, a new session with client <strong>${clientName}</strong> has been confirmed.`}
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Reference</span>
        <span class="meta-val">#${booking.reference || booking._id?.toString() || '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Service</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">${isClient ? 'Expert' : 'Client'}</span>
        <span class="meta-val">${isClient ? expertName : clientName}</span>
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
      <div class="meta-row">
        <span class="meta-label">Format</span>
        <span class="meta-val">Online (Google Meet)</span>
      </div>
    </div>

    <div style="background-color: #FFF6D9; border: 1px solid #FCAD35; border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
      <div style="font-weight: 700; color: #142D4E; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        <span>📹</span>
        <span>Where to Find Your Meeting Link</span>
      </div>
      <p style="margin: 0; font-size: 13px; color: #4a5568; line-height: 1.5;">
        Your Google Meet joining link will be provided on your <strong>Booking Page</strong> (unlocked <strong>15 minutes before the session starts</strong>) and emailed to you in a reminder at <strong>10:00 AM on your session day</strong> and again <strong>15 minutes before start</strong>.
      </p>
    </div>

    ${rescheduleUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${rescheduleUrl}" target="_blank" class="btn">
          Open Booking Page
        </a>
        <p style="margin: 10px 0 0; font-size: 11px; color: #8b94a1; word-break: break-all;">
          Booking Link: <a href="${rescheduleUrl}" target="_blank" style="color: #142D4E;">${rescheduleUrl}</a>
        </p>
      </div>
      <div style="margin: 20px 0 8px; border-top: 1px solid #eeeae4; padding-top: 16px;">
        <p class="p" style="font-size: 12px; color: #637084; margin: 0;">
          ${isClient
        ? `Need to reschedule? You can manage your appointment or change your time up to ${booking.rescheduleDeadlineHours || 24} hours before the session via your booking page above.`
        : `You can view full session details and access the meeting room 15 minutes before start using the booking page link above.`}
        </p>
      </div>
    ` : ''}
  `

  const text = `${isClient ? 'Booking Confirmed!' : 'New Confirmed Booking!'}
Service: ${serviceTitle}
${isClient ? `Expert: ${expertName}` : `Client: ${clientName}`}
Date: ${booking.date}
Time: ${booking.time} (${booking.timezone || 'Africa/Cairo'})
Duration: ${booking.durationMinutes}m
Format: Online (Google Meet)

Where to Find Your Meeting Link: Your Google Meet joining link will be provided on your Booking Page (unlocked 15 minutes before the session starts) and emailed to you 15 minutes before the session starts.
${rescheduleUrl ? `\nBooking Page (with access token): ${rescheduleUrl}` : ''}
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
  meetLink?: string
}): { subject: string; html: string; text: string } {
  const { booking, expertName, clientName, serviceTitle, rescheduleUrl, recipientRole } = params
  const isClient = recipientRole === 'client'

  const subject = `Today's Session: ${serviceTitle} at ${booking.time} [${booking.reference || 'BK'}]`

  const contentHtml = `
    <h2 class="h1">Reminder: Your Session is Today!</h2>
    <p class="p">
      Hello ${isClient ? clientName : expertName}, this is a reminder that your session is scheduled for <strong>today</strong> at <strong>${booking.time}</strong>.
    </p>

    <div class="highlight-card">
      <div class="meta-row">
        <span class="meta-label">Reference</span>
        <span class="meta-val">#${booking.reference || booking._id?.toString() || '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Session</span>
        <span class="meta-val">${serviceTitle}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">${isClient ? 'Expert' : 'Client'}</span>
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
        <span class="meta-label">Format</span>
        <span class="meta-val">Online (Google Meet)</span>
      </div>
    </div>

    <div style="background-color: #FFF6D9; border: 1px solid #FCAD35; border-radius: 12px; padding: 16px 20px; margin: 24px 0;">
      <div style="font-weight: 700; color: #142D4E; margin-bottom: 6px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        <span>📹</span>
        <span>Meeting Link Provided on Your Booking Page</span>
      </div>
      <p style="margin: 0; font-size: 13px; color: #4a5568; line-height: 1.5;">
        Your Google Meet joining link will be provided directly on your <strong>Booking Page</strong> below — it unlocks automatically <strong>15 minutes before the session starts</strong>. We will also send you a final reminder email 15 minutes before start.
      </p>
    </div>

    ${rescheduleUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${rescheduleUrl}" target="_blank" class="btn">
          Open Booking Page
        </a>
        <p style="margin: 10px 0 0; font-size: 11px; color: #8b94a1; word-break: break-all;">
          Booking Page Link: <a href="${rescheduleUrl}" target="_blank" style="color: #142D4E;">${rescheduleUrl}</a>
        </p>
      </div>
    ` : ''}
  `

  const text = `Reminder: Your session is today!
Service: ${serviceTitle}
${isClient ? `Expert: ${expertName}` : `Client: ${clientName}`}
Time: ${booking.time} (${booking.timezone || 'Africa/Cairo'})
Duration: ${booking.durationMinutes}m
Format: Online (Google Meet)

Google Meet Link: Your meeting link will be provided on your Booking Page below (unlocking 15 minutes before the session starts) and emailed to you 15 minutes before start.
${rescheduleUrl ? `\nBooking Page (meeting link will be provided here): ${rescheduleUrl}` : ''}
Reference: ${booking.reference || ''}`

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: `Your session is today at ${booking.time}. Joining link will be emailed 15 minutes before start.`,
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

