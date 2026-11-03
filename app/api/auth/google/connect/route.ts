import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

const OAUTH_STATE_COOKIE = 'bokbok_google_oauth_state'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    const loginUrl = new URL('/login?callbackUrl=%2Fadmin%3Ftab%3Dbookings', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    new URL('/api/auth/google/callback', request.url).toString()

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth Client ID or Client Secret missing in environment variables.' },
      { status: 500 },
    )
  }

  const state = crypto.randomBytes(24).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Ensures offline refresh token is always granted
    scope: scopes,
    state,
  })

  return NextResponse.redirect(authUrl)
}
