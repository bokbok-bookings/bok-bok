import { google, calendar_v3 } from 'googleapis'
import {
  getSettingsCollection,
  getExpertsCollection,
  getUsersCollection,
  getBookingsCollection,
  toObjectId,
} from './db'

let cachedCalendar: calendar_v3.Calendar | null = null

/**
 * Get an authenticated Google Calendar client using OAuth 2.0.
 * Reuses client in-memory and listens for token refreshes.
 */
async function getOAuthCalendarClient() {
  if (cachedCalendar) return cachedCalendar

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)')
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const settingsCol = await getSettingsCollection()
  const tokenDoc = (await settingsCol.findOne({ key: 'google_calendar_token' } as any)) as any

  const refreshToken = tokenDoc?.value?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN

  if (!refreshToken) {
    throw new Error(
      'Google Calendar is not linked yet. Please visit /api/auth/google/connect in your browser to link BokBok Google Account.',
    )
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: tokenDoc?.value?.access_token,
  })

  // Listen for refreshed tokens and save back to MongoDB settings
  oauth2Client.on('tokens', async (newTokens) => {
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
  })

  cachedCalendar = google.calendar({ version: 'v3', auth: oauth2Client })
  return cachedCalendar
}

export function resetCalendarCache() {
  cachedCalendar = null
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
  const calendar = await getOAuthCalendarClient()

  const startDateTime = `${input.date}T${input.time}:00`
  const startDate = new Date(`${input.date}T${input.time}:00`)
  startDate.setMinutes(startDate.getMinutes() + input.durationMinutes)
  const endHours = String(startDate.getHours()).padStart(2, '0')
  const endMinutes = String(startDate.getMinutes()).padStart(2, '0')
  const endDateTime = `${input.date}T${endHours}:${endMinutes}:00`

  // Build Attendees list: Client + Expert + bokbok.bookings@gmail.com
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
    attendees.push({
      email: input.expertEmail.trim(),
      displayName: input.expertName || 'Expert',
    })
  }

  // 3. Central BokBok booking notifications email
  const bokBokCentralEmail = (
    process.env.ADMIN_NOTIFICATION_EMAIL || 'bokbok.bookings@gmail.com'
  ).toLowerCase().trim()

  if (!attendees.some((a) => a.email.toLowerCase() === bokBokCentralEmail)) {
    attendees.push({
      email: bokBokCentralEmail,
      displayName: 'BokBok Team',
    })
  }

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1, // Creates Google Meet link
    sendUpdates: 'all', // Sends calendar invitations via email to all attendees
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
      conferenceData: {
        createRequest: {
          requestId: `bokbok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
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
    eventData.conferenceData?.entryPoints?.[0]?.uri ||
    eventData.hangoutLink ||
    ''

  return {
    eventId: eventData.id || '',
    eventLink: eventData.htmlLink || '',
    meetLink,
  }
}

/**
 * Delete event when booking is cancelled or rejected
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!eventId) return
  try {
    const calendar = await getOAuthCalendarClient()
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    })
  } catch (error: any) {
    console.error('[Google Calendar] Failed to delete event:', error.message)
  }
}

/**
 * Confirms a booking, resolves expert email, and creates calendar event + Meet link.
 */
export async function confirmBookingAndCreateCalendar(bookingIdOrReference: string) {
  const bookingsCol = await getBookingsCollection()
  const expertsCol = await getExpertsCollection()
  const usersCol = await getUsersCollection()

  let booking = null
  try {
    booking = await bookingsCol.findOne({ _id: toObjectId(bookingIdOrReference) })
  } catch {
    booking = await bookingsCol.findOne({ reference: bookingIdOrReference })
  }

  if (!booking) {
    throw new Error(`Booking not found: ${bookingIdOrReference}`)
  }

  // Already has calendar event
  if ((booking as any).googleCalendarEventId) {
    return booking
  }

  // Resolve expert details
  let expertName = 'BokBok Expert'
  let expertEmail: string | undefined = undefined

  if (booking.expertId) {
    const expertDoc = await expertsCol.findOne({ _id: booking.expertId })
    if (expertDoc) {
      expertName = expertDoc.name
      // Look for expert's user doc to get their email
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

  const serviceTitle = booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'

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
  })

  const updateData = {
    googleCalendarEventId: calendarResult.eventId,
    googleCalendarEventLink: calendarResult.eventLink,
    googleMeetLink: calendarResult.meetLink,
    updatedAt: new Date(),
  }

  await bookingsCol.updateOne({ _id: booking._id }, { $set: updateData })

  return { ...booking, ...updateData }
}
