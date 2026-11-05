import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { ObjectId } from 'mongodb'
import { getUsersCollection } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import { renderEmailVerificationEmail } from '@/lib/email/templates'
import { getAppBaseUrl } from '@/lib/email/scheduler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const usersCol = await getUsersCollection()

    let user = null
    if (session?.userId) {
      user = await usersCol.findOne({ _id: new ObjectId(session.userId) })
    }

    if (!user) {
      const body = await request.json().catch(() => ({}))
      if (body.email) {
        user = await usersCol.findOne({ email: String(body.email).toLowerCase().trim() })
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email is already verified.' })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationToken: verificationToken,
          emailVerificationExpiresAt: verificationExpires,
          updatedAt: new Date(),
        },
      }
    )

    const baseUrl = getAppBaseUrl()
    const verificationUrl = `${baseUrl}/api/auth/verify?token=${verificationToken}`
    const emailContent = renderEmailVerificationEmail({
      name: user.displayName || 'friend',
      verificationUrl,
    })

    await sendTransactionalEmail({
      emailType: 'email_verification',
      recipientEmail: user.email,
      recipientName: user.displayName,
      recipientRole: user.role === 'expert' ? 'expert' : 'client',
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    return NextResponse.json({
      success: true,
      message: 'Verification email resent successfully.',
    })
  } catch (err: any) {
    console.error('Resend verification email error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to resend verification email' },
      { status: 500 }
    )
  }
}

