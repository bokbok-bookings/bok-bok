import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const GOOGLE_AUTH_STATE_COOKIE = 'bokbok_google_auth_state'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') === 'expert' ? 'expert' : 'client'
  const callbackUrl = searchParams.get('callbackUrl') || ''

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth Client ID or Client Secret missing in environment variables.' },
      { status: 500 }
    )
  }

  // Construct absolute redirect URI dynamically based on current host
  const host = request.headers.get('host') || 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  const redirectUri = `${proto}://${host}/api/auth/google/user-callback`

  const statePayload = JSON.stringify({
    nonce: crypto.randomBytes(16).toString('hex'),
    role,
    callbackUrl,
  })

  const cookieStore = await cookies()
  cookieStore.set(GOOGLE_AUTH_STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: scopes,
    state: Buffer.from(statePayload).toString('base64url'),
    prompt: 'select_account',
  })

  return NextResponse.redirect(authUrl)
}

