import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { getSettingsCollection } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import {
  resetCalendarCache,
  syncMissingMeetLinksForConfirmedBookings,
} from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

const OAUTH_STATE_COOKIE = 'bokbok_google_oauth_state'

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderHtmlPage(params: {
  title: string
  heading: string
  bodyHtml: string
  isError?: boolean
}) {
  const accentBg = params.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'
  const accentColor = params.isError ? '#ef4444' : '#22c55e'
  const iconChar = params.isError ? '✕' : '✓'

  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(params.title)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b1320; color: #f4f4f5; padding: 20px; box-sizing: border-box; }
        .card { background: #14243b; border: 1px solid #1f3554; border-radius: 24px; padding: 40px; text-align: center; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .icon { width: 64px; height: 64px; background: ${accentBg}; color: ${accentColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 30px; font-weight: 700; }
        h1 { margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #ffffff; }
        p { color: #9aa5b4; font-size: 14px; line-height: 1.6; margin: 0 0 18px; }
        .sync-box { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #6ee7b7; border-radius: 14px; padding: 12px 16px; font-size: 13px; margin-bottom: 22px; }
        .note-box { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); color: #fcd34d; border-radius: 14px; padding: 12px 16px; font-size: 12px; margin-bottom: 22px; text-align: left; }
        .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; }
        .btn:hover { opacity: 0.92; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${iconChar}</div>
        <h1>${escapeHtml(params.heading)}</h1>
        ${params.bodyHtml}
        <a href="/admin/bookings" class="btn">Back to Admin Bookings</a>
      </div>
    </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    },
  )
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    const loginUrl = new URL('/login?callbackUrl=%2Fadmin%3Ftab%3Dbookings', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const returnedState = searchParams.get('state')

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(OAUTH_STATE_COOKIE)

  if (error) {
    return renderHtmlPage({
      title: 'BokBok - Google Authorization Failed',
      heading: 'Google Authorization Failed',
      bodyHtml: `<p>${escapeHtml(error)}</p>`,
      isError: true,
    })
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return renderHtmlPage({
      title: 'BokBok - Invalid OAuth State',
      heading: 'Security Check Failed (Invalid State)',
      bodyHtml: `<p>Please start the Google Calendar connection again from the Admin Bookings panel.</p>`,
      isError: true,
    })
  }

  if (!code) {
    return renderHtmlPage({
      title: 'BokBok - Missing Authorization Code',
      heading: 'Missing Authorization Code',
      bodyHtml: `<p>Google did not return an authorization code. Please try reconnecting.</p>`,
      isError: true,
    })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    new URL('/api/auth/google/callback', request.url).toString()

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

    // Automatically generate Google Meet links for any confirmed upcoming/today bookings missing a Meet link
    let syncSummaryHtml = ''
    try {
      const syncResult = await syncMissingMeetLinksForConfirmedBookings()
      if (syncResult.syncedCount > 0) {
        const refs = syncResult.syncedReferences.map(escapeHtml).join(', ')
        syncSummaryHtml = `<div class="sync-box">Automatically generated Google Meet links for <strong>${syncResult.syncedCount}</strong> confirmed booking(s): <strong>${refs}</strong>.</div>`
      }
    } catch (syncErr: any) {
      console.error('[Google OAuth Callback] Auto-sync warning:', syncErr?.message)
    }

    return renderHtmlPage({
      title: 'BokBok - Google Calendar Connected',
      heading: 'Google Calendar & Meet Connected!',
      bodyHtml: `
        <p>BokBok Google Calendar is now linked. Confirmed bookings automatically create a Google Meet link and invite the Client, Expert, and central BokBok calendar.</p>
        ${syncSummaryHtml}
        <div class="note-box">
          <strong>Tip to prevent 7-day token expiry:</strong> In Google Cloud Console → <em>APIs &amp; Services → OAuth consent screen</em>, set Publishing status to <strong>In production</strong> so Google does not expire the refresh token after 7 days.
        </div>
      `,
    })
  } catch (err: any) {
    console.error('[Google OAuth Callback] Failed to exchange code:', err?.message)
    return renderHtmlPage({
      title: 'BokBok - Error Connecting Google Calendar',
      heading: 'Error Connecting Google Calendar',
      bodyHtml: `<p>${escapeHtml(err?.message || 'Unexpected OAuth error')}</p>`,
      isError: true,
    })
  }
}
