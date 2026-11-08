import { ObjectId, Db, Collection } from 'mongodb'
import { getMongoClientPromise } from './mongodb'
import type {
  AvailabilitySettings,
  DateOverrideType,
  BreakInterval,
  DaySchedule,
} from '@/lib/data/availability'

/**
 * Retry a database operation on transient connection errors (as in DrDalia).
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (err: any) {
      lastError = err
      const isTransient =
        err?.name === 'MongoServerSelectionError' ||
        err?.name === 'MongoNetworkError' ||
        err?.name === 'MongoNetworkTimeoutError' ||
        err?.message?.includes('Server selection timed out') ||
        err?.message?.includes('connection') ||
        err?.message?.includes('topology was destroyed')
      if (!isTransient || attempt >= maxRetries) {
        throw err
      }
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClientPromise()
  return client.db('bok_bok')
}

export function toObjectId(val: string | ObjectId): ObjectId {
  if (val instanceof ObjectId) return val
  if (typeof val === 'string' && ObjectId.isValid(val)) {
    return new ObjectId(val)
  }
  throw new Error(`Invalid ObjectId value: ${val}`)
}

export type UserRole = 'admin' | 'expert' | 'client'
export type UserStatus = 'active' | 'pending' | 'disabled'
export type ExpertAccountType = 'expert' | 'organization'
export type PayoutMethod = 'instapay' | 'bank_account'

export interface BankAccountDetails {
  bankName?: string
  accountHolderName?: string
  accountNumber?: string
  iban?: string
}

export interface ExpertCertificate {
  title: string
  fileUrl: string
  fileType?: 'pdf' | 'image'
}

export interface ExpertSocialLinks {
  linkedin?: string
  instagram?: string
  facebook?: string
  twitter?: string
  website?: string
  other?: string
}

export interface SuggestedCategoryInfo {
  categoryName?: string
  subcategoryName?: string
  parentCategorySlug?: string
  notes?: string
  createdAt?: Date
}

export interface UserDoc {
  _id: ObjectId
  email: string
  passwordHash: string
  displayName: string
  fName?: string
  lName?: string
  accountType?: ExpertAccountType
  role: UserRole
  expertId?: ObjectId // Linked expert profile for experts
  phone?: string
  whatsapp?: string
  status: UserStatus
  emailVerified?: boolean
  emailVerificationToken?: string
  emailVerificationExpiresAt?: Date
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export type ExpertStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended'

export interface SelectedCategory {
  categorySlug: string
  subcategories: string[]
}

export interface ExpertDoc {
  _id: ObjectId
  id?: string
  userId?: ObjectId
  accountType?: ExpertAccountType
  fName?: string
  lName?: string
  name: string
  slug: string
  role: string
  location: string
  phone?: string // Admin only
  whatsapp?: string // Admin only
  image: string
  avatarUrl?: string
  nationalIdFrontUrl?: string
  nationalIdBackUrl?: string
  commercialRegisterNumber?: string
  taxNumber?: string
  commercialRegisterUrl?: string
  taxIdDocumentUrl?: string
  certificates?: ExpertCertificate[]
  socialLinks?: ExpertSocialLinks // Admin only
  suggestedCategory?: SuggestedCategoryInfo
  rating: string
  reviews: number
  price: string
  priceNumber: number
  categorySlug?: string
  subcategorySlug?: string
  categories?: SelectedCategory[]
  categorySlugs?: string[]
  subcategorySlugs?: string[]
  tags: string[]
  durationMinutes: number
  about: string
  bio: string
  status?: ExpertStatus
  featuredHome?: boolean
  featuredHomeAt?: Date
  rejectionReason?: string
  approvedAt?: Date
  approvedBy?: ObjectId
  hasPendingInfoUpdate?: boolean
  pendingInfoSubmittedAt?: Date
  pendingInfoRejectionReason?: string
  pendingInfoUpdate?: Record<string, any>
  preferredPayoutMethod?: PayoutMethod
  instapayUsername?: string
  bankAccount?: BankAccountDetails
  createdAt?: Date
  updatedAt?: Date
  googleCalendarEventId?: string
  googleCalendarEventLink?: string
  googleMeetLink?: string
  googleMeetSpaceName?: string
  meetDirectAccessConfiguredAt?: Date
  googleMeetError?: string
  googleMeetSyncedAt?: Date
  defaultGoogleMeetLink?: string
  rescheduleDeadlineHours?: number
}

export type ExpertItem = Omit<ExpertDoc, '_id'> & { _id: string; id: string }

export interface LocalizedText {
  en: string
  ar: string
}

export type ServiceApprovalStatus = 'pending' | 'approved' | 'rejected'
export type LicensingReviewStatus =
  | 'not_required'
  | 'pending_licensing_review'
  | 'licensing_approved'
  | 'licensing_rejected'

export type BookingType = 'APPOINTMENT' | 'WORKSHOP' | 'WEBINAR'
export type ServiceKind = 'CONSULTATION' | 'GENERAL_SERVICE'
export type DeliveryMode = 'ONLINE' | 'IN_PERSON' | 'HYBRID'

export interface ServiceLocation {
  city: string
  address: string
}

export interface ServiceEventDetails {
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  timezone: string
  capacity: number
  registeredCount: number
  joinUrl?: string
  platform?: string
}

export interface ServiceDoc {
  _id: ObjectId
  expertId: ObjectId // Native BSON ObjectId!
  slug?: string // Unique URL-friendly slug (e.g. 'product-strategy-roadmap-deep-dive')
  thumbnailUrl?: string
  title: LocalizedText
  description: LocalizedText
  intendedAudience?: LocalizedText
  adultsOnly?: boolean
  minimumAge?: number
  categorySlug?: string
  subcategorySlug?: string
  tags: string[]
  bookingType?: BookingType
  serviceKind?: ServiceKind
  deliveryMode?: DeliveryMode
  location?: ServiceLocation
  event?: ServiceEventDetails
  durationMinutes: number
  breakAfterMinutes: number
  pricing: {
    baseCurrency: string // e.g. 'EGP'
    prices: Record<string, number> // { EGP: 750, USD: 25, SAR: 95 }
  }
  isActive: boolean
  isMostBooked: boolean
  sortOrder: number
  approvalStatus?: ServiceApprovalStatus
  rejectionReason?: string
  approvedAt?: Date
  approvedBy?: ObjectId
  isStructuredVocationalProgramme?: boolean
  requiresLicensingReview?: boolean
  licensingReviewStatus?: LicensingReviewStatus
  licensingReviewReason?: string
  licensingReviewedAt?: Date
  licensingReviewedBy?: ObjectId
  hasVerifiedAccreditationAuthorization?: boolean
  adminReviewNote?: string
  createdAt: Date
  updatedAt: Date
}

export type ServiceItem = Omit<ServiceDoc, '_id' | 'expertId'> & {
  _id: string
  expertId: string
}

export interface TagDoc {
  _id: ObjectId
  slug: string
  name: LocalizedText
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type TagItem = Omit<TagDoc, '_id'> & { _id: string; id: string }

export interface SettingDoc {
  _id?: ObjectId
  key: string // e.g. "availability_schedule_${expertId}"
  expertId?: ObjectId
  expertSlug?: string
  value: any
  updatedAt: Date
  updatedBy?: string
}

export interface DateOverrideDoc {
  _id?: ObjectId
  id?: string
  expertId: ObjectId // Native BSON ObjectId!
  expertSlug?: string
  date: string // YYYY-MM-DD
  type: DateOverrideType
  startTime?: string
  endTime?: string
  breaks?: BreakInterval[]
  reason?: string
  createdAt: Date
  updatedAt: Date
}

export type BookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'awaiting_verification'
  | 'confirmed'
  | 'cancelled'
  | 'rejected'

export type PaymentStatus = 'pending' | 'receipt_uploaded' | 'verified' | 'rejected'

export type AttendanceStatus =
  | 'pending'
  | 'completed'
  | 'client_absent'
  | 'expert_absent'
  | 'both_absent'
  | 'disputed'
  | 'cancelled'

export interface AttendanceReport {
  response: 'attended' | 'absent'
  notes?: string
  submittedAt: Date
  userId?: ObjectId
  userRole: 'client' | 'expert'
}

export interface AttendanceDisputeResolution {
  resolvedBy: ObjectId
  finalStatus: AttendanceStatus
  reason: string
  resolvedAt: Date
}

export interface RescheduleHistoryEntry {
  previousDate: string
  previousTime: string
  newDate: string
  newTime: string
  changedByRole: 'client' | 'expert' | 'admin'
  reason?: string
  changedAt: Date
}

export interface BookingReminders {
  confirmationSentAt?: Date
  dayOfReminderSentAt?: Date
  beforeSessionReminderSentAt?: Date
  missingMeetLinkAlertSentAt?: Date
  attendancePromptSentAt?: Date
  activeReminderLock?: Date
}

export interface MeetingJoinRecord {
  firstJoinedAt: Date
  lastJoinedAt: Date
  joinCount: number
  leftAt?: Date
  durationSeconds?: number
  durationMinutes?: number
  meetDisplayName?: string
  inMeetingNow?: boolean
}

export interface GoogleMeetParticipantTelemetry {
  participantId: string
  displayName: string
  userType: 'signed_in' | 'anonymous' | 'phone'
  matchedRole?: 'client' | 'expert'
  joinedAt: Date
  leftAt?: Date
  durationSeconds: number
  durationMinutes: number
  sessionsCount: number
  isActive: boolean
}

export interface GoogleMeetTelemetry {
  meetingCode: string
  conferenceRecordNames: string[]
  conferenceStartedAt?: Date
  conferenceEndedAt?: Date
  participants: GoogleMeetParticipantTelemetry[]
  lastSyncedAt: Date
  syncError?: string
}

export interface BookingDoc {
  _id?: ObjectId
  id?: string
  reference?: string // e.g. BK-2041
  expertId: ObjectId // Native BSON ObjectId!
  expertSlug?: string
  serviceId?: ObjectId // Native BSON ObjectId!
  serviceTitle?: LocalizedText
  clientId?: ObjectId
  clientName: string
  clientEmail: string
  clientPhone?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMinutes: number
  amount?: number
  currency?: string
  status: BookingStatus
  deliveryMode?: DeliveryMode
  timezone?: string
  sessionStartAt?: Date
  sessionEndAt?: Date
  paymentMethod?: 'instapay'
  paymentStatus?: PaymentStatus
  paymentReceiptUrl?: string
  paymentReceiptPublicId?: string
  adminNotes?: string
  verifiedBy?: ObjectId
  verifiedAt?: Date
  createdAt: Date
  updatedAt?: Date
  googleCalendarEventId?: string
  googleCalendarEventLink?: string
  googleMeetLink?: string
  googleMeetSpaceName?: string
  meetDirectAccessConfiguredAt?: Date
  googleMeetError?: string
  googleMeetSyncedAt?: Date
  googleMeetUpdatedAt?: Date
  rescheduleToken?: string // Client access token for /bookings/[id]?token=...
  expertAccessToken?: string // Expert access token for /bookings/[id]?token=...
  meetingJoins?: {
    client?: MeetingJoinRecord
    expert?: MeetingJoinRecord
  }
  googleMeetTelemetry?: GoogleMeetTelemetry
  attendanceSource?: 'reports' | 'meet_join_tracking' | 'meet_api_telemetry' | 'admin'
  rescheduleDeadlineHours?: number
  rescheduleCount?: number
  rescheduleHistory?: RescheduleHistoryEntry[]
  attendanceStatus?: AttendanceStatus
  expertAttendanceReport?: AttendanceReport
  clientAttendanceReport?: AttendanceReport
  attendanceDisputeResolution?: AttendanceDisputeResolution
  reminders?: BookingReminders
}

export interface EmailLogDoc {
  _id?: ObjectId
  bookingId?: ObjectId
  emailType:
  | 'email_verification'
  | 'booking_received'
  | 'booking_confirmed'
  | 'meet_link_updated'
  | 'missing_meet_link_alert'
  | 'reminder_day_of'
  | 'reminder_before_session'
  | 'reschedule_confirmed'
  | 'attendance_prompt'
  | 'attendance_dispute_admin'
  recipientEmail: string
  recipientRole: 'client' | 'expert' | 'admin'
  subject: string
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  maxAttempts: number
  nextRetryAt?: Date
  lastError?: string
  messageId?: string
  sentAt?: Date
  createdAt: Date
  updatedAt?: Date
}

export interface AttendanceLogDoc {
  _id?: ObjectId
  bookingId: ObjectId
  userId?: ObjectId
  userRole: 'client' | 'expert' | 'admin'
  attendanceResponse: 'attended' | 'absent' | 'admin_override'
  previousStatus: AttendanceStatus
  updatedStatus: AttendanceStatus
  notes?: string
  submittedAt: Date
}

export type BookingItem = Omit<BookingDoc, '_id'> & { _id: string }

export interface CategoryDoc {
  _id: ObjectId
  name: LocalizedText
  slug: string
  description?: LocalizedText
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type CategoryItem = Omit<CategoryDoc, '_id'> & { _id: string; id: string }

export interface SubcategoryDoc {
  _id: ObjectId
  categoryId: ObjectId
  name: LocalizedText
  slug: string
  description?: LocalizedText
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type SubcategoryItem = Omit<SubcategoryDoc, '_id' | 'categoryId'> & {
  _id: string
  id: string
  categoryId: string
}

export interface PopulatedCategoryItem extends CategoryItem {
  subcategories: SubcategoryItem[]
}

export async function getCategoriesCollection(): Promise<Collection<CategoryDoc>> {
  const db = await getDb()
  return db.collection<CategoryDoc>('categories')
}

export async function getSubcategoriesCollection(): Promise<Collection<SubcategoryDoc>> {
  const db = await getDb()
  return db.collection<SubcategoryDoc>('subcategories')
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await getDb()
  return db.collection<UserDoc>('users')
}

export async function getExpertsCollection(): Promise<Collection<ExpertDoc>> {
  const db = await getDb()
  return db.collection<ExpertDoc>('experts')
}

export async function getServicesCollection(): Promise<Collection<ServiceDoc>> {
  const db = await getDb()
  return db.collection<ServiceDoc>('services')
}

export async function getSettingsCollection(): Promise<Collection<SettingDoc>> {
  const db = await getDb()
  return db.collection<SettingDoc>('settings')
}

export async function getDateOverridesCollection(): Promise<Collection<DateOverrideDoc>> {
  const db = await getDb()
  return db.collection<DateOverrideDoc>('date_overrides')
}

export async function getBookingsCollection(): Promise<Collection<BookingDoc>> {
  const db = await getDb()
  return db.collection<BookingDoc>('bookings')
}

export async function getTagsCollection(): Promise<Collection<TagDoc>> {
  const db = await getDb()
  return db.collection<TagDoc>('tags')
}

export async function getEmailLogsCollection(): Promise<Collection<EmailLogDoc>> {
  const db = await getDb()
  return db.collection<EmailLogDoc>('email_logs')
}

export async function getAttendanceLogsCollection(): Promise<Collection<AttendanceLogDoc>> {
  const db = await getDb()
  return db.collection<AttendanceLogDoc>('attendance_logs')
}

const globalForDbIndexes = globalThis as unknown as {
  _ensureDbIndexesPromise?: Promise<void>
}

async function safeCreateIndex(
  collection: Collection<any>,
  indexSpec: Record<string, any>,
  options?: Record<string, any>,
): Promise<void> {
  try {
    await collection.createIndex(indexSpec, options)
  } catch (err: any) {
    // Code 85 = IndexOptionsConflict (index with same key pattern already exists under a different name/options)
    // Code 86 = IndexKeySpecsConflict (index with same name already exists)
    if (
      err?.code === 85 ||
      err?.code === 86 ||
      err?.codeName === 'IndexOptionsConflict' ||
      err?.codeName === 'IndexKeySpecsConflict'
    ) {
      return
    }
    console.warn('[DB Index Warning]:', err?.message || err)
  }
}

/**
 * Ensures required indexes exist in MongoDB Atlas.
 * Safe to call multiple times (cached as a singleton promise per server process).
 */
export async function ensureDbIndexes(): Promise<void> {
  if (globalForDbIndexes._ensureDbIndexesPromise) {
    return globalForDbIndexes._ensureDbIndexesPromise
  }

  globalForDbIndexes._ensureDbIndexesPromise = (async () => {
    try {
      const db = await getDb()
      await Promise.all([
        safeCreateIndex(db.collection('users'), { email: 1 }, { unique: true }),
        safeCreateIndex(db.collection('users'), { role: 1 }),
        safeCreateIndex(db.collection('users'), { expertId: 1 }),
        safeCreateIndex(db.collection('experts'), { tags: 1 }, { name: 'tags_1' }),
        safeCreateIndex(db.collection('experts'), { slug: 1 }, { unique: true, name: 'slug_1_unique' }),
        safeCreateIndex(db.collection('experts'), { status: 1 }),
        safeCreateIndex(db.collection('experts'), { tags: 1, priceNumber: 1 }, { name: 'tags_1_priceNumber_1' }),
        safeCreateIndex(
          db.collection('experts'),
          { name: 'text', role: 'text', tags: 'text', about: 'text' },
          { weights: { name: 10, role: 5, tags: 4, about: 1 }, name: 'expert_text_search' },
        ),
        safeCreateIndex(db.collection('services'), { expertId: 1, isActive: 1, sortOrder: 1 }),
        safeCreateIndex(db.collection('services'), { slug: 1 }, { unique: true, sparse: true }),
        safeCreateIndex(db.collection('services'), { bookingType: 1, serviceKind: 1, isActive: 1 }),
        safeCreateIndex(db.collection('services'), { categorySlug: 1, isActive: 1 }),
        safeCreateIndex(db.collection('services'), { tags: 1, isActive: 1 }),
        safeCreateIndex(db.collection('settings'), { expertId: 1, key: 1 }, { name: 'expertId_1_key_1' }),
        safeCreateIndex(db.collection('date_overrides'), { expertId: 1, date: 1 }, { name: 'expertId_1_date_1' }),
        safeCreateIndex(db.collection('bookings'), { expertId: 1, date: 1, status: 1 }, { name: 'expertId_1_date_1_status_1' }),
        safeCreateIndex(db.collection('bookings'), { serviceId: 1 }),
        safeCreateIndex(db.collection('bookings'), { reference: 1 }),
        safeCreateIndex(db.collection('bookings'), { rescheduleToken: 1 }, { sparse: true }),
        safeCreateIndex(db.collection('bookings'), { expertAccessToken: 1 }, { sparse: true }),
        safeCreateIndex(db.collection('bookings'), { attendanceStatus: 1 }),
        safeCreateIndex(db.collection('bookings'), { sessionStartAt: 1, status: 1 }),
        safeCreateIndex(db.collection('email_logs'), { bookingId: 1 }),
        safeCreateIndex(db.collection('email_logs'), { status: 1, nextRetryAt: 1 }),
        safeCreateIndex(db.collection('attendance_logs'), { bookingId: 1, submittedAt: -1 }),
        // Category & Subcategory indexes
        safeCreateIndex(db.collection('categories'), { slug: 1 }, { unique: true }),
        safeCreateIndex(db.collection('categories'), { isActive: 1, sortOrder: 1 }),
        safeCreateIndex(db.collection('subcategories'), { categoryId: 1, slug: 1 }, { unique: true }),
        safeCreateIndex(db.collection('subcategories'), { categoryId: 1, isActive: 1, sortOrder: 1 }),
        safeCreateIndex(db.collection('subcategories'), { slug: 1 }),
        safeCreateIndex(db.collection('subcategories'), { isActive: 1 }),
        // Tags indexes
        safeCreateIndex(db.collection('tags'), { slug: 1 }, { unique: true }),
        safeCreateIndex(db.collection('tags'), { isActive: 1 }),
      ])
    } catch (err) {
      globalForDbIndexes._ensureDbIndexesPromise = undefined
      console.warn('Failed to ensure database indexes:', err)
    }
  })()

  return globalForDbIndexes._ensureDbIndexesPromise
}
