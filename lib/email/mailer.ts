import nodemailer, { type Transporter } from 'nodemailer'
import { ObjectId } from 'mongodb'
import { getEmailLogsCollection, type EmailLogDoc } from '@/lib/db'

function createSmtpTransporter(overridePort?: number): Transporter | null {
  const host = process.env.SMTP_HOST
  const port = overridePort ?? (Number(process.env.SMTP_PORT) || 587)
  const secure = overridePort ? overridePort === 465 : process.env.SMTP_SECURE === 'true' || port === 465
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  })
}

function isTransientSmtpError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase()
  const code = String(err?.code || '').toUpperCase()
  return (
    msg.includes('greeting never received') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('socket') ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ESOCKET' ||
    code === 'ECONNREFUSED'
  )
}

export function getTransporter(): Transporter | null {
  return createSmtpTransporter()
}

export interface SendEmailOptions {
  bookingId?: ObjectId | string
  emailType: EmailLogDoc['emailType']
  recipientEmail: string
  recipientName?: string
  recipientRole: 'client' | 'expert' | 'admin'
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  logId?: string
}

/**
 * Sends a transactional email with delivery logging and retry tracking.
 * In development or when SMTP is not configured, logs the email preview to console
 * and records as sent for seamless local testing.
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const emailLogsCol = await getEmailLogsCollection()
  const bookingObjectId = options.bookingId ? new ObjectId(options.bookingId) : undefined

  const fromEmail = process.env.SMTP_FROM || 'Bok Bok <notifications@bokbok.app>'
  const recipient = options.recipientName
    ? `"${options.recipientName}" <${options.recipientEmail}>`
    : options.recipientEmail

  const logDoc: EmailLogDoc = {
    bookingId: bookingObjectId,
    emailType: options.emailType,
    recipientEmail: options.recipientEmail,
    recipientRole: options.recipientRole,
    subject: options.subject,
    status: 'pending',
    attempts: 1,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const insertRes = await emailLogsCol.insertOne(logDoc)
  const logId = insertRes.insertedId

  const transporter = getTransporter()

  if (!transporter) {
    // Development mode / SMTP credentials not provided
    console.log('\n================== [BOK BOK EMAIL PREVIEW] ==================')
    console.log(`Type:    ${options.emailType}`)
    console.log(`To:      ${recipient} (${options.recipientRole})`)
    console.log(`Subject: ${options.subject}`)
    console.log(`Booking: ${options.bookingId || 'N/A'}`)
    console.log('------------------------------------------------------------')
    console.log(options.text || options.subject)
    console.log('============================================================\n')

    await emailLogsCol.updateOne(
      { _id: logId },
      {
        $set: {
          status: 'sent',
          messageId: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      }
    )

    return {
      success: true,
      messageId: `dev-preview-${Date.now()}`,
      logId: logId.toString(),
    }
  }

  const mailPayload = {
    from: fromEmail,
    to: recipient,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    subject: options.subject,
    html: options.html,
    text: options.text,
  }

  try {
    let info
    try {
      info = await transporter.sendMail(mailPayload)
    } catch (primaryErr: any) {
      // Automatic failover: if Port 587 drops/stalls ("Greeting never received" due to ISP/hotspot),
      // retry immediately over Direct SSL/TLS Port 465 (or vice versa) on a fresh socket.
      if (isTransientSmtpError(primaryErr)) {
        const primaryPort = Number(process.env.SMTP_PORT) || 587
        const fallbackPort = primaryPort === 465 ? 587 : 465
        const fallbackTransporter = createSmtpTransporter(fallbackPort)
        if (fallbackTransporter) {
          console.warn(
            `[Nodemailer Fallback] Primary port ${primaryPort} failed (${primaryErr?.message}); retrying on port ${fallbackPort}...`,
          )
          info = await fallbackTransporter.sendMail(mailPayload)
        } else {
          throw primaryErr
        }
      } else {
        throw primaryErr
      }
    }

    await emailLogsCol.updateOne(
      { _id: logId },
      {
        $set: {
          status: 'sent',
          messageId: info.messageId,
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      }
    )

    return {
      success: true,
      messageId: info.messageId,
      logId: logId.toString(),
    }
  } catch (error: any) {
    const errorMsg = error?.message || 'SMTP transmission failure'
    console.error(`[Nodemailer Error] Failed to send email to ${options.recipientEmail}:`, errorMsg)

    // Exponential backoff: 2 minutes for 1st retry, 10 mins for 2nd retry
    const backoffMinutes = 2
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

    await emailLogsCol.updateOne(
      { _id: logId },
      {
        $set: {
          status: 'failed',
          lastError: errorMsg,
          nextRetryAt,
          updatedAt: new Date(),
        },
      }
    )

    return {
      success: false,
      error: errorMsg,
      logId: logId.toString(),
    }
  }
}

/**
 * Background retry handler for failed emails with exponential backoff
 */
export async function processEmailRetries(): Promise<number> {
  const emailLogsCol = await getEmailLogsCollection()
  const now = new Date()

  const pendingRetries = await emailLogsCol
    .find({
      status: 'failed',
      attempts: { $lt: 3 },
      nextRetryAt: { $lte: now },
    })
    .limit(10)
    .toArray()

  let retriedCount = 0

  for (const log of pendingRetries) {
    const transporter = getTransporter()
    if (!transporter) break

    const newAttempts = (log.attempts || 1) + 1
    try {
      const fromEmail = process.env.SMTP_FROM || 'Bok Bok <notifications@bokbok.app>'
      const info = await transporter.sendMail({
        from: fromEmail,
        to: log.recipientEmail,
        subject: log.subject,
        text: `[Retry] ${log.subject}`,
      })

      await emailLogsCol.updateOne(
        { _id: log._id },
        {
          $set: {
            status: 'sent',
            attempts: newAttempts,
            messageId: info.messageId,
            sentAt: new Date(),
            updatedAt: new Date(),
          },
        }
      )
      retriedCount++
    } catch (err: any) {
      const isFinalAttempt = newAttempts >= (log.maxAttempts || 3)
      const nextBackoff = newAttempts === 2 ? 10 * 60 * 1000 : 30 * 60 * 1000
      await emailLogsCol.updateOne(
        { _id: log._id },
        {
          $set: {
            attempts: newAttempts,
            lastError: err.message,
            nextRetryAt: isFinalAttempt ? undefined : new Date(Date.now() + nextBackoff),
            updatedAt: new Date(),
          },
        }
      )
    }
  }

  return retriedCount
}

