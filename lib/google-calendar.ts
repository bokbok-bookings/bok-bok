import { google, calendar_v3 } from 'googleapis'
import {
  getSettingsCollection,
  getExpertsCollection,
  getUsersCollection,
  getBookingsCollection,
  getServicesCollection,
  toObjectId,
} from './db'

let cachedCalendar: calendar_v3.Calendar | null = null
let cachedStatus: {
  checkedAt: number
  result: GoogleCalendarConnectionStatus
} | null = null

export interface GoogleCalendarConnectionStatus {
  state: 'connected' | 'expired' | 'not_connected' | 'not_configured'
  calendarEmail?: string
  updatedAt?: string
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
 * Get an authenticated Google Calendar client using OAuth 2.0.
 * Reuses client in-memory and listens for token refreshes.
 */
async function getOAuthCalendarClient() {
  if (cachedCalendar) return cachedCalendar

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

  cachedCalendar = google.calendar({ version: 'v3', auth: oauth2Client })
  return cachedCalendar
}

export function resetCalendarCache() {
  cachedCalendar = null
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

  if (!refreshToken) {
    const result: GoogleCalendarConnectionStatus = {
      state: 'not_connected',
      updatedAt: updatedAtStr,
      message:
        'Google Calendar is not connected. Connect the BokBok Google account to automatically generate Google Meet links on booking confirmation.',
    }
    cachedStatus = { checkedAt: Date.now(), result }
    return result
  }

  try {
    const calendar = await getOAuthCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    const calRes = await calendar.calendars.get({ calendarId })
    const result: GoogleCalendarConnectionStatus = {
      state: 'connected',
      calendarEmail: calRes.data.id || calendarId,
      updatedAt: updatedAtStr,
      message: `Connected to Google Calendar (${calRes.data.id || calendarId}). Google Meet links are generated automatically on confirmation.`,
    }
    cachedStatus = { checkedAt: Date.now(), result }
    return result
  } catch (err: any) {
    resetCalendarCache()
    const expired = isTokenAuthError(err)
    const result: GoogleCalendarConnectionStatus = {
      state: expired ? 'expired' : 'not_connected',
      updatedAt: updatedAtStr,
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
 * Invites:
 * 1. Booking Client
 * 2. Expert
 * 3. Central BokBok Email (bokbok.bookings@gmail.com)
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

  const attendees: { email: string; displayName?: string }[] = []

  // 1. Client
  if (input.clientEmail) {
    attendees.push({
      email: input.clientEmail.trim(),
      displayName: input.clientName || 'Client',
    })
  }

  // 2. Expert
  if (input.expertEmail) {
    const normalizedExpert = input.expertEmail.trim()
    if (!attendees.some((a) => a.email.toLowerCase() === normalizedExpert.toLowerCase())) {
      attendees.push({
        email: normalizedExpert,
        displayName: input.expertName || 'Expert',
      })
    }
  }

  // 3. Central BokBok booking notifications email
  const bokBokCentralEmail = (
    process.env.ADMIN_NOTIFICATION_EMAIL || 'bokbok.bookings@gmail.com'
  )
    .toLowerCase()
    .trim()

  if (!attendees.some((a) => a.email.toLowerCase() === bokBokCentralEmail)) {
    attendees.push({
      email: bokBokCentralEmail,
      displayName: 'BokBok Team',
    })
  }

  const shouldCreateMeet = input.includeGoogleMeet !== false

  try {
    const calendar = await getOAuthCalendarClient()
    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: shouldCreateMeet ? 1 : 0,
      sendUpdates: 'all',
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
        attendees,
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
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    })

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
      sendUpdates: 'all',
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
      sendUpdates: 'all',
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
      description: [
        `Client: ${booking.clientName}`,
        `Client Email: ${booking.clientEmail}`,
        booking.clientPhone ? `Client Phone: ${booking.clientPhone}` : '',
        `Expert: ${expertName}`,
        expertEmail ? `Expert Email: ${expertEmail}` : '',
        `Service: ${serviceTitle}`,
        `Reference: ${booking.reference || ''}`,
      ]
        .filter(Boolean)
        .join('\n'),
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
