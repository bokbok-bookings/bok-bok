import { NextResponse } from 'next/server'
import {
  getExpertAvailabilitySettings,
  saveExpertAvailabilitySettings,
  getExpertDateOverrides,
  saveExpertDateOverride,
  removeExpertDateOverride,
  getCanonicalExpertId,
} from '@/lib/availability-server'
import { DEFAULT_SLOT_INTERVAL } from '@/lib/data/availability'

export const dynamic = 'force-dynamic'

// GET: Fetch weekly template and all date overrides for a specific expert by expertId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawExpertId =
      searchParams.get('expertId') ||
      searchParams.get('expertSlug') ||
      '6708a0000000000000000001'

    const expertId = await getCanonicalExpertId(rawExpertId)
    const settings = await getExpertAvailabilitySettings(expertId)
    const overrides = await getExpertDateOverrides(expertId)

    return NextResponse.json({
      success: true,
      data: {
        expertId,
        weeklySchedule: settings.weeklySchedule,
        slotIntervalMinutes: settings.slotIntervalMinutes,
        overrides,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load availability' },
      { status: 500 },
    )
  }
}

// PUT: Update weekly template settings for a specific expert by expertId
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const rawExpertId = body.expertId || body.expertSlug
    const { weeklySchedule, slotIntervalMinutes } = body

    if (!rawExpertId) {
      return NextResponse.json(
        { success: false, error: 'expertId is required' },
        { status: 400 },
      )
    }

    if (!weeklySchedule) {
      return NextResponse.json(
        { success: false, error: 'Weekly schedule is required' },
        { status: 400 },
      )
    }

    const expertId = await getCanonicalExpertId(rawExpertId)
    const updated = await saveExpertAvailabilitySettings(expertId, {
      weeklySchedule,
      slotIntervalMinutes: Number(slotIntervalMinutes) || DEFAULT_SLOT_INTERVAL,
    })

    return NextResponse.json({
      success: true,
      message: 'Weekly availability schedule updated successfully',
      data: {
        expertId,
        ...updated,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update schedule' },
      { status: 500 },
    )
  }
}

// POST: Add or update a date override for a specific expert by expertId
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawExpertId = body.expertId || body.expertSlug
    const { id, date, type, startTime, endTime, breaks, reason, expertSlug } = body

    if (!rawExpertId || !date || !type) {
      return NextResponse.json(
        { success: false, error: 'expertId, date, and override type are required' },
        { status: 400 },
      )
    }

    const expertId = await getCanonicalExpertId(rawExpertId)
    const savedOverride = await saveExpertDateOverride(expertId, {
      id,
      expertSlug,
      date,
      type,
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      breaks: Array.isArray(breaks) ? breaks : [],
      reason: (reason || '').trim(),
    })

    return NextResponse.json({
      success: true,
      message: 'Date exception saved successfully',
      data: savedOverride,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save date override' },
      { status: 500 },
    )
  }
}

// DELETE: Remove a date override for a specific expert by expertId
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawExpertId =
      searchParams.get('expertId') ||
      searchParams.get('expertSlug') ||
      '6708a0000000000000000001'
    const id = searchParams.get('id')
    const date = searchParams.get('date')

    if (!id && !date) {
      return NextResponse.json(
        { success: false, error: 'ID or date is required to delete an override' },
        { status: 400 },
      )
    }

    const expertId = await getCanonicalExpertId(rawExpertId)
    const deleted = await removeExpertDateOverride(expertId, id || date || '')

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Date override removed' : 'Override not found',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete date override' },
      { status: 500 },
    )
  }
}
