/**
 * Conditional, booking-type-aware validation for service offerings.
 * Pure module (only relative .ts imports) so it can run under Node's test runner.
 *
 * Database-dependent checks (category/subcategory activation, tag activation,
 * ownership, existing bookings) are done by the API route on top of this.
 */
import {
  type BookingType,
  type DeliveryMode,
  type ServiceKind,
  isBookingType,
  isDeliveryMode,
  isServiceKind,
  resolveBookingType,
  resolveServiceKind,
  slugify,
} from './service-types'
import {
  MAX_APPOINTMENT_MINUTES,
  MIN_APPOINTMENT_MINUTES,
  isValidISODate,
  isValidTimeString,
  parseTimeToMinutes,
} from '../booking/scheduling'

export interface LocalizedValue {
  en: string
  ar: string
}

export interface ServiceLocation {
  city: string
  address: string
}

export interface ServiceEventDetails {
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  timezone: string // IANA, e.g. Africa/Cairo
  capacity: number
  registeredCount: number
  joinUrl?: string // never exposed publicly
  platform?: string
}

export interface NormalizedService {
  slug?: string
  title: LocalizedValue
  description: LocalizedValue
  categorySlug: string
  subcategorySlug: string
  tags: string[]
  bookingType: BookingType
  serviceKind?: ServiceKind
  deliveryMode: DeliveryMode
  location?: ServiceLocation
  durationMinutes: number
  breakAfterMinutes: number
  pricing: { baseCurrency: string; prices: Record<string, number> }
  event?: ServiceEventDetails
}

export interface ServiceValidationResult {
  ok: boolean
  errors: string[]
  value?: NormalizedService
  /** fields that are irrelevant for the resulting booking type and must be removed */
  unset: Array<'event' | 'serviceKind' | 'location'>
}

export interface ServiceValidationOptions {
  /** Local "today" (YYYY-MM-DD) used to reject past events. */
  todayISO?: string
  /** The persisted document when updating (raw input is merged on top of it). */
  existing?: Record<string, any> | null
}

export const DEFAULT_EVENT_TIMEZONE = 'Africa/Cairo'

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function normalizeTagSlugs(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const out = new Set<string>()
  for (const t of tags) {
    const slug = str(t).toLowerCase()
    if (slug) out.add(slug)
  }
  return [...out]
}

function normalizePricing(
  raw: any,
  errors: string[],
): { baseCurrency: string; prices: Record<string, number> } {
  const baseCurrency = (str(raw?.baseCurrency) || 'EGP').toUpperCase()
  const prices: Record<string, number> = {}
  const source =
    raw?.prices && typeof raw.prices === 'object'
      ? raw.prices
      : raw?.amount !== undefined
        ? { [baseCurrency]: raw.amount }
        : {}

  for (const [code, value] of Object.entries(source)) {
    const cur = code.toUpperCase()
    if (!/^[A-Z]{3}$/.test(cur)) continue
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) {
      errors.push(`Price for ${cur} must be a non-negative number`)
      continue
    }
    prices[cur] = n
  }

  if (prices[baseCurrency] === undefined) {
    errors.push(`A price in the base currency (${baseCurrency}) is required`)
  }
  return { baseCurrency, prices }
}

function normalizeLocation(raw: any): ServiceLocation | undefined {
  if (!raw) return undefined
  if (typeof raw === 'string') {
    const address = raw.trim()
    return address ? { city: '', address } : undefined
  }
  const city = str(raw.city)
  const address = str(raw.address)
  return city || address ? { city, address } : undefined
}

/**
 * Validate & normalize a create/update payload according to its booking type.
 * For updates, pass `existing`; the payload is merged over it so validation always
 * runs against the full resulting document.
 */
export function validateServiceInput(
  input: Record<string, any>,
  options: ServiceValidationOptions = {},
): ServiceValidationResult {
  const errors: string[] = []
  const existing = options?.existing || {}
  const todayISO = options?.todayISO || new Date().toISOString().slice(0, 10)
  const pick = (key: string) => (input[key] !== undefined ? input[key] : existing[key])

  // ---- booking type & classification ------------------------------------
  const rawType = pick('bookingType')
  if (rawType !== undefined && rawType !== null && rawType !== '' && !isBookingType(rawType)) {
    errors.push(`Invalid booking type: ${rawType}`)
  }
  const bookingType = resolveBookingType({ bookingType: isBookingType(rawType) ? rawType : undefined })

  let serviceKind: ServiceKind | undefined
  if (bookingType === 'APPOINTMENT') {
    const rawKind = pick('serviceKind')
    if (rawKind !== undefined && rawKind !== null && rawKind !== '' && !isServiceKind(rawKind)) {
      errors.push(`Invalid service classification: ${rawKind}`)
    }
    serviceKind =
      resolveServiceKind({ bookingType, serviceKind: isServiceKind(rawKind) ? rawKind : undefined }) ||
      'CONSULTATION'
  }

  // ---- shared fields -------------------------------------------------------
  const rawTitle = pick('title') || {}
  const title = { en: str(rawTitle.en), ar: str(rawTitle.ar) }
  if (!title.en || !title.ar) errors.push('Title in both English and Arabic is required')

  const rawDesc = pick('description') || {}
  const description = { en: str(rawDesc.en), ar: str(rawDesc.ar) }

  const categorySlug = str(pick('categorySlug'))
  if (!categorySlug) errors.push('Category is required')
  const subcategorySlug = str(pick('subcategorySlug'))

  const tags = normalizeTagSlugs(pick('tags'))
  const pricing = normalizePricing(pick('pricing'), errors)

  // ---- delivery mode & location -------------------------------------------
  const rawMode = pick('deliveryMode')
  if (rawMode !== undefined && rawMode !== null && rawMode !== '' && !isDeliveryMode(rawMode)) {
    errors.push(`Invalid delivery mode: ${rawMode}`)
  }
  let deliveryMode: DeliveryMode = isDeliveryMode(rawMode) ? rawMode : 'ONLINE'
  if (bookingType === 'WEBINAR') deliveryMode = 'ONLINE' // webinars are online by definition

  const location = deliveryMode === 'ONLINE' ? undefined : normalizeLocation(pick('location'))
  if (deliveryMode !== 'ONLINE' && !location) {
    errors.push('A location (city or address) is required for in-person or hybrid offerings')
  }

  const unset: ServiceValidationResult['unset'] = []
  if (deliveryMode === 'ONLINE') unset.push('location')

  let durationMinutes = 0
  let breakAfterMinutes = 0
  let event: ServiceEventDetails | undefined

  if (bookingType === 'APPOINTMENT') {
    // ---- appointment (consultation or general service) -------------------
    unset.push('event')
    const rawDuration = pick('durationMinutes')
    durationMinutes = Number(rawDuration)
    if (rawDuration === undefined || rawDuration === null || rawDuration === '') {
      errors.push('Duration is required for appointment-based services')
    } else if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < MIN_APPOINTMENT_MINUTES ||
      durationMinutes > MAX_APPOINTMENT_MINUTES
    ) {
      errors.push(
        `Duration must be a whole number of minutes between ${MIN_APPOINTMENT_MINUTES} and ${MAX_APPOINTMENT_MINUTES} (appointments must fit within one day)`,
      )
    } else if (durationMinutes % 5 !== 0) {
      errors.push('Duration must be a multiple of 5 minutes')
    }

    const rawBreak = pick('breakAfterMinutes')
    breakAfterMinutes = rawBreak === undefined || rawBreak === null || rawBreak === '' ? 0 : Number(rawBreak)
    if (!Number.isInteger(breakAfterMinutes) || breakAfterMinutes < 0 || breakAfterMinutes > MAX_APPOINTMENT_MINUTES) {
      errors.push('Break buffer must be a non-negative whole number of minutes')
    }
  } else {
    // ---- workshop / webinar -----------------------------------------------
    unset.push('serviceKind')
    const rawEvent = { ...(existing.event || {}), ...(input.event || {}) }
    const date = str(rawEvent.date)
    const startTime = str(rawEvent.startTime)
    const endTime = str(rawEvent.endTime)
    const timezone = str(rawEvent.timezone) || DEFAULT_EVENT_TIMEZONE
    const capacity = Number(rawEvent.capacity)
    const registeredCount = Math.max(0, Number(existing.event?.registeredCount) || 0)
    const joinUrl = str(rawEvent.joinUrl)
    const platform = str(rawEvent.platform)

    if (!isValidISODate(date)) {
      errors.push('Event date is required (YYYY-MM-DD)')
    } else {
      const dateChanged = !existing.event || existing.event.date !== date
      if (dateChanged && date < todayISO) errors.push('Event date cannot be in the past')
    }
    if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
      errors.push('Event start and end times are required (HH:mm)')
    } else if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
      errors.push('Event end time must be after the start time')
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      errors.push('Registration capacity must be a whole number of at least 1')
    } else if (capacity < registeredCount) {
      errors.push(`Capacity cannot be lower than the ${registeredCount} seats already registered`)
    }
    if (bookingType === 'WEBINAR' && !joinUrl) {
      errors.push('A joining link is required for webinars')
    }
    if (joinUrl && !isHttpUrl(joinUrl)) {
      errors.push('Joining link must be a valid http(s) URL')
    }

    if (isValidTimeString(startTime) && isValidTimeString(endTime)) {
      durationMinutes = Math.max(0, parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime))
    }
    event = {
      date,
      startTime,
      endTime,
      timezone,
      capacity: Number.isInteger(capacity) ? capacity : 0,
      registeredCount,
      ...(joinUrl ? { joinUrl } : {}),
      ...(platform ? { platform } : {}),
    }
  }

  if (errors.length > 0) return { ok: false, errors, unset }

  const rawSlug = pick('slug')
  const slug = rawSlug ? slugify(rawSlug) : undefined

  const value: NormalizedService = {
    title,
    description,
    categorySlug,
    subcategorySlug,
    tags,
    bookingType,
    deliveryMode,
    durationMinutes,
    breakAfterMinutes,
    pricing,
    ...(slug ? { slug } : {}),
    ...(serviceKind ? { serviceKind } : {}),
    ...(location ? { location } : {}),
    ...(event ? { event } : {}),
  }
  return { ok: true, errors: [], value, unset }
}
