import { google, calendar_v3, meet_v2 } from 'googleapis'
import {
  getSettingsCollection,
  getExpertsCollection,
  getUsersCollection,
  getBookingsCollection,
  getServicesCollection,
  toObjectId,
  type BookingDoc,
  type GoogleMeetParticipantTelemetry,
  type GoogleMeetTelemetry,
  type MeetingJoinRecord,
} from './db'

let cachedOAuthClient: InstanceType<typeof google.auth.OAuth2> | null = null
let cachedCalendar: calendar_v3.Calendar | null = null
let cachedMeet: meet_v2.Meet | null = null
let cachedStatus: {
  checkedAt: number
  result: GoogleCalendarConnectionStatus
} | null = null

export interface GoogleCalendarConnectionStatus {
  state: 'connected' | 'expired' | 'not_connected' | 'not_configured'
  calendarEmail?: string
  updatedAt?: string
  hasMeetTelemetryScope?: boolean
  message: string
}

function isTokenAuthError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase()
  const apiErr = String(err?.response?.data?.error || '').toLowerCase()
  const status = err?.code || err?.response?.status
  return (
    msg.includes('invalid_grant') ||
    apiErr === 'invalid_grant' ||
    apiErr === 'unauthorized_client' ||
    msg.includes('token has been expired or revoked') ||
    msg.includes('invalid credentials') ||
    status === 401
  )
}

export function formatCalendarError(err: any): string {
  if (isTokenAuthError(err)) {
    return 'Google Calendar OAuth token has expired or been revoked (Google Cloud OAuth apps in "Testing" mode expire refresh tokens after 7 days). Please click "Reconnect Google Calendar & Meet" in the Admin Bookings panel.'
  }
  const apiMessage =
    err?.response?.data?.error?.message ||
    err?.response?.data?.error_description ||
    err?.message ||
    'Unknown Google Calendar error'
  return String(apiMessage)
}

/**
 * Pure calendar arithmetic for YYYY-MM-DD + HH:mm + durationMinutes.
 * Safely advances date across midnight without server-local-timezone or DST bugs.
 */
export function computeStartAndEndDateTime(
  dateStr: string,
  timeStr: string,
  durationMinutes: number,
): { startDateTime: string; endDateTime: string } {
  const [yStr, mStr, dStr] = dateStr.split('-')
  const [hStr, minStr] = timeStr.split(':')
  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)
  const hour = Number(hStr)
  const minute = Number(minStr)

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const startDateTime = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00`

  const endUtc = new Date(Date.UTC(year, month - 1, day, hour, minute + (durationMinutes || 45), 0))
  const endYear = endUtc.getUTCFullYear()
  const endMonth = pad2(endUtc.getUTCMonth() + 1)
  const endDay = pad2(endUtc.getUTCDate())
  const endHours = pad2(endUtc.getUTCHours())
  const endMinutes = pad2(endUtc.getUTCMinutes())
  const endDateTime = `${endYear}-${endMonth}-${endDay}T${endHours}:${endMinutes}:00`

  return { startDateTime, endDateTime }
}

/**
 * Get current date string (YYYY-MM-DD) in Africa/Cairo timezone.
 */
export function getCairoTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/**
 * Get an authenticated Google OAuth2 client.
 * Reuses client in-memory and listens for token refreshes.
 */
async function getOAuthClient() {
  if (cachedOAuthClient) return cachedOAuthClient

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)')
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const settingsCol = await getSettingsCollection()
  const tokenDoc = (await settingsCol.findOne({ key: 'google_calendar_token' } as any)) as any

  const refreshToken = tokenDoc?.value?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN

  if (!refreshToken) {
    throw new Error(
      'Google Calendar is not linked yet. Please reconnect BokBok Google Calendar from the Admin Bookings panel.',
    )
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: tokenDoc?.value?.access_token,
    expiry_date: tokenDoc?.value?.expiry_date,
  })

  // Listen for refreshed tokens and save back to MongoDB settings
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      if (newTokens.refresh_token || newTokens.access_token) {
        const col = await getSettingsCollection()
        await col.updateOne(
          { key: 'google_calendar_token' } as any,
          {
            $set: {
              'value.access_token': newTokens.access_token,
              ...(newTokens.refresh_token ? { 'value.refresh_token': newTokens.refresh_token } : {}),
              'value.expiry_date': newTokens.expiry_date,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        )
      }
    } catch (err: any) {
      console.error('[Google Calendar] Failed to persist refreshed token:', err?.message)
    }
  })

  cachedOAuthClient = oauth2Client
  return cachedOAuthClient
}

async function getOAuthCalendarClient() {
  if (cachedCalendar) return cachedCalendar
  const auth = await getOAuthClient()
  cachedCalendar = google.calendar({ version: 'v3', auth })
  return cachedCalendar
}

async function getOAuthMeetClient() {
  if (cachedMeet) return cachedMeet
  const auth = await getOAuthClient()
  cachedMeet = google.meet({ version: 'v2', auth })
  return cachedMeet
}

export function resetCalendarCache() {
  cachedOAuthClient = null
  cachedCalendar = null
  cachedMeet = null
  cachedStatus = null
}

/**
 * Checks live health of the central Google Calendar & Meet OAuth connection.
 */
export async function getGoogleCalendarConnectionStatus(
  forceRefresh = false,
): Promise<GoogleCalendarConnectionStatus> {
  if (!forceRefresh && cachedStatus && Date.now() - cachedStatus.checkedAt < 60_000) {
    return cachedStatus.result
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return {
      state: 'not_configured',
      message: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in server environment.',
    }
  }

  const settingsCol = await getSettingsCollection()
  const tokenDoc = (await settingsCol.findOne({ key: 'google_calendar_token' } as any)) as any
  const refreshToken = tokenDoc?.value?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN
  const updatedAtStr = tokenDoc?.updatedAt
    ? new Date(tokenDoc.updatedAt).toISOString()
    : undefined
  const grantedScope = String(tokenDoc?.value?.scope || '')
  const hasMeetTelemetryScope =
    grantedScope.includes('meetings.space.readonly') ||
    grantedScope.includes('meetings.space.created')

  if (!refreshToken) {
    const result: GoogleCalendarConnectionStatus = {
      state: 'not_connected',
      updatedAt: updatedAtStr,
      hasMeetTelemetryScope: false,
      message:
        'Google Calendar is not connected. Connect the BokBok Google account to automatically generate Google Meet links on booking confirmation.',
    }
    cachedStatus = { checkedAt: Date.now(), result }
    return result
  }

  try {
    const calendar = await getOAuthCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    const calRes = await Promise.race([
      calendar.calendars.get({ calendarId }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Google Calendar health check timed out (6s)')), 6000),
      ),
    ])
    const result: GoogleCalendarConnectionStatus = {
      state: 'connected',
      calendarEmail: calRes.data.id || calendarId,
      updatedAt: updatedAtStr,
      hasMeetTelemetryScope,
      message: `Connected to Google Calendar (${calRes.data.id || calendarId}). Google Meet links are generated automatically on confirmation.${
        hasMeetTelemetryScope
          ? ' Google Meet telemetry (join/leave times) is enabled.'
          : ' Reconnect once to grant Google Meet leave-time telemetry scope.'
      }`,
    }
    cachedStatus = { checkedAt: Date.now(), result }
    return result
  } catch (err: any) {
    resetCalendarCache()
    const expired = isTokenAuthError(err)
    const result: GoogleCalendarConnectionStatus = {
      state: expired ? 'expired' : 'not_connected',
      updatedAt: updatedAtStr,
      hasMeetTelemetryScope,
      message: formatCalendarError(err),
    }
    cachedStatus = { checkedAt: Date.now(), result }
    return result
  }
}

export interface CalendarEventInput {
  summary: string
  description: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMinutes: number
  clientEmail: string
  clientName: string
  expertEmail?: string
  expertName?: string
  includeGoogleMeet?: boolean
}

export interface CalendarEventResult {
  eventId: string
  eventLink: string
  meetLink: string
}

/**
 * Creates Google Calendar event with auto Google Meet link.
 * Does NOT invite attendees or send calendar notifications; the event serves
 * strictly as a meeting room on BokBok's central account to generate the Google Meet URL.
 */
export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<CalendarEventResult> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
  const { startDateTime, endDateTime } = computeStartAndEndDateTime(
    input.date,
    input.time,
    input.durationMinutes,
  )

  const shouldCreateMeet = input.includeGoogleMeet !== false

  try {
    const calendar = await getOAuthCalendarClient()
    const insertCall = calendar.events.insert({
      calendarId,
      conferenceDataVersion: shouldCreateMeet ? 1 : 0,
      sendUpdates: 'none',
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: {
          dateTime: startDateTime,
          timeZone: 'Africa/Cairo',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Africa/Cairo',
        },
        attendees: [],
        ...(shouldCreateMeet
          ? {
              conferenceData: {
                createRequest: {
                  requestId: `bokbok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  conferenceSolutionKey: {
                    type: 'hangoutsMeet',
                  },
                },
              },
            }
          : {}),
        reminders: {
          useDefault: false,
          overrides: [],
        },
      },
    })

    const event = await Promise.race([
      insertCall,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Google Meet generation timed out after 10s')), 10000),
      ),
    ])

    const eventData = event.data
    const meetLink =
      eventData.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ||
      eventData.hangoutLink ||
      eventData.conferenceData?.entryPoints?.[0]?.uri ||
      ''

    if (shouldCreateMeet && !meetLink) {
      throw new Error(
        'Google Calendar created the event without a Google Meet conference link. Ensure Google Meet video conferencing is enabled on the connected Google account.',
      )
    }

    return {
      eventId: eventData.id || '',
      eventLink: eventData.htmlLink || '',
      meetLink,
    }
  } catch (err: any) {
    if (isTokenAuthError(err)) {
      resetCalendarCache()
    }
    throw new Error(formatCalendarError(err))
  }
}

/**
 * Update Google Calendar event time when a booking is rescheduled
 */
export async function updateCalendarEvent(
  eventId: string,
  input: { date: string; time: string; durationMinutes: number },
): Promise<void> {
  if (!eventId) return
  try {
    const calendar = await getOAuthCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    const { startDateTime, endDateTime } = computeStartAndEndDateTime(
      input.date,
      input.time,
      input.durationMinutes,
    )

    await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: 'none',
      requestBody: {
        start: {
          dateTime: startDateTime,
          timeZone: 'Africa/Cairo',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Africa/Cairo',
        },
      },
    })
  } catch (error: any) {
    if (isTokenAuthError(error)) {
      resetCalendarCache()
    }
    console.error('[Google Calendar] Failed to update event:', error?.message)
  }
}

/**
 * Delete event when booking is cancelled or rejected
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!eventId) return
  try {
    const calendar = await getOAuthCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'none',
    })
  } catch (error: any) {
    if (isTokenAuthError(error)) {
      resetCalendarCache()
    }
    console.error('[Google Calendar] Failed to delete event:', error?.message)
  }
}

/**
 * Confirms a booking, resolves expert email, and creates calendar event + Meet link.
 */
export async function confirmBookingAndCreateCalendar(
  bookingIdOrReference: string,
  options?: { forceRecreate?: boolean },
) {
  const bookingsCol = await getBookingsCollection()
  const expertsCol = await getExpertsCollection()
  const usersCol = await getUsersCollection()
  const servicesCol = await getServicesCollection()

  let booking = null
  try {
    booking = await bookingsCol.findOne({ _id: toObjectId(bookingIdOrReference) })
  } catch {
    booking = await bookingsCol.findOne({ reference: bookingIdOrReference })
  }

  if (!booking) {
    throw new Error(`Booking not found: ${bookingIdOrReference}`)
  }

  // Only skip if BOTH calendar event ID and Google Meet link exist (unless forceRecreate is requested)
  if (booking.googleCalendarEventId && booking.googleMeetLink && !options?.forceRecreate) {
    return booking
  }

  // Check if booking or service is strictly IN_PERSON
  let includeGoogleMeet = booking.deliveryMode !== 'IN_PERSON'
  if (includeGoogleMeet && booking.serviceId) {
    try {
      const srv = await servicesCol.findOne({ _id: booking.serviceId })
      if (srv?.deliveryMode === 'IN_PERSON') {
        includeGoogleMeet = false
      }
    } catch {
      // keep existing includeGoogleMeet value
    }
  }

  // Resolve expert details
  let expertName = 'BokBok Expert'
  let expertEmail: string | undefined = undefined

  if (booking.expertId) {
    const expertDoc = await expertsCol.findOne({ _id: booking.expertId })
    if (expertDoc) {
      expertName = expertDoc.name
      if (expertDoc.userId) {
        const userDoc = await usersCol.findOne({ _id: expertDoc.userId })
        if (userDoc?.email) expertEmail = userDoc.email
      }
      if (!expertEmail) {
        const userByExpertId = await usersCol.findOne({ expertId: expertDoc._id })
        if (userByExpertId?.email) expertEmail = userByExpertId.email
      }
    }
  }

  const serviceTitle =
    booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'

  try {
    // If an earlier event existed without a Meet link, remove it before creating the replacement
    if (booking.googleCalendarEventId && (!booking.googleMeetLink || options?.forceRecreate)) {
      await deleteCalendarEvent(booking.googleCalendarEventId)
    }

    const calendarResult = await createCalendarEvent({
      summary: `BokBok: ${serviceTitle} - ${booking.clientName} with ${expertName}`,
      description: `BokBok Session Reference: ${booking.reference || booking._id?.toString() || ''}\nService: ${serviceTitle}`,
      date: booking.date,
      time: booking.time,
      durationMinutes: booking.durationMinutes || 45,
      clientEmail: booking.clientEmail,
      clientName: booking.clientName,
      expertEmail,
      expertName,
      includeGoogleMeet,
    })

    const now = new Date()
    const updateData = {
      googleCalendarEventId: calendarResult.eventId,
      googleCalendarEventLink: calendarResult.eventLink,
      googleMeetLink: calendarResult.meetLink,
      googleMeetSyncedAt: now,
      googleMeetUpdatedAt: now,
      updatedAt: now,
    }

    await bookingsCol.updateOne(
      { _id: booking._id },
      {
        $set: updateData,
        $unset: { googleMeetError: '' },
      },
    )

    return { ...booking, ...updateData, googleMeetError: undefined }
  } catch (err: any) {
    const formattedErr = formatCalendarError(err)
    await bookingsCol.updateOne(
      { _id: booking._id },
      {
        $set: {
          googleMeetError: formattedErr,
          updatedAt: new Date(),
        },
      },
    )
    throw new Error(formattedErr)
  }
}

/**
 * Finds confirmed online bookings (on or after today in Cairo time) that are missing a Google Meet link
 * and generates Calendar + Google Meet invitations for them.
 */
export async function syncMissingMeetLinksForConfirmedBookings(): Promise<{
  syncedCount: number
  failedCount: number
  syncedReferences: string[]
  errors: string[]
}> {
  const bookingsCol = await getBookingsCollection()
  const todayCairo = getCairoTodayDateString()

  const candidates = await bookingsCol
    .find({
      status: 'confirmed',
      deliveryMode: { $ne: 'IN_PERSON' },
      date: { $gte: todayCairo },
      $or: [
        { googleMeetLink: { $exists: false } },
        { googleMeetLink: '' },
        { googleMeetLink: null as any },
      ],
    })
    .sort({ date: 1, time: 1 })
    .limit(25)
    .toArray()

  let syncedCount = 0
  let failedCount = 0
  const syncedReferences: string[] = []
  const errors: string[] = []

  for (const b of candidates) {
    try {
      const updated = await confirmBookingAndCreateCalendar(b._id!.toString())
      if (updated.googleMeetLink) {
        syncedCount++
        syncedReferences.push(b.reference || b._id!.toString())
      }
    } catch (err: any) {
      failedCount++
      errors.push(`${b.reference || b._id!.toString()}: ${err?.message || 'Failed'}`)
    }
  }

  return { syncedCount, failedCount, syncedReferences, errors }
}

/**
 * Extracts the 10-letter Google Meet code (e.g. "abc-defg-hij") from a Meet URL.
 */
export function extractGoogleMeetCode(meetLink?: string | null): string | null {
  if (!meetLink) return null
  const match = String(meetLink).match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
  return match ? match[1].toLowerCase() : null
}

function normalizeNameTokens(name?: string | null): string[] {
  if (!name) return []
  return String(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

function computeNameSimilarity(displayName: string, targetName: string): number {
  const displayTokens = normalizeNameTokens(displayName)
  const targetTokens = normalizeNameTokens(targetName)
  if (!displayTokens.length || !targetTokens.length) return 0

  const fullDisplay = displayTokens.join(' ')
  const fullTarget = targetTokens.join(' ')
  if (fullDisplay === fullTarget) return 100
  if (fullDisplay.includes(fullTarget) || fullTarget.includes(fullDisplay)) return 80

  let matched = 0
  for (const dt of displayTokens) {
    if (targetTokens.some((tt) => tt === dt || (dt.length >= 3 && (tt.startsWith(dt) || dt.startsWith(tt))))) {
      matched++
    }
  }
  if (matched === 0) return 0
  return Math.round((matched / Math.max(displayTokens.length, targetTokens.length)) * 70)
}

function computeJoinProximityScore(participantJoinedAt: Date, trackedJoin?: MeetingJoinRecord): number {
  if (!trackedJoin?.firstJoinedAt) return 0
  const pMs = participantJoinedAt.getTime()
  const firstDiffSec = Math.abs(pMs - new Date(trackedJoin.firstJoinedAt).getTime()) / 1000
  const lastDiffSec = trackedJoin.lastJoinedAt
    ? Math.abs(pMs - new Date(trackedJoin.lastJoinedAt).getTime()) / 1000
    : firstDiffSec
  const minDiffSec = Math.min(firstDiffSec, lastDiffSec)

  // Within 2 minutes of clicking Join on BokBok -> high confidence
  if (minDiffSec <= 120) return 75 - Math.round((minDiffSec / 120) * 25)
  // Within 10 minutes -> moderate confidence
  if (minDiffSec <= 600) return 45 - Math.round(((minDiffSec - 120) / 480) * 30)
  // Within 30 minutes -> low confidence
  if (minDiffSec <= 1800) return 10
  return 0
}

/**
 * Matches Google Meet participants to 'client' and 'expert' using both
 * BokBok Join-click timestamp proximity and display name matching.
 */
export function matchParticipantsToRoles(params: {
  participants: GoogleMeetParticipantTelemetry[]
  clientName: string
  expertName: string
  clientJoin?: MeetingJoinRecord
  expertJoin?: MeetingJoinRecord
}): GoogleMeetParticipantTelemetry[] {
  const { participants, clientName, expertName, clientJoin, expertJoin } = params
  if (!participants.length) return []

  const scored = participants.map((p, idx) => {
    const clientScore =
      computeNameSimilarity(p.displayName, clientName) +
      computeJoinProximityScore(p.joinedAt, clientJoin)
    const expertScore =
      computeNameSimilarity(p.displayName, expertName) +
      computeJoinProximityScore(p.joinedAt, expertJoin)
    return { idx, p, clientScore, expertScore }
  })

  let assignedClientIdx: number | null = null
  let assignedExpertIdx: number | null = null

  // Find best non-conflicting assignment across all pairs
  let bestTotal = -1
  for (let cIdx = -1; cIdx < scored.length; cIdx++) {
    for (let eIdx = -1; eIdx < scored.length; eIdx++) {
      if (cIdx !== -1 && cIdx === eIdx) continue
      const cScore = cIdx >= 0 ? scored[cIdx].clientScore : 0
      const eScore = eIdx >= 0 ? scored[eIdx].expertScore : 0
      // Only assign a role if its score > 0 (or will be inferred below)
      const effectiveC = cScore > 0 ? cScore : 0
      const effectiveE = eScore > 0 ? eScore : 0
      const total = effectiveC + effectiveE
      if (total > bestTotal) {
        bestTotal = total
        assignedClientIdx = cIdx >= 0 && cScore > 0 ? cIdx : null
        assignedExpertIdx = eIdx >= 0 && eScore > 0 ? eIdx : null
      }
    }
  }

  // If exactly 2 participants attended the 1-on-1 call and one matched a role,
  // the other participant in the private room is the counterpart.
  if (participants.length === 2) {
    if (assignedClientIdx !== null && assignedExpertIdx === null) {
      assignedExpertIdx = assignedClientIdx === 0 ? 1 : 0
    } else if (assignedExpertIdx !== null && assignedClientIdx === null) {
      assignedClientIdx = assignedExpertIdx === 0 ? 1 : 0
    }
  } else if (participants.length === 1 && assignedClientIdx === null && assignedExpertIdx === null) {
    // Single participant with no name match: check if only one party clicked Join on BokBok
    if (clientJoin?.firstJoinedAt && !expertJoin?.firstJoinedAt) {
      assignedClientIdx = 0
    } else if (expertJoin?.firstJoinedAt && !clientJoin?.firstJoinedAt) {
      assignedExpertIdx = 0
    }
  }

  return participants.map((p, idx) => ({
    ...p,
    matchedRole:
      idx === assignedClientIdx
        ? 'client'
        : idx === assignedExpertIdx
          ? 'expert'
          : undefined,
  }))
}

/**
 * Queries the Google Meet REST API v2 (conferenceRecords -> participants -> participantSessions)
 * to retrieve exact join times, leave times (`leftAt`), and call durations for a booking's Meet room.
 */
export async function syncBookingMeetTelemetry(
  bookingOrId: string | BookingDoc,
  options?: { force?: boolean; expertName?: string },
): Promise<BookingDoc | null> {
  const bookingsCol = await getBookingsCollection()
  let booking: BookingDoc | null = null

  if (typeof bookingOrId === 'string') {
    try {
      booking = await bookingsCol.findOne({ _id: toObjectId(bookingOrId) })
    } catch {
      booking = await bookingsCol.findOne({ reference: bookingOrId })
    }
  } else {
    booking = bookingOrId
  }

  if (!booking || !booking._id) return null
  if (booking.deliveryMode === 'IN_PERSON') return booking

  const meetingCode = extractGoogleMeetCode(booking.googleMeetLink)
  if (!meetingCode) return booking

  // Throttle automatic syncs to once every 45 seconds unless force=true
  const now = new Date()
  if (
    !options?.force &&
    booking.googleMeetTelemetry?.lastSyncedAt &&
    now.getTime() - new Date(booking.googleMeetTelemetry.lastSyncedAt).getTime() < 45_000
  ) {
    return booking
  }

  // Resolve expert name if not provided
  let expertName = options?.expertName || 'Expert'
  if (!options?.expertName && booking.expertId) {
    try {
      const expertsCol = await getExpertsCollection()
      const expertDoc = await expertsCol.findOne({ _id: booking.expertId })
      if (expertDoc?.name) expertName = expertDoc.name
    } catch {
      // ignore
    }
  }

  try {
    const meet = await getOAuthMeetClient()

    const confListRes = await Promise.race([
      meet.conferenceRecords.list({
        filter: `space.meeting_code="${meetingCode}"`,
        pageSize: 10,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Google Meet API conferenceRecords request timed out (6s)')), 6000),
      ),
    ])

    const conferenceRecords = confListRes.data.conferenceRecords || []
    const conferenceRecordNames: string[] = []
    let conferenceStartedAt: Date | undefined
    let conferenceEndedAt: Date | undefined
    const rawParticipants: GoogleMeetParticipantTelemetry[] = []

    for (const record of conferenceRecords) {
      if (!record.name) continue
      conferenceRecordNames.push(record.name)

      if (record.startTime) {
        const st = new Date(record.startTime)
        if (!conferenceStartedAt || st < conferenceStartedAt) conferenceStartedAt = st
      }
      if (record.endTime) {
        const et = new Date(record.endTime)
        if (!conferenceEndedAt || et > conferenceEndedAt) conferenceEndedAt = et
      }

      const partRes = await Promise.race([
        meet.conferenceRecords.participants.list({
          parent: record.name,
          pageSize: 50,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Google Meet API participants request timed out (6s)')), 6000),
        ),
      ])

      const participants = partRes.data.participants || []
      for (const part of participants) {
        if (!part.name || !part.earliestStartTime) continue

        const displayName =
          part.signedinUser?.displayName ||
          part.anonymousUser?.displayName ||
          part.phoneUser?.displayName ||
          'Guest Participant'

        const userType: 'signed_in' | 'anonymous' | 'phone' = part.signedinUser
          ? 'signed_in'
          : part.phoneUser
            ? 'phone'
            : 'anonymous'

        const joinedAt = new Date(part.earliestStartTime)
        let leftAt = part.latestEndTime ? new Date(part.latestEndTime) : undefined
        let durationSeconds = 0
        let sessionsCount = 1
        let isActive = !part.latestEndTime && !record.endTime

        // Fetch individual participantSessions for exact multi-session duration & latest leave time
        try {
          const sessRes = await meet.conferenceRecords.participants.participantSessions.list({
            parent: part.name,
            pageSize: 50,
          })
          const sessions = sessRes.data.participantSessions || []
          if (sessions.length > 0) {
            sessionsCount = sessions.length
            let totalSec = 0
            let latestEnd: Date | undefined = leftAt
            let anyOpen = false

            for (const s of sessions) {
              if (!s.startTime) continue
              const sStart = new Date(s.startTime)
              if (s.endTime) {
                const sEnd = new Date(s.endTime)
                totalSec += Math.max(0, Math.round((sEnd.getTime() - sStart.getTime()) / 1000))
                if (!latestEnd || sEnd > latestEnd) latestEnd = sEnd
              } else {
                anyOpen = true
                const refEnd = record.endTime ? new Date(record.endTime) : now
                totalSec += Math.max(0, Math.round((refEnd.getTime() - sStart.getTime()) / 1000))
              }
            }

            durationSeconds = totalSec
            leftAt = anyOpen && !record.endTime ? undefined : latestEnd
            isActive = anyOpen && !record.endTime
          }
        } catch {
          // Fallback to earliestStartTime -> latestEndTime if participantSessions call fails
        }

        if (durationSeconds === 0) {
          const effectiveEnd = leftAt || (record.endTime ? new Date(record.endTime) : now)
          durationSeconds = Math.max(0, Math.round((effectiveEnd.getTime() - joinedAt.getTime()) / 1000))
        }

        rawParticipants.push({
          participantId: part.name,
          displayName,
          userType,
          joinedAt,
          leftAt,
          durationSeconds,
          durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
          sessionsCount,
          isActive,
        })
      }
    }

    // Match Google Meet participants to Client vs Expert
    const matchedParticipants = matchParticipantsToRoles({
      participants: rawParticipants,
      clientName: booking.clientName,
      expertName,
      clientJoin: booking.meetingJoins?.client,
      expertJoin: booking.meetingJoins?.expert,
    })

    const clientParticipant = matchedParticipants.find((p) => p.matchedRole === 'client')
    const expertParticipant = matchedParticipants.find((p) => p.matchedRole === 'expert')

    const updatedMeetingJoins: NonNullable<BookingDoc['meetingJoins']> = {
      ...(booking.meetingJoins || {}),
    }

    if (clientParticipant) {
      const prev = updatedMeetingJoins.client
      const firstJoinedAt =
        prev?.firstJoinedAt && new Date(prev.firstJoinedAt) < clientParticipant.joinedAt
          ? new Date(prev.firstJoinedAt)
          : clientParticipant.joinedAt
      updatedMeetingJoins.client = {
        firstJoinedAt,
        lastJoinedAt: clientParticipant.joinedAt,
        joinCount: Math.max(prev?.joinCount || 0, clientParticipant.sessionsCount),
        leftAt: clientParticipant.leftAt,
        durationSeconds: clientParticipant.durationSeconds,
        durationMinutes: clientParticipant.durationMinutes,
        meetDisplayName: clientParticipant.displayName,
        inMeetingNow: clientParticipant.isActive,
      }
    }

    if (expertParticipant) {
      const prev = updatedMeetingJoins.expert
      const firstJoinedAt =
        prev?.firstJoinedAt && new Date(prev.firstJoinedAt) < expertParticipant.joinedAt
          ? new Date(prev.firstJoinedAt)
          : expertParticipant.joinedAt
      updatedMeetingJoins.expert = {
        firstJoinedAt,
        lastJoinedAt: expertParticipant.joinedAt,
        joinCount: Math.max(prev?.joinCount || 0, expertParticipant.sessionsCount),
        leftAt: expertParticipant.leftAt,
        durationSeconds: expertParticipant.durationSeconds,
        durationMinutes: expertParticipant.durationMinutes,
        meetDisplayName: expertParticipant.displayName,
        inMeetingNow: expertParticipant.isActive,
      }
    }

    const telemetry: GoogleMeetTelemetry = {
      meetingCode,
      conferenceRecordNames,
      conferenceStartedAt,
      conferenceEndedAt,
      participants: matchedParticipants,
      lastSyncedAt: now,
    }

    await bookingsCol.updateOne(
      { _id: booking._id },
      {
        $set: {
          meetingJoins: updatedMeetingJoins,
          googleMeetTelemetry: telemetry,
          updatedAt: now,
        },
      },
    )

    booking.meetingJoins = updatedMeetingJoins
    booking.googleMeetTelemetry = telemetry
    return booking
  } catch (err: any) {
    const rawMsg =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Failed to query Google Meet REST API'
    const isScopeOrApiDisabled =
      rawMsg.includes('insufficient authentication scopes') ||
      rawMsg.includes('Request had insufficient authentication scopes') ||
      rawMsg.includes('Google Meet REST API has not been used') ||
      rawMsg.includes('accessNotConfigured') ||
      err?.code === 403

    const friendlyError = isScopeOrApiDisabled
      ? 'Google Meet REST API requires enabling "Google Meet REST API" in Google Cloud Console and reconnecting the BokBok Google account once to grant the meetings.space.readonly scope.'
      : String(rawMsg)

    const fallbackTelemetry: GoogleMeetTelemetry = {
      meetingCode,
      conferenceRecordNames: booking.googleMeetTelemetry?.conferenceRecordNames || [],
      conferenceStartedAt: booking.googleMeetTelemetry?.conferenceStartedAt,
      conferenceEndedAt: booking.googleMeetTelemetry?.conferenceEndedAt,
      participants: booking.googleMeetTelemetry?.participants || [],
      lastSyncedAt: now,
      syncError: friendlyError,
    }

    await bookingsCol.updateOne(
      { _id: booking._id },
      {
        $set: {
          googleMeetTelemetry: fallbackTelemetry,
        },
      },
    )

    booking.googleMeetTelemetry = fallbackTelemetry
    return booking
  }
}
