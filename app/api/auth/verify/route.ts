import { NextResponse } from 'next/server'
import { getUsersCollection } from '@/lib/db'
import { getAppBaseUrl } from '@/lib/email/scheduler'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return new NextResponse(renderHtmlPage('Invalid Link', 'Verification token is missing.', false), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const usersCol = await getUsersCollection()
    const user = await usersCol.findOne({ emailVerificationToken: token })

    if (!user) {
      return new NextResponse(
        renderHtmlPage(
          'Invalid or Expired Link',
          'This email verification link is invalid or has already been used.',
          false
        ),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    if (user.emailVerificationExpiresAt && new Date() > user.emailVerificationExpiresAt) {
      return new NextResponse(
        renderHtmlPage(
          'Link Expired',
          'This verification link has expired. Please sign in to request a new verification link.',
          false
        ),
        { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // Mark as verified
    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date(),
        },
        $unset: {
          emailVerificationToken: '',
          emailVerificationExpiresAt: '',
        },
      }
    )

    const baseUrl = getAppBaseUrl()
    const redirectUrl = user.role === 'expert' ? `${baseUrl}/onboarding` : `${baseUrl}/dashboard`

    return new NextResponse(
      renderHtmlPage(
        'Email Verified Successfully!',
        `Your email has been verified. Welcome to Bok Bok, ${user.displayName || 'friend'}!`,
        true,
        redirectUrl
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (err: any) {
    console.error('Verification error:', err)
    return new NextResponse(
      renderHtmlPage('Verification Error', 'An unexpected error occurred while verifying your email.', false),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}

function renderHtmlPage(title: string, message: string, success: boolean, redirectUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Bok Bok</title>
  <style>
    body { margin: 0; padding: 0; background-color: #fbfaf7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #142D4E; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #ffffff; border-radius: 24px; border: 1px solid #e7e2da; max-width: 480px; width: 90%; padding: 40px 32px; text-align: center; box-shadow: 0 10px 25px rgba(20,45,78,0.05); }
    .logo { font-size: 28px; font-weight: 800; color: #142D4E; margin-bottom: 24px; }
    .logo span { color: #FCAD35; }
    .icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; }
    .icon-success { background-color: #ecfdf5; color: #10b981; }
    .icon-error { background-color: #fef2f2; color: #ef4444; }
    h1 { font-size: 22px; margin: 0 0 12px; font-weight: 700; color: #142D4E; }
    p { font-size: 14px; line-height: 1.6; color: #64748b; margin: 0 0 24px; }
    .btn { display: inline-block; background-color: #FCAD35; color: #142D4E; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 9999px; text-decoration: none; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Bok<span>Bok</span></div>
    <div class="icon ${success ? 'icon-success' : 'icon-error'}">${success ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${redirectUrl
      ? `<a href="${redirectUrl}" class="btn">Continue to Bok Bok</a>`
      : `<a href="/" class="btn">Return to Homepage</a>`
    }
  </div>
</body>
</html>`
}

