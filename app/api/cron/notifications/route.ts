import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { processAutomatedReminders } from '@/lib/email/scheduler'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function safeSecretEqual(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false
  const bufA = Buffer.from(provided, 'utf-8')
  const bufB = Buffer.from(expected, 'utf-8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

async function handleCron(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const authHeader = request.headers.get('authorization')
    const secret =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) ||
      searchParams.get('secret')

    const session = await getSession()
    const isAdmin = session?.role === 'admin'
    const cronSecret = process.env.CRON_SECRET

    // Require either an authenticated admin session or a valid CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>)
    const isSecretValid = safeSecretEqual(secret, cronSecret)
    const isAuthorized = isAdmin || isSecretValid

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
