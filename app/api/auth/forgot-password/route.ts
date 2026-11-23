import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUsersCollection } from '@/lib/db'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import { renderPasswordResetEmail } from '@/lib/email/templates'
import { getAppBaseUrl } from '@/lib/email/scheduler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawEmail = body.email

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const email = rawEmail.trim().toLowerCase()
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const usersCol = await getUsersCollection()
    const user = await usersCol.findOne({
      $or: [
        { email },
        { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
      ],
    })

    // Generic response to avoid revealing user registration status (security best practice)
    const genericSuccessResponse = {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    }

    if (!user) {
      return NextResponse.json(genericSuccessResponse)
    }

    // Generate cryptographically secure token & 1 hour expiry
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpiresAt: resetExpires,
          updatedAt: new Date(),
        },
      }
    )

    const baseUrl = getAppBaseUrl()
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`
    const emailContent = renderPasswordResetEmail({
      name: user.displayName || user.fName || 'there',
      resetUrl,
    })

    await sendTransactionalEmail({
      emailType: 'password_reset',
      recipientEmail: user.email,
      recipientName: user.displayName,
      recipientRole: user.role === 'expert' ? 'expert' : 'client',
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    return NextResponse.json(genericSuccessResponse)
  } catch (err: any) {
    console.error('Forgot password error:', err)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
