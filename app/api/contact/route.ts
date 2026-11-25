import { NextResponse } from 'next/server'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const CONTACT_RECIPIENT_EMAIL = 'bokbok.bookings@gmail.com'

const TOPIC_LABELS: Record<string, { en: string; ar: string }> = {
  recommendation: { en: 'Recommendation / Suggestion', ar: 'توصية أو اقتراح' },
  opinion: { en: 'Opinion & Platform Feedback', ar: 'رأي وتقييم للمنصة' },
  expert_suggestion: { en: 'Suggest an Expert or Topic', ar: 'اقتراح خبير أو موضوع جديد' },
  support: { en: 'Support & Inquiry', ar: 'دعم واستفسار' },
  other: { en: 'Other', ar: 'أخرى' },
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, 'contact-form', 5, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many messages sent. Please wait a minute and try again.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 },
      )
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : ''
    const topicKey =
      typeof body.topic === 'string' && TOPIC_LABELS[body.topic] ? body.topic : 'recommendation'
    const customSubject =
      typeof body.subject === 'string' ? body.subject.trim().slice(0, 150) : ''
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 3000) : ''

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter your name (at least 2 characters).' },
        { status: 400 },
      )
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    if (message.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a message of at least 10 characters.' },
        { status: 400 },
      )
    }

    const topicLabel = TOPIC_LABELS[topicKey].en
    const subjectLine = customSubject
      ? `[Bok Bok · ${topicLabel}] ${customSubject}`
      : `[Bok Bok · ${topicLabel}] New message from ${name}`

    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone)
    const safeTopic = escapeHtml(topicLabel)
    const safeSubject = escapeHtml(customSubject || '—')
    const safeMessageHtml = escapeHtml(message).replace(/\n/g, '<br/>')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subjectLine)}</title>
</head>
<body style="margin:0;padding:16px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14243b;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;">
    <div style="background:#14243b;padding:24px 28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Bok<span style="color:#FCAD35;">Bok</span></h1>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Contact · Recommendations &amp; Opinions</p>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 14px;font-size:18px;color:#14243b;">New Message Received</h2>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:16px;margin-bottom:20px;font-size:13px;">
        <p style="margin:0 0 8px;"><strong>Category:</strong> ${safeTopic}</p>
        <p style="margin:0 0 8px;"><strong>From:</strong> ${safeName}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:#2855C5;">${safeEmail}</a></p>
        ${safePhone ? `<p style="margin:0 0 8px;"><strong>Phone / WhatsApp:</strong> ${safePhone}</p>` : ''}
        <p style="margin:0;"><strong>Subject:</strong> ${safeSubject}</p>
      </div>
      <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:14px;padding:16px;font-size:14px;line-height:1.65;color:#1e293b;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Message</p>
        <div>${safeMessageHtml}</div>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#64748b;">
        Reply directly to this email to respond to <strong>${safeName}</strong> (${safeEmail}).
      </p>
    </div>
  </div>
</body>
</html>`

    const text = `New Bok Bok Contact / Recommendation Message

Category: ${topicLabel}
From: ${name}
Email: ${email}
${phone ? `Phone: ${phone}\n` : ''}Subject: ${customSubject || '—'}

Message:
${message}`

    const result = await sendTransactionalEmail({
      emailType: 'contact_message',
      recipientEmail: CONTACT_RECIPIENT_EMAIL,
      recipientName: 'Bok Bok Team',
      recipientRole: 'admin',
      replyTo: email,
      subject: subjectLine,
      html,
      text,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'We could not send your message right now. Please try again shortly or email bokbok.bookings@gmail.com directly.',
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your message has been sent to the Bok Bok team.',
    })
  } catch (error: any) {
    console.error('[Contact API Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message' },
      { status: 500 },
    )
  }
}
