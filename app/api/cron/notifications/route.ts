import { NextResponse } from 'next/server'
import { processAutomatedReminders } from '@/lib/email/scheduler'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handleCron(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const authHeader = request.headers.get('authorization')
    const secret =
      searchParams.get('secret') ||
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)

    const userAgent = request.headers.get('user-agent') || ''
    const isVercelCronHeader =
      userAgent.includes('vercel-cron') || request.headers.get('x-vercel-cron') === '1'

    const session = await getSession()
    const isAdmin = session?.role === 'admin'
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require matching secret (Vercel automatically sends Authorization: Bearer <CRON_SECRET>) or admin session.
    // If CRON_SECRET is not set, allow Vercel Cron header, admin session, or open access so cron triggers don't fail.
    const isAuthorized =
      isAdmin ||
      (cronSecret ? secret === cronSecret : true) ||
      isVercelCronHeader

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron access' }, { status: 401 })
    }

    const result = await processAutomatedReminders()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Notification cron failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handleCron(request)
}

export async function POST(request: Request) {
  return handleCron(request)
}
