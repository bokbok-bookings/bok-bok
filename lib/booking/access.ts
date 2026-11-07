import crypto from 'crypto'
import { getBookingsCollection, type BookingDoc } from '@/lib/db'

export type BookingAccessRole = 'client' | 'expert'

/** Minutes before session start when the Meet room unlocks for participants. */
export const MEET_UNLOCK_MINUTES_BEFORE = 15
/** Minutes after session end during which Join links still work (late joiners / overruns). */
export const MEET_GRACE_MINUTES_AFTER_END = 30

function newToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

/**
 * Ensures a booking has BOTH a client token (rescheduleToken) and a separate expert token
 * (expertAccessToken), persisting any missing token. Separate tokens let the platform know
 * WHO opened a booking page / joined a meeting (required for attendance tracking).
 */
export async function ensureBookingAccessTokens(
  booking: BookingDoc
): Promise<{ clientToken: string; expertToken: string }> {
  const updates: Partial<BookingDoc> = {}
  if (!booking.rescheduleToken) updates.rescheduleToken = newToken()
  if (!booking.expertAccessToken) updates.expertAccessToken = newToken()

  if (Object.keys(updates).length > 0 && booking._id) {
    const bookingsCol = await getBookingsCollection()
    await bookingsCol.updateOne({ _id: booking._id }, { $set: updates })
    Object.assign(booking, updates)
  }

  return {
    clientToken: booking.rescheduleToken!,
    expertToken: booking.expertAccessToken!,
  }
}

/** Resolves which participant a token belongs to. */
export function resolveTokenRole(
  booking: Pick<BookingDoc, 'rescheduleToken' | 'expertAccessToken'>,
  token?: string | null
): BookingAccessRole | null {
  if (!token) return null
  if (booking.expertAccessToken && token === booking.expertAccessToken) return 'expert'
  if (booking.rescheduleToken && token === booking.rescheduleToken) return 'client'
  return null
}

export function buildBookingPageUrl(baseUrl: string, bookingId: string, token: string): string {
  return `${baseUrl}/bookings/${bookingId}?token=${token}`
}

/** Tracked Join URL: records the join for the token's role, then redirects to Google Meet. */
export function buildMeetJoinUrl(baseUrl: string, bookingId: string, token?: string): string {
  return token
    ? `${baseUrl}/api/bookings/${bookingId}/join?token=${token}`
    : `${baseUrl}/api/bookings/${bookingId}/join`
}

/** Builds per-role booking page + tracked join URLs (generating tokens if missing). */
export async function getBookingRoleLinks(baseUrl: string, booking: BookingDoc) {
  const { clientToken, expertToken } = await ensureBookingAccessTokens(booking)
  const id = booking._id!.toString()
  return {
    clientToken,
    expertToken,
    clientPageUrl: buildBookingPageUrl(baseUrl, id, clientToken),
    expertPageUrl: buildBookingPageUrl(baseUrl, id, expertToken),
    clientJoinUrl: buildMeetJoinUrl(baseUrl, id, clientToken),
    expertJoinUrl: buildMeetJoinUrl(baseUrl, id, expertToken),
  }
}

