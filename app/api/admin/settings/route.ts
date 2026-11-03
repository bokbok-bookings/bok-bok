import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getPlatformMeetingSettings, savePlatformMeetingSettings } from '@/lib/email/scheduler'

export const dynamic = 'force-dynamic'

async function verifyAdminAuth() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return null
  }
  return session
}

export async function GET() {
  try {
    const admin = await verifyAdminAuth()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 })
    }

    const settings = await getPlatformMeetingSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await verifyAdminAuth()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { beforeSessionReminderMinutes, attendanceReportingWindowHours } = body

    const updates: any = {}
    if (beforeSessionReminderMinutes !== undefined) {
      const parsed = Number(beforeSessionReminderMinutes)
      if (![10, 15, 20, 30].includes(parsed)) {
        return NextResponse.json(
          { success: false, error: 'Reminder interval must be 10, 15, 20, or 30 minutes' },
          { status: 400 }
        )
      }
      updates.beforeSessionReminderMinutes = parsed
    }

    if (attendanceReportingWindowHours !== undefined) {
      const parsed = Number(attendanceReportingWindowHours)
      if (parsed < 1 || parsed > 168) {
        return NextResponse.json(
          { success: false, error: 'Attendance reporting window must be between 1 and 168 hours' },
          { status: 400 }
        )
      }
      updates.attendanceReportingWindowHours = parsed
    }

    const saved = await savePlatformMeetingSettings(updates)
    return NextResponse.json({ success: true, data: saved, message: 'Platform settings saved successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}

