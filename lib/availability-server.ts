import { ObjectId } from 'mongodb'
import {
  type AvailabilitySettings,
  type DaySchedule,
  type BreakInterval,
  type DayAvailability,
  type TimeSlot,
  type DateOverrideItem,
  DEFAULT_WEEKLY_SCHEDULE,
  DEFAULT_SLOT_INTERVAL,
  timeToMinutes,
  minutesToTime,
} from '@/lib/data/availability'
import {
  getSettingsCollection,
  getDateOverridesCollection,
  getBookingsCollection,
  getExpertsCollection,
  withRetry,
  toObjectId,
  type BookingDoc,
  type ExpertDoc,
  type ExpertItem,
} from '@/lib/db'
import {
  loadExpertSettings,
  loadExpertOverrides,
  resolveExpertId,
} from '@/lib/availability-store'
import { EXPERTS } from '@/lib/data/experts'

export interface EffectiveDayInfo {
  isOpen: boolean
  startTime: string
  endTime: string
  breaks: BreakInterval[]
  reason?: string
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getExpertSettingsKey(expertId: string): string {
  return `availability_schedule_${expertId}`
}

/**
 * Resolve expert ID to an ObjectId from MongoDB Atlas
 */
export async function getCanonicalExpertObjectId(idOrSlug: string | ObjectId): Promise<ObjectId> {
  if (!idOrSlug) {
    return new ObjectId(EXPERTS[0].id)
  }

  if (idOrSlug instanceof ObjectId) {
    return idOrSlug
  }

  const str = String(idOrSlug)

  // If already a valid 24-char hex string, test if it exists directly
  if (ObjectId.isValid(str)) {
    return new ObjectId(str)
  }

  try {
    const expertsCol = await getExpertsCollection()
    const expert = await expertsCol.findOne({
      $or: [{ slug: str }, { id: str }],
    })
    if (expert && expert._id) {
      return expert._id
    }
  } catch (err) {
    console.error('Error finding expert in DB by slug:', err)
  }

  const staticId = resolveExpertId(str)
  return new ObjectId(staticId)
}

export async function getCanonicalExpertId(idOrSlug: string | ObjectId): Promise<string> {
  const objId = await getCanonicalExpertObjectId(idOrSlug)
  return objId.toString()
}

/**
 * Get all experts from MongoDB
 */
export async function getExpertsList(): Promise<ExpertItem[]> {
  try {
    return await withRetry(async () => {
      const expertsCol = await getExpertsCollection()
      const docs = await expertsCol.find({}).toArray()

      if (docs.length > 0) {
        return docs.map((d) => ({
          ...d,
          _id: d._id.toString(),
          id: d._id.toString(),
        }))
      }

      // If empty in MongoDB, seed initial experts with defined ObjectIds
      const seeded: ExpertItem[] = []
      for (const exp of EXPERTS) {
        const objId = new ObjectId(exp.id)
        const doc: ExpertDoc = {
          _id: objId,
          id: exp.id,
          slug: exp.slug,
          name: exp.name,
          role: exp.role,
          location: exp.location,
          image: exp.image,
          rating: exp.rating,
          reviews: exp.reviews,
          price: exp.price,
          priceNumber: exp.priceNumber,
          tags: exp.tags,
          durationMinutes: exp.durationMinutes,
          about: exp.about,
          bio: exp.bio,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        await expertsCol.updateOne({ _id: objId }, { $set: doc }, { upsert: true }).catch(() => {})
        seeded.push({
          ...doc,
          _id: objId.toString(),
          id: objId.toString(),
        })
      }
      return seeded
    })
  } catch (err) {
    console.error('Error loading experts from MongoDB:', err)
    return EXPERTS.map((e) => ({ ...e, id: e.id, _id: e.id }))
  }
}

/**
 * Fetch a single expert by id or slug from MongoDB
 */
export async function getExpertFromDb(idOrSlug: string): Promise<ExpertItem | null> {
  try {
    const experts = await getExpertsList()
    const match = experts.find(
      (e) => e.id === idOrSlug || e._id === idOrSlug || e.slug === idOrSlug,
    )
    return match || null
  } catch {
    const match = EXPERTS.find(
      (e) => e.id === idOrSlug || e._id === idOrSlug || e.slug === idOrSlug,
    )
    return match ? { ...match, id: match.id, _id: match.id } : null
  }
}

/**
 * Fetch an expert's availability settings from MongoDB (by expertId as BSON ObjectId)
 */
export async function getExpertAvailabilitySettings(
  expertIdOrSlug: string,
): Promise<AvailabilitySettings> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)
  const expertIdStr = expertObjectId.toString()
  const key = getExpertSettingsKey(expertIdStr)

  try {
    return await withRetry(async () => {
      const settingsCol = await getSettingsCollection()
      const doc = await settingsCol.findOne({
        $or: [{ expertId: expertObjectId }, { key }],
      })

      if (doc?.value) {
        return {
          weeklySchedule: {
            ...DEFAULT_WEEKLY_SCHEDULE,
            ...doc.value.weeklySchedule,
          },
          slotIntervalMinutes: doc.value.slotIntervalMinutes || DEFAULT_SLOT_INTERVAL,
        }
      }

      // If not yet in MongoDB, fetch fallback and seed to DB with native ObjectId
      const fallback = loadExpertSettings(expertIdStr)
      await settingsCol
        .updateOne(
          { expertId: expertObjectId },
          {
            $set: {
              key,
              expertId: expertObjectId,
              value: fallback,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        )
        .catch(() => {})

      return fallback
    })
  } catch (err) {
    console.error('Error fetching expert availability settings from MongoDB:', err)
    return loadExpertSettings(expertIdStr)
  }
}

/**
 * Update an expert's availability settings in MongoDB (storing expertId as BSON ObjectId)
 */
export async function saveExpertAvailabilitySettings(
  expertIdOrSlug: string,
  settings: AvailabilitySettings,
): Promise<AvailabilitySettings> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)
  const expertIdStr = expertObjectId.toString()
  const key = getExpertSettingsKey(expertIdStr)
  const slotIntervalMinutes = Number(settings.slotIntervalMinutes) || DEFAULT_SLOT_INTERVAL

  try {
    await withRetry(async () => {
      const settingsCol = await getSettingsCollection()
      await settingsCol.updateOne(
        { expertId: expertObjectId },
        {
          $set: {
            key,
            expertId: expertObjectId,
            value: {
              weeklySchedule: settings.weeklySchedule,
              slotIntervalMinutes,
            },
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      )
    })
  } catch (err) {
    console.error('Error saving expert settings to MongoDB:', err)
  }

  return {
    weeklySchedule: settings.weeklySchedule,
    slotIntervalMinutes,
  }
}

/**
 * Fetch an expert's date overrides from MongoDB (by expertId as BSON ObjectId)
 */
export async function getExpertDateOverrides(
  expertIdOrSlug: string,
): Promise<DateOverrideItem[]> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)
  const expertIdStr = expertObjectId.toString()

  try {
    return await withRetry(async () => {
      const overridesCol = await getDateOverridesCollection()
      const docs = await overridesCol
        .find({ expertId: expertObjectId })
        .sort({ date: 1 })
        .toArray()

      if (docs.length > 0) {
        return docs.map((d) => ({
          id: d._id ? d._id.toString() : d.id || '',
          _id: d._id ? d._id.toString() : '',
          expertId: d.expertId.toString(),
          expertSlug: d.expertSlug,
          date: d.date,
          type: d.type,
          startTime: d.startTime,
          endTime: d.endTime,
          breaks: d.breaks || [],
          reason: d.reason || '',
          createdAt: d.createdAt ? d.createdAt.toISOString() : undefined,
          updatedAt: d.updatedAt ? d.updatedAt.toISOString() : undefined,
        }))
      }

      // Seed initial defaults into MongoDB with native ObjectId if first run
      const fallbackOverrides = loadExpertOverrides(expertIdStr)
      if (fallbackOverrides.length > 0) {
        for (const ov of fallbackOverrides) {
          await overridesCol
            .updateOne(
              { expertId: expertObjectId, date: ov.date },
              {
                $set: {
                  expertId: expertObjectId,
                  expertSlug: ov.expertSlug,
                  date: ov.date,
                  type: ov.type,
                  startTime: ov.startTime || '09:00',
                  endTime: ov.endTime || '17:00',
                  breaks: ov.breaks || [],
                  reason: ov.reason || '',
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              { upsert: true },
            )
            .catch(() => {})
        }
      }

      return fallbackOverrides
    })
  } catch (err) {
    console.error('Error fetching date overrides from MongoDB:', err)
    return loadExpertOverrides(expertIdStr)
  }
}

/**
 * Add or update an expert's date override in MongoDB (storing expertId as BSON ObjectId)
 */
export async function saveExpertDateOverride(
  expertIdOrSlug: string,
  override: Partial<DateOverrideItem>,
): Promise<DateOverrideItem> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)

  const updateDoc = {
    expertId: expertObjectId,
    expertSlug: override.expertSlug,
    date: override.date || '',
    type: override.type || 'closed',
    startTime: override.startTime || '09:00',
    endTime: override.endTime || '17:00',
    breaks: Array.isArray(override.breaks) ? override.breaks : [],
    reason: (override.reason || '').trim(),
    updatedAt: new Date(),
  }

  try {
    return await withRetry(async () => {
      const overridesCol = await getDateOverridesCollection()

      if (override.id && ObjectId.isValid(override.id)) {
        const overrideObjId = new ObjectId(override.id)
        await overridesCol.updateOne(
          { _id: overrideObjId, expertId: expertObjectId },
          { $set: updateDoc },
        )
        return {
          id: override.id,
          _id: override.id,
          ...updateDoc,
          expertId: expertObjectId.toString(),
          createdAt: new Date().toISOString(),
          updatedAt: updateDoc.updatedAt.toISOString(),
        }
      }

      const res = await overridesCol.updateOne(
        { expertId: expertObjectId, date: override.date },
        {
          $set: updateDoc,
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      )

      const id = res.upsertedId ? res.upsertedId.toString() : override.id || `ov-${Date.now()}`
      return {
        id,
        _id: id,
        ...updateDoc,
        expertId: expertObjectId.toString(),
        createdAt: new Date().toISOString(),
        updatedAt: updateDoc.updatedAt.toISOString(),
      }
    })
  } catch (err) {
    console.error('Error saving date override to MongoDB:', err)
    const id = override.id || `ov-${Date.now()}`
    return {
      id,
      _id: id,
      ...updateDoc,
      expertId: expertObjectId.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: updateDoc.updatedAt.toISOString(),
    }
  }
}

/**
 * Delete an expert's date override from MongoDB (by expertId as BSON ObjectId)
 */
export async function removeExpertDateOverride(
  expertIdOrSlug: string,
  idOrDate: string,
): Promise<boolean> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)

  try {
    return await withRetry(async () => {
      const overridesCol = await getDateOverridesCollection()
      if (ObjectId.isValid(idOrDate)) {
        const res = await overridesCol.deleteOne({
          _id: new ObjectId(idOrDate),
          expertId: expertObjectId,
        })
        if (res.deletedCount > 0) return true
      }

      const res = await overridesCol.deleteOne({
        expertId: expertObjectId,
        $or: [{ date: idOrDate }, { id: idOrDate }],
      })
      return res.deletedCount > 0
    })
  } catch (err) {
    console.error('Error deleting override from MongoDB:', err)
    return false
  }
}

/**
 * Compute the effective schedule for an expert on a specific date
 */
export async function getEffectiveDaySchedule(
  expertIdOrSlug: string,
  dateStr: string,
  settings?: AvailabilitySettings,
): Promise<EffectiveDayInfo> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)
  const config = settings || (await getExpertAvailabilitySettings(expertObjectId.toString()))
  const overrides = await getExpertDateOverrides(expertObjectId.toString())
  const override = overrides.find((o) => o.date === dateStr)

  // 1. Date override takes priority
  if (override) {
    if (override.type === 'closed') {
      return {
        isOpen: false,
        startTime: '09:00',
        endTime: '17:00',
        breaks: [],
        reason: override.reason || 'Day off / Exception',
      }
    }

    if (override.type === 'open' || override.type === 'custom') {
      return {
        isOpen: true,
        startTime: override.startTime || '09:00',
        endTime: override.endTime || '17:00',
        breaks: override.breaks || [],
        reason: override.reason,
      }
    }
  }

  // 2. Fallback to weekly schedule
  const dateObj = new Date(`${dateStr}T00:00:00`)
  const dayOfWeek = dateObj.getDay()
  const dayTemplate = config.weeklySchedule[dayOfWeek] || DEFAULT_WEEKLY_SCHEDULE[dayOfWeek]

  if (!dayTemplate || !dayTemplate.enabled) {
    return {
      isOpen: false,
      startTime: '09:00',
      endTime: '17:00',
      breaks: [],
      reason: dayOfWeek === 5 ? 'Friday Weekend' : 'Day Off',
    }
  }

  return {
    isOpen: true,
    startTime: dayTemplate.startTime || '09:00',
    endTime: dayTemplate.endTime || '17:00',
    breaks: dayTemplate.breaks || [],
  }
}

/**
 * Fetch active bookings from MongoDB (by expertId as BSON ObjectId)
 * Including 'awaiting_verification' and 'awaiting_payment' so uploaded receipts block the slot!
 */
export async function loadExpertBookings(
  expertIdOrSlug: string | ObjectId,
  dateStr?: string,
): Promise<BookingDoc[]> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)

  try {
    return await withRetry(async () => {
      const bookingsCol = await getBookingsCollection()
      const query: any = {
        expertId: expertObjectId,
        status: { $in: ['pending', 'awaiting_payment', 'awaiting_verification', 'confirmed'] },
      }
      if (dateStr) {
        query.date = dateStr
      }
      return await bookingsCol.find(query).toArray()
    })
  } catch (err) {
    console.error('Error fetching bookings from MongoDB:', err)
    return []
  }
}

/**
 * Create a new booking in MongoDB (storing expertId as BSON ObjectId)
 */
export async function createExpertBooking(
  booking: Omit<BookingDoc, '_id' | 'createdAt' | 'expertId'> & {
    expertId: string | ObjectId
  },
): Promise<BookingDoc> {
  const expertObjectId = toObjectId(booking.expertId)

  const doc: BookingDoc = {
    ...booking,
    expertId: expertObjectId,
    createdAt: new Date(),
  }

  try {
    await withRetry(async () => {
      const bookingsCol = await getBookingsCollection()
      const res = await bookingsCol.insertOne(doc)
      doc._id = res.insertedId
      doc.id = res.insertedId.toString()
    })
  } catch (err) {
    console.error('Error creating booking in MongoDB:', err)
  }

  return doc
}

/**
 * Generate available time slots for an expert on a specific date
 */
export async function getExpertSlotsForDate(
  expertIdOrSlug: string,
  dateStr: string,
  consultationDurationMinutes: number = 30,
  breakAfterMinutes: number = 0,
): Promise<TimeSlot[]> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)
  const expertIdStr = expertObjectId.toString()
  const settings = await getExpertAvailabilitySettings(expertIdStr)
  const dayInfo = await getEffectiveDaySchedule(expertIdStr, dateStr, settings)

  if (!dayInfo.isOpen) {
    return []
  }

  const startMins = timeToMinutes(dayInfo.startTime)
  const endMins = timeToMinutes(dayInfo.endTime)
  const interval = settings.slotIntervalMinutes || DEFAULT_SLOT_INTERVAL
  const duration = consultationDurationMinutes > 0 ? consultationDurationMinutes : interval
  const reqBuffer = Math.max(0, Number(breakAfterMinutes) || 0)

  interface BusyInterval {
    start: number
    end: number
  }

  const busyIntervals: BusyInterval[] = []

  // Add breaks as busy intervals
  for (const b of dayInfo.breaks) {
    const bStart = timeToMinutes(b.start)
    const bEnd = timeToMinutes(b.end)
    if (bEnd > bStart) {
      busyIntervals.push({ start: bStart, end: bEnd })
    }
  }

  // Add existing active bookings from MongoDB (including awaiting_verification)
  const bookings = await loadExpertBookings(expertObjectId, dateStr)
  for (const b of bookings) {
    const bStart = timeToMinutes(b.time)
    // Legacy bookings or bookings with buffer
    const bEnd = bStart + (b.durationMinutes || 30)
    busyIntervals.push({ start: bStart, end: bEnd })
  }

  // Check past hours if date is today
  const now = new Date()
  const todayISO = toISODate(now)
  const isToday = dateStr === todayISO
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes() + 15

  const slots: TimeSlot[] = []

  for (let t = startMins; t + duration <= endMins; t += interval) {
    const slotStart = t
    const slotEndWithBuffer = t + duration + reqBuffer
    const slotCoreEnd = t + duration
    const timeLabel = minutesToTime(slotStart)

    if (isToday && slotStart <= currentMinutesFromMidnight) {
      slots.push({ time: timeLabel, available: false })
      continue
    }

    // Check collision with busy intervals (appointments or breaks)
    // The core duration must not collide with breaks or existing bookings;
    // Furthermore, the core duration + buffer must not overlap subsequent bookings.
    const hasCollision = busyIntervals.some(
      (busy) => Math.max(slotStart, busy.start) < Math.min(slotEndWithBuffer, busy.end),
    )

    slots.push({
      time: timeLabel,
      available: !hasCollision,
    })
  }

  return slots
}

/**
 * Returns upcoming selectable days for this specific expert
 */
export async function getExpertUpcomingDays(
  expertIdOrSlug: string,
  count = 14,
  _consultationDurationMinutes = 30,
): Promise<DayAvailability[]> {
  const expertObjectId = await getCanonicalExpertObjectId(expertIdOrSlug)
  const expertIdStr = expertObjectId.toString()
  const days: DayAvailability[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const settings = await getExpertAvailabilitySettings(expertIdStr)
  const overrides = await getExpertDateOverrides(expertIdStr)

  const candidateDates: string[] = []
  for (let offset = 0; candidateDates.length < count; offset++) {
    const d = new Date(start)
    d.setDate(start.getDate() + offset)
    candidateDates.push(toISODate(d))
  }

  const overridesMap: Record<string, DateOverrideItem> = {}
  for (const ov of overrides) {
    overridesMap[ov.date] = ov
  }

  for (const dateStr of candidateDates) {
    const override = overridesMap[dateStr]

    if (override) {
      if (override.type === 'closed') {
        days.push({
          date: dateStr,
          hasSlots: false,
          reason: override.reason || 'Day Off / Exception',
        })
        continue
      }
      days.push({ date: dateStr, hasSlots: true })
      continue
    }

    const dateObj = new Date(`${dateStr}T00:00:00`)
    const dayOfWeek = dateObj.getDay()
    const dayTemplate = settings.weeklySchedule[dayOfWeek] || DEFAULT_WEEKLY_SCHEDULE[dayOfWeek]

    if (!dayTemplate || !dayTemplate.enabled) {
      days.push({
        date: dateStr,
        hasSlots: false,
        reason: dayOfWeek === 5 ? 'Friday Weekend' : 'Day Off',
      })
    } else {
      days.push({ date: dateStr, hasSlots: true })
    }
  }

  return days
}
