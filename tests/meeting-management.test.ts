import test from 'node:test'
import assert from 'node:assert/strict'
import { computeSessionBounds, getCurrentHourInTimezone } from '../lib/email/scheduler'
import { resolveAttendanceStatus } from '../lib/booking/attendance'
import { extractGoogleMeetCode, matchParticipantsToRoles } from '../lib/google-calendar'
import {
  renderBookingConfirmationEmail,
  renderDayOfReminderEmail,
  renderBeforeSessionReminderEmail,
  renderMeetLinkUpdatedEmail,
  renderRescheduleConfirmedEmail,
} from '../lib/email/templates'
import type { BookingDoc } from '../lib/db'

test('Session Bounds: converts local Cairo date and time to UTC bounds', () => {
  const { sessionStartAt, sessionEndAt } = computeSessionBounds(
    '2026-11-10',
    '15:00',
    45,
    'Africa/Cairo'
  )

  assert.ok(sessionStartAt instanceof Date)
  assert.ok(sessionEndAt instanceof Date)

  // 45 minutes duration
  const diffMinutes = (sessionEndAt.getTime() - sessionStartAt.getTime()) / (60 * 1000)
  assert.equal(diffMinutes, 45)

  // Format back in Cairo to ensure exact match
  const cairoTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(sessionStartAt)
  assert.equal(cairoTime, '15:00')
})

test('Rescheduling Policy: deadline formula calculation', () => {
  const { sessionStartAt } = computeSessionBounds('2026-11-10', '16:00', 60, 'Africa/Cairo')

  // Expert with 24 hours deadline
  const deadlineHours = 24
  const deadlineMs = sessionStartAt.getTime() - deadlineHours * 60 * 60 * 1000
  const deadline = new Date(deadlineMs)

  // 25 hours before session -> Should be allowed
  const beforeDeadline = new Date(sessionStartAt.getTime() - 25 * 60 * 60 * 1000)
  assert.equal(beforeDeadline < deadline, true)

  // 23 hours before session -> Should be disallowed
  const afterDeadline = new Date(sessionStartAt.getTime() - 23 * 60 * 60 * 1000)
  assert.equal(afterDeadline < deadline, false)
})

test('Attendance Verification Matrix: resolveAttendanceStatus', () => {
  // 1. Both attended => completed
  assert.equal(resolveAttendanceStatus('attended', 'attended', false), 'completed')

  // 2. Both absent => both_absent
  assert.equal(resolveAttendanceStatus('absent', 'absent', false), 'both_absent')

  // 3. Conflicting reports => disputed
  assert.equal(resolveAttendanceStatus('attended', 'absent', false), 'disputed')
  assert.equal(resolveAttendanceStatus('absent', 'attended', false), 'disputed')

  // 4. One report submitted within window => pending
  assert.equal(resolveAttendanceStatus('attended', undefined, false), 'pending')
  assert.equal(resolveAttendanceStatus(undefined, 'attended', false), 'pending')
  assert.equal(resolveAttendanceStatus('absent', undefined, false), 'pending')

  // 5. One report submitted and reporting window expired
  assert.equal(resolveAttendanceStatus('attended', undefined, true), 'completed')
  assert.equal(resolveAttendanceStatus('absent', undefined, true), 'client_absent')
  assert.equal(resolveAttendanceStatus(undefined, 'absent', true), 'expert_absent')
  assert.equal(resolveAttendanceStatus(undefined, 'attended', true), 'completed')
})

test('Email Templates: Booking Confirmation notifies that Google Meet link will be sent 15m before session', () => {
  const mockBooking: BookingDoc = {
    reference: 'BK-7788',
    expertId: null as any,
    serviceTitle: { en: 'Product Strategy Session', ar: 'جلسة استراتيجية' },
    clientName: 'Sara Ahmed',
    clientEmail: 'sara@example.com',
    date: '2026-11-12',
    time: '14:00',
    durationMinutes: 45,
    status: 'confirmed',
    timezone: 'Africa/Cairo',
    createdAt: new Date(),
  }

  const { subject, html, text } = renderBookingConfirmationEmail({
    booking: mockBooking,
    expertName: 'Omar Wagih',
    clientName: 'Sara Ahmed',
    serviceTitle: 'Product Strategy Session',
    rescheduleUrl: 'http://localhost:3000/bookings/123?token=abc',
    recipientRole: 'client',
  })

  assert.ok(subject.includes('Booking Confirmed'))
  assert.ok(html.includes('15 minutes before the session starts'))
  assert.ok(html.includes('http://localhost:3000/bookings/123?token=abc'))
  assert.ok(text.includes('BK-7788'))
  // Ensure client/expert emails are NOT exposed in email body
  assert.equal(html.includes('sara@example.com'), false)
  assert.equal(text.includes('sara@example.com'), false)
})

test('Email Templates: Reminder 1 (Day-of) & Reminder 2 (Pre-Session)', () => {
  const mockBooking: BookingDoc = {
    reference: 'BK-9900',
    expertId: null as any,
    clientName: 'Karim Tarek',
    clientEmail: 'karim@example.com',
    date: '2026-11-15',
    time: '18:30',
    durationMinutes: 30,
    status: 'confirmed',
    createdAt: new Date(),
  }

  // Day-of reminder (10:00 AM session day)
  const dayOf = renderDayOfReminderEmail({
    booking: mockBooking,
    expertName: 'Layla Hassan',
    clientName: 'Karim Tarek',
    serviceTitle: 'Growth Strategy',
    meetLink: 'https://meet.google.com/xyz-uvw-rst',
    rescheduleUrl: 'http://localhost:3000/bookings/456?token=tok123',
    recipientRole: 'client',
  })
  assert.ok(dayOf.subject.includes("Today's Session"))
  assert.ok(dayOf.html.includes('15 minutes before the session starts'))
  assert.ok(dayOf.html.includes('http://localhost:3000/bookings/456?token=tok123'))
  assert.ok(dayOf.text.includes('http://localhost:3000/bookings/456?token=tok123'))
  assert.equal(dayOf.html.includes('https://meet.google.com'), false)

  // Verify 10:00 AM Cairo hour calculation (08:00 UTC in standard UTC+2)
  const tenAmCairo = new Date(Date.UTC(2026, 10, 15, 8, 5, 0))
  assert.equal(getCurrentHourInTimezone('Africa/Cairo', tenAmCairo), 10)

  // 15-min before session reminder
  const beforeSession = renderBeforeSessionReminderEmail({
    booking: mockBooking,
    expertName: 'Layla Hassan',
    clientName: 'Karim Tarek',
    serviceTitle: 'Growth Strategy',
    meetLink: 'https://meet.google.com/xyz-uvw-rst',
    minutesBefore: 15,
    recipientRole: 'client',
  })
  assert.ok(beforeSession.subject.includes('Starting in 15 Minutes'))
  assert.ok(beforeSession.html.includes('Join Google Meet Now'))
})

test('Google Meet Telemetry: extractGoogleMeetCode & matchParticipantsToRoles', () => {
  assert.equal(
    extractGoogleMeetCode('https://meet.google.com/abc-defg-hij?authuser=0'),
    'abc-defg-hij'
  )
  assert.equal(extractGoogleMeetCode('https://example.com/room'), null)

  const clientJoinTime = new Date('2026-11-15T14:00:00Z')
  const expertJoinTime = new Date('2026-11-15T14:02:00Z')

  const matched = matchParticipantsToRoles({
    clientName: 'Sara Ahmed',
    expertName: 'Omar Wagih',
    clientJoin: {
      firstJoinedAt: clientJoinTime,
      lastJoinedAt: clientJoinTime,
      joinCount: 1,
    },
    expertJoin: {
      firstJoinedAt: expertJoinTime,
      lastJoinedAt: expertJoinTime,
      joinCount: 1,
    },
    participants: [
      {
        participantId: 'conferenceRecords/1/participants/p1',
        displayName: 'Sara A.',
        userType: 'signed_in',
        joinedAt: new Date('2026-11-15T14:00:12Z'),
        leftAt: new Date('2026-11-15T14:44:12Z'),
        durationSeconds: 2640,
        durationMinutes: 44,
        sessionsCount: 1,
        isActive: false,
      },
      {
        participantId: 'conferenceRecords/1/participants/p2',
        displayName: 'Guest User',
        userType: 'anonymous',
        joinedAt: new Date('2026-11-15T14:02:08Z'),
        leftAt: new Date('2026-11-15T14:45:08Z'),
        durationSeconds: 2580,
        durationMinutes: 43,
        sessionsCount: 1,
        isActive: false,
      },
    ],
  })

  assert.equal(matched[0].matchedRole, 'client')
  assert.equal(matched[0].durationMinutes, 44)
  assert.equal(matched[1].matchedRole, 'expert')
  assert.equal(matched[1].durationMinutes, 43)
})

