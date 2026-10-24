export interface DayAvailability {
  date: string // YYYY-MM-DD
  hasSlots: boolean
  reason?: string
}

export interface TimeSlot {
  time: string // "HH:mm" 24h
  available: boolean
}

export interface BreakInterval {
  id: string
  start: string // HH:mm
  end: string // HH:mm
  label?: string // e.g. "Lunch", "Focus block"
}

export interface DaySchedule {
  enabled: boolean
  startTime: string // HH:mm
  endTime: string // HH:mm
  breaks: BreakInterval[]
}

export interface AvailabilitySettings {
  weeklySchedule: Record<number, DaySchedule>
  slotIntervalMinutes: number
}

export type DateOverrideType = 'closed' | 'open' | 'custom'

export interface DateOverrideItem {
  _id?: string
  id?: string
  expertId?: string
  expertSlug?: string
  date: string // YYYY-MM-DD
  type: DateOverrideType
  startTime?: string // HH:mm (for 'open' or 'custom')
  endTime?: string // HH:mm
  breaks?: BreakInterval[]
  reason?: string // e.g. "Public Holiday", "Special Evening Shift", "Travel"
  createdAt?: string | Date
  updatedAt?: string | Date
}

/**
 * Default schedule fallback:
 * Sunday (0) to Thursday (4): 09:00 - 17:00 (with 13:00 - 14:00 lunch break)
 * Friday (5): Closed (Weekend)
 * Saturday (6): 10:00 - 15:00
 */
export const DEFAULT_WEEKLY_SCHEDULE: Record<number, DaySchedule> = {
  0: {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [{ id: 'b0-1', start: '13:00', end: '14:00', label: 'Lunch Break' }],
  },
  1: {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [{ id: 'b1-1', start: '13:00', end: '14:00', label: 'Lunch Break' }],
  },
  2: {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [{ id: 'b2-1', start: '13:00', end: '14:00', label: 'Lunch Break' }],
  },
  3: {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [{ id: 'b3-1', start: '13:00', end: '14:00', label: 'Lunch Break' }],
  },
  4: {
    enabled: true,
    startTime: '09:00',
    endTime: '16:00',
    breaks: [{ id: 'b4-1', start: '13:00', end: '14:00', label: 'Lunch Break' }],
  },
  5: {
    enabled: false, // Friday closed
    startTime: '09:00',
    endTime: '17:00',
    breaks: [],
  },
  6: {
    enabled: true,
    startTime: '10:00',
    endTime: '15:00',
    breaks: [],
  },
}

export const DEFAULT_SLOT_INTERVAL = 30 // minutes

/** Convert "HH:mm" to minutes from midnight */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Convert minutes from midnight to "HH:mm" */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatSlotLabel(time: string, locale: string = 'en'): string {
  const [h, m] = (time || '00:00').split(':').map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

export function formatDateLabel(date: string, locale: string = 'en'): string {
  const d = new Date(date + 'T00:00:00')
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d)
}

export function formatFullDate(date: string, locale: string = 'en'): string {
  const d = new Date(date + 'T00:00:00')
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}
