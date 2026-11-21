import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUsersCollection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Password reset token is missing' },
        { status: 400 }
      )
    }

    const usersCol = await getUsersCollection()
    const user = await usersCol.findOne({ resetPasswordToken: token })

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'This password reset link is invalid or has already been used.' },
        { status: 400 }
      )
    }

    if (user.resetPasswordExpiresAt && new Date() > user.resetPasswordExpiresAt) {
      return NextResponse.json(
        { valid: false, error: 'This password reset link has expired. Please request a new one.' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
    })
  } catch (err: any) {
    console.error('Reset token validation error:', err)
    return NextResponse.json(
      { valid: false, error: 'An unexpected error occurred while verifying the reset link.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token, password } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password reset token is missing' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const usersCol = await getUsersCollection()
    const user = await usersCol.findOne({ resetPasswordToken: token })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'This password reset link is invalid or has already been used.' },
        { status: 400 }
      )
    }

    if (user.resetPasswordExpiresAt && new Date() > user.resetPasswordExpiresAt) {
      return NextResponse.json(
        { success: false, error: 'This password reset link has expired. Please request a new one.' },
        { status: 410 }
      )
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
        $unset: {
          resetPasswordToken: '',
          resetPasswordExpiresAt: '',
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    })
  } catch (err: any) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while resetting your password.' },
      { status: 500 }
    )
  }
}
