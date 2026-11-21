import { NextResponse } from 'next/server'
import {
  getExpertAvailabilitySettings,
  saveExpertAvailabilitySettings,
  getExpertDateOverrides,
  saveExpertDateOverride,
  removeExpertDateOverride,
  getCanonicalExpertId,
  getCanonicalExpertObjectId,
} from '@/lib/availability-server'
import { DEFAULT_SLOT_INTERVAL } from '@/lib/data/availability'
import { getExpertsCollection } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

async function resolveAvailabilityAuth(request: Request, rawTargetExpertId?: string | null) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized: Session required', status: 401, session: null, expertId: null, expertObjId: null }
  }

  // Admin can view or edit availability for any expert
  if (session.role === 'admin') {
    const rawExpertId = rawTargetExpertId || session.expertId || '6708a0000000000000000001'
    const expertId = await getCanonicalExpertId(rawExpertId)
    const expertObjId = await getCanonicalExpertObjectId(rawExpertId)
    return { error: null, status: 200, session, expertId, expertObjId }
  }

  // Expert can only view or edit their own availability
  if (session.role === 'expert') {
    if (!session.expertId) {
      return { error: 'Expert profile not associated with account', status: 403, session: null, expertId: null, expertObjId: null }
    }
    const myExpertId = await getCanonicalExpertId(session.expertId)
    const myExpertObjId = await getCanonicalExpertObjectId(session.expertId)

    if (rawTargetExpertId) {
      const requestedId = await getCanonicalExpertId(rawTargetExpertId)
      if (requestedId !== myExpertId) {
        return { error: 'Access denied: You can only view or manage your own availability schedule.', status: 403, session: null, expertId: null, expertObjId: null }
      }
    }

    return { error: null, status: 200, session, expertId: myExpertId, expertObjId: myExpertObjId }
  }

  return { error: 'Access denied: Insufficient privileges', status: 403, session: null, expertId: null, expertObjId: null }
}

// GET: Fetch weekly template and all date overrides for a specific expert by expertId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawExpertId =
      searchParams.get('expertId') ||
      searchParams.get('expertSlug')

    const auth = await resolveAvailabilityAuth(request, rawExpertId)
    if (auth.error || !auth.expertId || !auth.expertObjId) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const { expertId, expertObjId } = auth
    const settings = await getExpertAvailabilitySettings(expertId)
    const overrides = await getExpertDateOverrides(expertId)

    const expertsCol = await getExpertsCollection()
    const expertDoc = await expertsCol.findOne({ _id: expertObjId })

    return NextResponse.json({
      success: true,
      data: {
        expertId,
        weeklySchedule: settings.weeklySchedule,
        slotIntervalMinutes: settings.slotIntervalMinutes,
        rescheduleDeadlineHours: expertDoc?.rescheduleDeadlineHours || 24,
        defaultGoogleMeetLink: expertDoc?.defaultGoogleMeetLink || '',
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
    const { weeklySchedule, slotIntervalMinutes, rescheduleDeadlineHours, defaultGoogleMeetLink } = body

    const auth = await resolveAvailabilityAuth(request, rawExpertId)
    if (auth.error || !auth.expertId || !auth.expertObjId) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    if (!weeklySchedule) {
      return NextResponse.json(
        { success: false, error: 'Weekly schedule is required' },
        { status: 400 },
      )
    }

    const { expertId, expertObjId } = auth
    const updated = await saveExpertAvailabilitySettings(expertId, {
      weeklySchedule,
      slotIntervalMinutes: Number(slotIntervalMinutes) || DEFAULT_SLOT_INTERVAL,
    })

    const expertUpdates: any = {}
    if (rescheduleDeadlineHours !== undefined) {
      expertUpdates.rescheduleDeadlineHours = Number(rescheduleDeadlineHours) || 24
    }
    if (defaultGoogleMeetLink !== undefined) {
      expertUpdates.defaultGoogleMeetLink = String(defaultGoogleMeetLink).trim()
    }

    if (Object.keys(expertUpdates).length > 0) {
      const expertsCol = await getExpertsCollection()
      await expertsCol.updateOne({ _id: expertObjId }, { $set: expertUpdates })
    }

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

    const auth = await resolveAvailabilityAuth(request, rawExpertId)
    if (auth.error || !auth.expertId) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    if (!date || !type) {
      return NextResponse.json(
        { success: false, error: 'date and override type are required' },
        { status: 400 },
      )
    }

    const { expertId } = auth
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
      searchParams.get('expertSlug')
    const id = searchParams.get('id')
    const date = searchParams.get('date')

    const auth = await resolveAvailabilityAuth(request, rawExpertId)
    if (auth.error || !auth.expertId) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    if (!id && !date) {
      return NextResponse.json(
        { success: false, error: 'ID or date is required to delete an override' },
        { status: 400 },
      )
    }

    const { expertId } = auth
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
