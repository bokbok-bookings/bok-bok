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

export interface UserDoc {
  _id: ObjectId
  email: string
  passwordHash: string
  displayName: string
  role: UserRole
  expertId?: ObjectId // Linked expert profile for experts
  phone?: string
  status: UserStatus
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
  name: string
  slug: string
  role: string
  location: string
  image: string
  avatarUrl?: string
  nationalIdFrontUrl?: string
  nationalIdBackUrl?: string
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
  rejectionReason?: string
  approvedAt?: Date
  approvedBy?: ObjectId
  instapayUsername?: string
  createdAt?: Date
  updatedAt?: Date
}

export type ExpertItem = Omit<ExpertDoc, '_id'> & { _id: string; id: string }

export interface LocalizedText {
  en: string
  ar: string
}

export type ServiceApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ServiceDoc {
  _id: ObjectId
  expertId: ObjectId // Native BSON ObjectId!
  title: LocalizedText
  description: LocalizedText
  categorySlug?: string
  subcategorySlug?: string
  tags: string[]
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
  createdAt: Date
  updatedAt: Date
}

export type ServiceItem = Omit<ServiceDoc, '_id' | 'expertId'> & {
  _id: string
  expertId: string
}

export interface SettingDoc {
  _id?: ObjectId
  key: string // e.g. "availability_schedule_${expertId}"
  expertId: ObjectId // Native BSON ObjectId!
  expertSlug?: string
  value: {
    weeklySchedule: Record<number, DaySchedule>
    slotIntervalMinutes: number
  }
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
  paymentMethod?: 'instapay'
  paymentStatus?: PaymentStatus
  paymentReceiptUrl?: string
  paymentReceiptPublicId?: string
  adminNotes?: string
  verifiedBy?: ObjectId
  verifiedAt?: Date
  createdAt: Date
  updatedAt?: Date
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

let indexesEnsured = false

/**
 * Ensures required indexes exist in MongoDB Atlas.
 * Safe to call multiple times (cached in-memory per server process).
 */
export async function ensureDbIndexes(): Promise<void> {
  if (indexesEnsured) return
  try {
    const db = await getDb()
    await Promise.all([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('users').createIndex({ role: 1 }),
      db.collection('users').createIndex({ expertId: 1 }),
      db.collection('experts').createIndex({ tags: 1 }),
      db.collection('experts').createIndex({ slug: 1 }, { unique: true }),
      db.collection('experts').createIndex({ status: 1 }),
      db.collection('experts').createIndex({ tags: 1, priceNumber: 1 }),
      db.collection('experts').createIndex(
        { name: 'text', role: 'text', tags: 'text', about: 'text' },
        { weights: { name: 10, role: 5, tags: 4, about: 1 } }
      ),
      db.collection('services').createIndex({ expertId: 1, isActive: 1, sortOrder: 1 }),
      db.collection('settings').createIndex({ expertId: 1, key: 1 }),
      db.collection('date_overrides').createIndex({ expertId: 1, date: 1 }),
      db.collection('bookings').createIndex({ expertId: 1, date: 1, status: 1 }),
      db.collection('bookings').createIndex({ reference: 1 }),
      // Category & Subcategory indexes
      db.collection('categories').createIndex({ slug: 1 }, { unique: true }),
      db.collection('categories').createIndex({ isActive: 1, sortOrder: 1 }),
      db.collection('subcategories').createIndex({ categoryId: 1, slug: 1 }, { unique: true }),
      db.collection('subcategories').createIndex({ categoryId: 1, isActive: 1, sortOrder: 1 }),
      db.collection('subcategories').createIndex({ slug: 1 }),
      db.collection('subcategories').createIndex({ isActive: 1 }),
    ])
    indexesEnsured = true
  } catch (err) {
    console.warn('Failed to ensure database indexes:', err)
  }
}


