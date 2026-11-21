import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { ObjectId } from 'mongodb'
import { getUsersCollection, getExpertsCollection } from '@/lib/db'
import { createSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

const GOOGLE_AUTH_STATE_COOKIE = 'bokbok_google_auth_state'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8')
  const bufB = Buffer.from(b, 'utf-8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function getSafeRedirectUrl(targetUrl: string | undefined | null, defaultFallback: string): string {
  if (!targetUrl || typeof targetUrl !== 'string') return defaultFallback
  const trimmed = targetUrl.trim()
  // Must be an internal relative path starting with single '/', not protocol-relative '//', and without backslashes or scheme
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\') && !trimmed.includes(':') && !/[\r\n\t]/.test(trimmed)) {
    return trimmed
  }
  return defaultFallback
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawState = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const savedStateRaw = cookieStore.get(GOOGLE_AUTH_STATE_COOKIE)?.value
  cookieStore.delete(GOOGLE_AUTH_STATE_COOKIE)

  if (error || !code) {
    console.error('Google user auth error:', error)
    return NextResponse.redirect(new URL('/login?error=Google+sign-in+was+cancelled', request.url))
  }

  // Verify OAuth CSRF state against the HttpOnly cookie set during /api/auth/google/signin
  if (!rawState || !savedStateRaw) {
    console.warn('Google OAuth CSRF state missing:', { hasQueryState: Boolean(rawState), hasCookieState: Boolean(savedStateRaw) })
    return NextResponse.redirect(
      new URL('/login?error=Invalid+or+expired+sign-in+session.+Please+try+again.', request.url)
    )
  }

  let role: 'expert' | 'client' = 'client'
  let callbackUrl = ''

  try {
    const decodedStateStr = Buffer.from(rawState, 'base64url').toString('utf-8')
    if (!safeEqual(decodedStateStr, savedStateRaw)) {
      console.warn('Google OAuth CSRF state mismatch')
      return NextResponse.redirect(
        new URL('/login?error=Invalid+sign-in+state.+Please+try+again.', request.url)
      )
    }

    const decodedState = JSON.parse(decodedStateStr)
    if (!decodedState || typeof decodedState.nonce !== 'string' || decodedState.nonce.length < 16) {
      return NextResponse.redirect(
        new URL('/login?error=Invalid+sign-in+state.+Please+try+again.', request.url)
      )
    }
    if (decodedState.role === 'expert') role = 'expert'
    if (decodedState.callbackUrl) callbackUrl = decodedState.callbackUrl
  } catch (err) {
    console.warn('Could not verify Google OAuth state:', err)
    return NextResponse.redirect(
      new URL('/login?error=Invalid+sign-in+state.+Please+try+again.', request.url)
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const host = request.headers.get('host') || 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  const redirectUri = `${proto}://${host}/api/auth/google/user-callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=Google+OAuth+not+configured', request.url))
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: profile } = await oauth2.userinfo.get()

    if (!profile || !profile.email) {
      return NextResponse.redirect(new URL('/login?error=Unable+to+retrieve+email+from+Google', request.url))
    }

    const email = profile.email.toLowerCase().trim()
    const givenName = (profile.given_name || '').trim()
    const familyName = (profile.family_name || '').trim()
    const name = profile.name || `${givenName} ${familyName}`.trim() || email.split('@')[0]
    const fName = givenName || name.split(/\s+/)[0] || ''
    const lName = familyName || name.split(/\s+/).slice(1).join(' ') || ''
    const picture = profile.picture || ''

    const usersCol = await getUsersCollection()
    const expertsCol = await getExpertsCollection()

    let user = await usersCol.findOne({ email })

    if (!user) {
      // New User creation
      const userId = new ObjectId()
      let expertId: ObjectId | undefined = undefined

      if (role === 'expert') {
        expertId = new ObjectId()
        const slugSource = fName && lName ? `${fName}-${lName}` : name
        const baseSlug = slugSource
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') || `expert-${Date.now().toString(36)}`

        let finalSlug = baseSlug
        const existingSlug = await expertsCol.findOne({ slug: finalSlug })
        if (existingSlug) {
          finalSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`
        }

        await expertsCol.insertOne({
          _id: expertId,
          id: expertId.toString(),
          userId: userId,
          accountType: 'expert',
          fName,
          lName,
          name: name,
          slug: finalSlug,
          role: 'Consultant',
          location: 'Cairo, Egypt',
          image: picture || '',
          avatarUrl: picture || '',
          rating: '',
          reviews: 0,
          price: '500 EGP',
          priceNumber: 500,
          tags: [],
          durationMinutes: 30,
          about: '',
          bio: '',
          status: 'draft',
          preferredPayoutMethod: 'instapay',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      await usersCol.insertOne({
        _id: userId,
        email,
        passwordHash: '', // Google OAuth user
        displayName: name,
        fName,
        lName,
        accountType: role === 'expert' ? 'expert' : undefined,
        role,
        expertId,
        status: 'active',
        emailVerified: true, // Automatically verified via Google
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      })

      await createSession({
        id: userId.toString(),
        email,
        displayName: name,
        role,
        expertId: expertId?.toString(),
      })

      // If expert, always go to onboarding for ID & profile setup
      if (role === 'expert') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      const target = getSafeRedirectUrl(callbackUrl, '/')
      return NextResponse.redirect(new URL(target, request.url))
    } else {
      // Existing User login
      await usersCol.updateOne(
        { _id: user._id },
        {
          $set: {
            emailVerified: true,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          },
        }
      )

      await createSession({
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName || name,
        role: user.role,
        expertId: user.expertId?.toString(),
      })

      // If expert has draft or pending status, check if onboarding is needed
      if (user.role === 'expert' && user.expertId) {
        const expertDoc = await expertsCol.findOne({ _id: user.expertId })
        const hasDocs =
          expertDoc?.accountType === 'organization'
            ? Boolean(expertDoc?.commercialRegisterUrl || expertDoc?.commercialRegisterNumber)
            : Boolean(expertDoc?.nationalIdFrontUrl)
        if (expertDoc && (expertDoc.status === 'draft' || !hasDocs)) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
        const safeTarget = getSafeRedirectUrl(callbackUrl, '/dashboard')
        return NextResponse.redirect(new URL(safeTarget, request.url))
      }

      const defaultRedirect = user.role === 'admin' ? '/admin' : user.role === 'client' ? '/account' : '/dashboard'
      const target = getSafeRedirectUrl(callbackUrl, defaultRedirect)
      return NextResponse.redirect(new URL(target, request.url))
    }
  } catch (err: any) {
    console.error('Google user authentication callback error:', err)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`, request.url))
  }
}

