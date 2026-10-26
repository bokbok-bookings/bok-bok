/**
 * Pure scheduling primitives for the shared APPOINTMENT engine
 * (used for both consultations and general services).
 *
 * No runtime imports from the app — executable by Node's test runner.
 */

export interface TimeRange {
  /** minutes from midnight (inclusive) */
  start: number
  /** minutes from midnight (exclusive) */
  end: number
}

export interface SlotResult {
  time: string // HH:mm
  available: boolean
}

/** Appointments must fit inside a single calendar day in the current slot model. */
export const MAX_APPOINTMENT_MINUTES = 24 * 60
export const MIN_APPOINTMENT_MINUTES = 5

export function parseTimeToMinutes(time: string): number {
  const [h, m] = String(time || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatMinutesAsTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false
  const [h, m] = value.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end)
}

/**
 * Footprint of an existing booking on the provider's calendar.
 * Legacy bookings have no stored buffer → 0 (historical behaviour preserved).
 */
export function bookingFootprint(booking: {
  time: string
  durationMinutes?: number
  bufferAfterMinutes?: number
}): TimeRange {
  const start = parseTimeToMinutes(booking.time)
  const duration = Number(booking.durationMinutes) > 0 ? Number(booking.durationMinutes) : 30
  const buffer = Math.max(0, Number(booking.bufferAfterMinutes) || 0)
  return { start, end: start + duration + buffer }
}

export interface SlotGenerationInput {
  /** working window, minutes from midnight */
  dayStart: number
  dayEnd: number
  /** grid step between candidate start times */
  intervalMinutes: number
  /** length of the service being booked */
  durationMinutes: number
  /** rest time the provider needs after this service (must not collide with other bookings) */
  bufferAfterMinutes?: number
  /** breaks: the appointment itself may not overlap them (its trailing buffer may) */
  breaks?: TimeRange[]
  /** existing bookings and provider events (already including their own buffers) */
  commitments?: TimeRange[]
  /** candidate starts at or before this minute are unavailable (e.g. "now + lead time") */
  notBeforeMinutes?: number | null
}

/**
 * Generate the slot grid for one day. A slot is available only when:
 *  - the appointment ends within the working window,
 *  - the appointment does not overlap a break,
 *  - appointment + trailing buffer does not overlap any commitment.
 *
 * Works for arbitrary durations (e.g. 2–4 hour sessions): every slot whose
 * window intersects a long booking is blocked, not just the booking's start.
 */
export function generateDaySlots(input: SlotGenerationInput): SlotResult[] {
  const interval = Math.max(1, Math.round(input.intervalMinutes) || 30)
  const duration = Math.max(1, Math.round(input.durationMinutes) || interval)
  const buffer = Math.max(0, Math.round(input.bufferAfterMinutes || 0))
  const breaks = input.breaks || []
  const commitments = input.commitments || []
  const slots: SlotResult[] = []

  for (let t = input.dayStart; t + duration <= input.dayEnd; t += interval) {
    const core: TimeRange = { start: t, end: t + duration }
    const withBuffer: TimeRange = { start: t, end: t + duration + buffer }
    const tooSoon = input.notBeforeMinutes != null && t <= input.notBeforeMinutes
    const hitsBreak = breaks.some((b) => b.end > b.start && rangesOverlap(core, b))
    const hitsCommitment = commitments.some((c) => c.end > c.start && rangesOverlap(withBuffer, c))
    slots.push({
      time: formatMinutesAsTime(t),
      available: !tooSoon && !hitsBreak && !hitsCommitment,
    })
  }

  return slots
}

/** Can a service of this length fit inside the open window at all? */
export function windowCanFitDuration(dayStart: number, dayEnd: number, durationMinutes: number): boolean {
  return dayEnd - dayStart >= Math.max(1, durationMinutes)
}

/**
 * Optimistic-concurrency tie-breaker used after inserting a booking:
 * returns true when `candidate` must yield because an EARLIER active booking overlaps it.
 * Ordering key is the insertion order (e.g. ObjectId hex string / creation timestamp).
 */
export function mustYieldToEarlierBooking(
  candidate: { order: string; range: TimeRange },
  others: Array<{ order: string; range: TimeRange }>,
): boolean {
  return others.some((o) => o.order < candidate.order && rangesOverlap(candidate.range, o.range))
}

/** Seat accounting for workshop/webinar registration. */
export function canReserveSeats(capacity: number, registered: number, seats: number): boolean {
  if (!Number.isInteger(seats) || seats < 1) return false
  return Math.max(0, registered || 0) + seats <= Math.max(0, capacity || 0)
}
