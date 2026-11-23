import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUsersCollection } from '@/lib/db'
import { createSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawEmail = body.email || body.username
    const password = body.password

    if (!rawEmail || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const email = String(rawEmail).trim().toLowerCase()
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne({
      $or: [
        { email },
        { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
      ],
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if account was registered via Google without a password
    if (!user.passwordHash || user.passwordHash.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          isGoogleAccount: true,
          error:
            'This account was registered using Google. Please sign in with Google, or click "Forgot password?" to set a password for email login.',
          errorAr:
            'تم تسجيل هذا الحساب باستخدام Google. يرجى تسجيل الدخول عبر Google أو استخدام "نسيت كلمة المرور؟" لتعيين كلمة مرور.',
        },
        { status: 400 }
      )
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update lastLoginAt, normalize email if needed, and update authProvider
    const loginUpdates: any = {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    }
    if (user.email !== email) {
      loginUpdates.email = email
    }
    if (!user.authProvider) {
      loginUpdates.authProvider = user.googleId ? 'both' : 'local'
    }

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: loginUpdates }
    )

    // Create JWT Session (valid for 30 days)
    await createSession({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      role: user.role,
      expertId: user.expertId?.toString(),
    })

    let redirectTo = '/dashboard'
    if (user.role === 'admin') {
      redirectTo = '/admin'
    } else if (user.role === 'client') {
      redirectTo = '/account'
    }

    return NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        expertId: user.expertId?.toString(),
      },
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
