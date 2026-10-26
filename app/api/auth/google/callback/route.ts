import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getSettingsCollection } from '@/lib/db'
import { resetCalendarCache } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h2 style="color:red;">Google Authorization Failed</h2>
        <p>${error}</p>
        <a href="/admin">Back to Dashboard</a>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  }

  if (!code) {
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h2 style="color:red;">Missing Authorization Code</h2>
        <a href="/admin">Back to Dashboard</a>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token && !tokens.access_token) {
      throw new Error('No tokens returned from Google')
    }

    const settingsCol = await getSettingsCollection()
    const existing = (await settingsCol.findOne({ key: 'google_calendar_token' } as any)) as any
    const refreshTokenToStore = tokens.refresh_token || existing?.value?.refresh_token

    await settingsCol.updateOne(
      { key: 'google_calendar_token' } as any,
      {
        $set: {
          key: 'google_calendar_token',
          value: {
            refresh_token: refreshTokenToStore,
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            scope: tokens.scope,
            token_type: tokens.token_type,
          },
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    resetCalendarCache()

    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BokBok - Google Calendar Connected</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0b1320; color: #f4f4f5; }
          .card { background: #14243b; border: 1px solid #1f3554; border-radius: 24px; padding: 40px; text-align: center; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .icon { width: 64px; height: 64px; background: rgba(34, 197, 94, 0.15); color: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; }
          h1 { margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #ffffff; }
          p { color: #8b94a1; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
          .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; transition: 0.2s opacity; }
          .btn:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Google Calendar & Meet Connected!</h1>
          <p>BokBok Google Calendar is now linked. When you approve bookings, calendar events with Google Meet links will automatically invite the Client, Expert, and <strong>bokbok.bookings@gmail.com</strong>.</p>
          <a href="/admin" class="btn">Go to Admin Dashboard</a>
        </div>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch (err: any) {
    console.error('Google OAuth callback error:', err)
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h2 style="color:red;">Error Connecting Google Calendar</h2>
        <p>${err.message}</p>
        <a href="/admin">Back to Dashboard</a>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  }
}
