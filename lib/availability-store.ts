import fs from 'fs'
import path from 'path'
import {
  type AvailabilitySettings,
  type DateOverrideItem,
  DEFAULT_WEEKLY_SCHEDULE,
  DEFAULT_SLOT_INTERVAL,
} from '@/lib/data/availability'
import { EXPERTS } from '@/lib/data/experts'

export interface BookingRecord {
  id: string
  expertId: string
  expertSlug?: string
  clientName: string
  clientEmail?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMinutes: number
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

interface StoreData {
  settings: Record<string, AvailabilitySettings> // keyed by `availability_schedule_${expertId}`
  overrides: Record<string, DateOverrideItem[]> // keyed by expertId
  bookings: BookingRecord[]
}

const DATA_DIR = path.join(process.cwd(), '.data')
const STORE_FILE = path.join(DATA_DIR, 'availability-store.json')

// Helper to resolve an ID or Slug to the expert's canonical ID
export function resolveExpertId(idOrSlug: string): string {
  const match = EXPERTS.find((e) => e.id === idOrSlug || e._id === idOrSlug || e.slug === idOrSlug)
  return match ? match.id : idOrSlug
}

// Initial preloaded data for demo experts by ID
const INITIAL_SETTINGS: Record<string, AvailabilitySettings> = {
  'availability_schedule_6708a0000000000000000001': {
    weeklySchedule: {
      ...DEFAULT_WEEKLY_SCHEDULE,
      0: {
        enabled: true,
        startTime: '10:00',
        endTime: '18:00',
        breaks: [{ id: 'b0-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }],
      },
      1: {
        enabled: true,
        startTime: '10:00',
        endTime: '18:00',
        breaks: [{ id: 'b1-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }],
      },
      2: {
        enabled: true,
        startTime: '10:00',
        endTime: '18:00',
        breaks: [{ id: 'b2-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }],
      },
      3: {
        enabled: true,
        startTime: '10:00',
        endTime: '18:00',
        breaks: [{ id: 'b3-1', start: '13:00', end: '14:00', label: 'Lunch & Sync' }],
      },
      4: {
        enabled: true,
        startTime: '10:00',
        endTime: '16:00',
        breaks: [{ id: 'b4-1', start: '12:30', end: '13:30', label: 'Lunch' }],
      },
      5: { enabled: false, startTime: '10:00', endTime: '18:00', breaks: [] },
      6: { enabled: false, startTime: '10:00', endTime: '15:00', breaks: [] },
    },
    slotIntervalMinutes: 45,
  },
  'availability_schedule_6708a0000000000000000002': {
    weeklySchedule: { ...DEFAULT_WEEKLY_SCHEDULE },
    slotIntervalMinutes: 30,
  },
  'availability_schedule_6708a0000000000000000003': {
    weeklySchedule: {
      ...DEFAULT_WEEKLY_SCHEDULE,
      4: {
        enabled: true,
        startTime: '08:30',
        endTime: '16:30',
        breaks: [{ id: 'b4-1', start: '12:00', end: '13:00', label: 'Lunch' }],
      },
      6: {
        enabled: true,
        startTime: '11:00',
        endTime: '16:00',
        breaks: [],
      },
    },
    slotIntervalMinutes: 30,
  },
}

const INITIAL_OVERRIDES: Record<string, DateOverrideItem[]> = {
  '6708a0000000000000000001': [
    {
      id: 'ov-layla-1',
      expertId: '6708a0000000000000000001',
      expertSlug: 'layla-hassan',
      date: '2026-10-16',
      type: 'closed',
      reason: 'Product Leaders Summit Speaker',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ov-layla-2',
      expertId: '6708a0000000000000000001',
      expertSlug: 'layla-hassan',
      date: '2026-10-17',
      type: 'custom',
      startTime: '14:00',
      endTime: '19:00',
      breaks: [],
      reason: 'Special Weekend Strategy Clinic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  '6708a0000000000000000002': [
    {
      id: 'ov-ahmed-1',
      expertId: '6708a0000000000000000002',
      expertSlug: 'ahmed-mohamed',
      date: '2026-10-20',
      type: 'closed',
      reason: 'Client Onsite Training Day',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
}

let memoryStore: StoreData | null = null

function ensureStore(): StoreData {
  if (memoryStore) {
    return memoryStore
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as StoreData
      memoryStore = {
        settings: { ...INITIAL_SETTINGS, ...(parsed.settings || {}) },
        overrides: { ...INITIAL_OVERRIDES, ...(parsed.overrides || {}) },
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      }
      return memoryStore
    }
  } catch (err) {
    console.error('Failed to read store file, falling back to initial data:', err)
  }

  memoryStore = {
    settings: { ...INITIAL_SETTINGS },
    overrides: { ...INITIAL_OVERRIDES },
    bookings: [],
  }

  saveStore(memoryStore)
  return memoryStore
}

function saveStore(data: StoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save availability store to disk:', err)
  }
}

export function getExpertSettingsKey(expertId: string): string {
  return `availability_schedule_${resolveExpertId(expertId)}`
}

export function loadExpertSettings(expertId: string): AvailabilitySettings {
  const store = ensureStore()
  const key = getExpertSettingsKey(expertId)
  const existing = store.settings[key]

  if (existing) {
    return {
      weeklySchedule: {
        ...DEFAULT_WEEKLY_SCHEDULE,
        ...existing.weeklySchedule,
      },
      slotIntervalMinutes: existing.slotIntervalMinutes || DEFAULT_SLOT_INTERVAL,
    }
  }

  return {
    weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
    slotIntervalMinutes: DEFAULT_SLOT_INTERVAL,
  }
}

export function persistExpertSettings(
  expertId: string,
  settings: AvailabilitySettings,
): AvailabilitySettings {
  const store = ensureStore()
  const key = getExpertSettingsKey(expertId)
  store.settings[key] = {
    weeklySchedule: settings.weeklySchedule,
    slotIntervalMinutes: Number(settings.slotIntervalMinutes) || DEFAULT_SLOT_INTERVAL,
  }
  saveStore(store)
  return store.settings[key]
}

export function loadExpertOverrides(expertId: string): DateOverrideItem[] {
  const store = ensureStore()
  const canonicalId = resolveExpertId(expertId)
  const list = store.overrides[canonicalId] || []
  return [...list].sort((a, b) => a.date.localeCompare(b.date))
}

export function persistExpertOverride(
  expertId: string,
  override: Partial<DateOverrideItem>,
): DateOverrideItem {
  const store = ensureStore()
  const canonicalId = resolveExpertId(expertId)
  if (!store.overrides[canonicalId]) {
    store.overrides[canonicalId] = []
  }

  const list = store.overrides[canonicalId]
  const id = override.id || override._id || `ov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const existingIndex = list.findIndex(
    (o) => (o.id && o.id === id) || (o._id && o._id === id) || o.date === override.date,
  )

  const updatedItem: DateOverrideItem = {
    id,
    _id: id,
    expertId: canonicalId,
    expertSlug: override.expertSlug,
    date: override.date || '',
    type: override.type || 'closed',
    startTime: override.startTime || '09:00',
    endTime: override.endTime || '17:00',
    breaks: Array.isArray(override.breaks) ? override.breaks : [],
    reason: (override.reason || '').trim(),
    createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    list[existingIndex] = updatedItem
  } else {
    list.push(updatedItem)
  }

  store.overrides[canonicalId] = list
  saveStore(store)
  return updatedItem
}

export function deleteExpertOverride(expertId: string, idOrDate: string): boolean {
  const store = ensureStore()
  const canonicalId = resolveExpertId(expertId)
  const list = store.overrides[canonicalId] || []
  const initialLen = list.length

  store.overrides[canonicalId] = list.filter(
    (o) => o.id !== idOrDate && o._id !== idOrDate && o.date !== idOrDate,
  )

  const removed = store.overrides[canonicalId].length < initialLen
  if (removed) {
    saveStore(store)
  }
  return removed
}

export function loadExpertBookings(expertId: string, dateStr?: string): BookingRecord[] {
  const store = ensureStore()
  const canonicalId = resolveExpertId(expertId)
  return store.bookings.filter((b) => {
    if (b.expertId !== canonicalId) return false
    if (b.status === 'cancelled') return false
    if (dateStr && b.date !== dateStr) return false
    return true
  })
}

export function createExpertBooking(booking: Omit<BookingRecord, 'id' | 'createdAt'>): BookingRecord {
  const store = ensureStore()
  const canonicalId = resolveExpertId(booking.expertId)
  const record: BookingRecord = {
    ...booking,
    expertId: canonicalId,
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  }
  store.bookings.push(record)
  saveStore(store)
  return record
}
