/**
 * Service classification model shared by server code, UI and tests.
 *
 * IMPORTANT: this module must stay free of runtime imports so it can be executed
 * directly by Node's test runner (`node --experimental-strip-types --test`).
 *
 * Concepts (kept deliberately separate):
 *  - bookingType  → which booking WORKFLOW applies (appointment slots vs event registration)
 *  - serviceKind  → public classification of APPOINTMENT services (navigation placement)
 *  - category / subcategory → professional field (discovery)
 *  - tags         → extra searchable descriptors (never control behaviour)
 */

export const BOOKING_TYPES = ['APPOINTMENT', 'WORKSHOP', 'WEBINAR'] as const
export type BookingType = (typeof BOOKING_TYPES)[number]

export const SERVICE_KINDS = ['CONSULTATION', 'GENERAL_SERVICE'] as const
export type ServiceKind = (typeof SERVICE_KINDS)[number]

export const DELIVERY_MODES = ['ONLINE', 'IN_PERSON', 'HYBRID'] as const
export type DeliveryMode = (typeof DELIVERY_MODES)[number]

export const EVENT_BOOKING_TYPES: BookingType[] = ['WORKSHOP', 'WEBINAR']

/** Public listing contexts (one per navigation item, plus "all"). */
export const CATALOG_VIEWS = ['consultations', 'services', 'workshops', 'webinars', 'all'] as const
export type CatalogView = (typeof CATALOG_VIEWS)[number]
export type ListingContext = Exclude<CatalogView, 'all'>

/** Provider-facing "offering type" — a UI convenience mapping onto bookingType + serviceKind. */
export const OFFERING_TYPES = ['CONSULTATION', 'GENERAL_SERVICE', 'WORKSHOP', 'WEBINAR'] as const
export type OfferingType = (typeof OFFERING_TYPES)[number]

/**
 * Booking statuses that hold capacity (an appointment slot or an event seat).
 * `awaiting_payment` and `awaiting_verification` MUST be included, otherwise a slot
 * with an uploaded receipt could be double-booked.
 */
export const ACTIVE_BOOKING_STATUSES = [
  'pending',
  'awaiting_payment',
  'awaiting_verification',
  'confirmed',
] as const

export function isActiveBookingStatus(status: string | undefined | null): boolean {
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(String(status))
}

interface ClassifiableService {
  bookingType?: string | null
  serviceKind?: string | null
}

export function isBookingType(value: unknown): value is BookingType {
  return typeof value === 'string' && (BOOKING_TYPES as readonly string[]).includes(value)
}

export function isServiceKind(value: unknown): value is ServiceKind {
  return typeof value === 'string' && (SERVICE_KINDS as readonly string[]).includes(value)
}

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return typeof value === 'string' && (DELIVERY_MODES as readonly string[]).includes(value)
}

export function isCatalogView(value: unknown): value is CatalogView {
  return typeof value === 'string' && (CATALOG_VIEWS as readonly string[]).includes(value)
}

/** Legacy records have no bookingType: they were all appointment-based consultations. */
export function resolveBookingType(service: ClassifiableService): BookingType {
  return isBookingType(service.bookingType) ? service.bookingType : 'APPOINTMENT'
}

/**
 * Returns the appointment classification, or null for event types.
 * Legacy appointment records without serviceKind are consultations — they are never
 * silently re-classified as general services.
 */
export function resolveServiceKind(service: ClassifiableService): ServiceKind | null {
  if (resolveBookingType(service) !== 'APPOINTMENT') return null
  return isServiceKind(service.serviceKind) ? service.serviceKind : 'CONSULTATION'
}

export function resolveBookingClassification(service: {
  bookingType?: string | null
  serviceKind?: string | null
  deliveryMode?: string | null
}): {
  bookingType: BookingType
  serviceKind: ServiceKind | null
  deliveryMode: DeliveryMode
} {
  const bookingType = resolveBookingType(service)
  const serviceKind = resolveServiceKind(service)
  const deliveryMode = isDeliveryMode(service.deliveryMode) ? service.deliveryMode : 'ONLINE'
  return { bookingType, serviceKind, deliveryMode }
}

export function isAppointmentBookingEngine(bookingType: string | undefined | null): boolean {
  return bookingType === 'APPOINTMENT' || !bookingType
}

export function isEventBookingEngine(bookingType: string | undefined | null): boolean {
  return bookingType === 'WORKSHOP' || bookingType === 'WEBINAR'
}

export function isEventService(service: ClassifiableService): boolean {
  return EVENT_BOOKING_TYPES.includes(resolveBookingType(service))
}

/** The single listing context a service belongs to (prevents duplicate listings). */
export function getListingContext(service: ClassifiableService): ListingContext {
  const bookingType = resolveBookingType(service)
  if (bookingType === 'WORKSHOP') return 'workshops'
  if (bookingType === 'WEBINAR') return 'webinars'
  return resolveServiceKind(service) === 'GENERAL_SERVICE' ? 'services' : 'consultations'
}

export function getOfferingType(service: ClassifiableService): OfferingType {
  const bookingType = resolveBookingType(service)
  if (bookingType !== 'APPOINTMENT') return bookingType
  return resolveServiceKind(service) || 'CONSULTATION'
}

export function offeringTypeToModel(type: OfferingType): {
  bookingType: BookingType
  serviceKind: ServiceKind | null
} {
  if (type === 'WORKSHOP' || type === 'WEBINAR') return { bookingType: type, serviceKind: null }
  return { bookingType: 'APPOINTMENT', serviceKind: type }
}

const APPOINTMENT_TYPE_FILTER = {
  $or: [{ bookingType: 'APPOINTMENT' }, { bookingType: { $exists: false } }, { bookingType: null }],
}

/**
 * MongoDB filter selecting services for one listing context.
 * Must stay consistent with getListingContext() (covered by tests).
 */
export function buildClassificationFilter(
  view: CatalogView | ListingContext,
): Record<string, unknown> {
  if (view === 'all') return {}
  switch (view) {
    case 'consultations':
      return {
        $and: [
          APPOINTMENT_TYPE_FILTER,
          {
            $or: [
              { serviceKind: 'CONSULTATION' },
              { serviceKind: { $exists: false } },
              { serviceKind: null },
            ],
          },
        ],
      }
    case 'services':
      return { $and: [APPOINTMENT_TYPE_FILTER, { serviceKind: 'GENERAL_SERVICE' }] }
    case 'workshops':
      return { bookingType: 'WORKSHOP' }
    case 'webinars':
      return { bookingType: 'WEBINAR' }
  }
}

/** Human-friendly duration, e.g. 45 → "45 min", 150 → "2h 30m". */
export function formatDurationLabel(minutes: number, locale: 'en' | 'ar' = 'en'): string {
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (locale === 'ar') {
    if (h === 0) return `${m} دقيقة`
    return m === 0 ? `${h} ساعة` : `${h} ساعة و${m} دقيقة`
  }
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Standard URL-safe slug generator for offerings and taxonomy. */
export function slugify(text: string): string {
  const s = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'service'
}
