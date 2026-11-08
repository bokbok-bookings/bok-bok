import { NextResponse } from 'next/server'
import { getBookingsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { computeSessionBounds } from '@/lib/email/scheduler'
import {
  resolveTokenRole,
  MEET_UNLOCK_MINUTES_BEFORE,
  MEET_GRACE_MINUTES_AFTER_END,
} from '@/lib/booking/access'
import { ensureBookingMeetDirectEntry } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

function isSafeHttpsUrl(value?: string): boolean {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * GET /api/bookings/[id]/join?token=...
 * Tracked "Join Google Meet" entry point. Records WHO joined (client / expert) and WHEN,
 * then redirects to the Google Meet room. Used as the attendance evidence source.
 */
export async function GET(request: Request, context: RouteContext) {
  const unwrappedParams =
    typeof (context.params as any)?.then === 'function'
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string })
  const { id } = unwrappedParams
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') || ''

  const bookingPageUrl = new URL(
    `/bookings/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`,
    request.url
  )

  let bookingObjId
  try {
    bookingObjId = toObjectId(id)
  } catch {
    return NextResponse.redirect(bookingPageUrl)
  }

  const bookingsCol = await getBookingsCollection()
  const booking = await bookingsCol.findOne({ _id: bookingObjId })
  if (!booking) {
    return NextResponse.redirect(bookingPageUrl)
  }

  // Identify the participant: token role first, then logged-in session
  let role: 'client' | 'expert' | 'admin' | null = resolveTokenRole(booking, token)
  if (!role) {
    const session = await getSession()
    if (session?.role === 'admin') {
      role = 'admin'
    } else if (
      session?.role === 'expert' &&
      session.expertId &&
      session.expertId === booking.expertId.toString()
    ) {
      role = 'expert'
    } else if (session?.userId && booking.clientId && session.userId === booking.clientId.toString()) {
      role = 'client'
    }
  }

  if (!role) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized to join this session' },
      { status: 403 }
    )
  }

  const meetLink = booking.googleMeetLink?.trim()
  if (booking.status !== 'confirmed' || !isSafeHttpsUrl(meetLink)) {
    return NextResponse.redirect(bookingPageUrl)
  }

  const { sessionStartAt, sessionEndAt } =
    booking.sessionStartAt && booking.sessionEndAt
      ? { sessionStartAt: booking.sessionStartAt, sessionEndAt: booking.sessionEndAt }
      : computeSessionBounds(
          booking.date,
          booking.time,
          booking.durationMinutes || 45,
          booking.timezone || 'Africa/Cairo'
        )

  const now = new Date()
  const opensAt = sessionStartAt.getTime() - MEET_UNLOCK_MINUTES_BEFORE * 60 * 1000
  const closesAt = sessionEndAt.getTime() + MEET_GRACE_MINUTES_AFTER_END * 60 * 1000

  // Admins can always open the room (support), but are never recorded as attendees
  if (role !== 'admin') {
    if (now.getTime() < opensAt || now.getTime() > closesAt) {
      return NextResponse.redirect(bookingPageUrl)
    }

    const prefix = `meetingJoins.${role}`
    await bookingsCol.updateOne(
      { _id: bookingObjId },
      {
        $min: { [`${prefix}.firstJoinedAt`]: now },
        $set: { [`${prefix}.lastJoinedAt`]: now },
        $inc: { [`${prefix}.joinCount`]: 1 },
      } as any
    )
  }

  // Ensure Google Meet space is set to OPEN & both Client/Expert are invited attendees
  // so neither is prompted with "Ask to join" when landing on meet.google.com
  try {
    await ensureBookingMeetDirectEntry(booking)
  } catch (err) {
    console.warn('[Join Redirect] Failed to ensure direct Meet entry:', err)
  }

  return NextResponse.redirect(meetLink!)
}

