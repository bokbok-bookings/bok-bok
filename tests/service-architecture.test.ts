import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseTimeToMinutes,
  formatMinutesAsTime,
  rangesOverlap,
  bookingFootprint,
  generateDaySlots,
} from '../lib/booking/scheduling'
import {
  resolveBookingClassification,
  isAppointmentBookingEngine,
  isEventBookingEngine,
  buildClassificationFilter,
  slugify,
} from '../lib/services/service-types'
import { validateServiceInput } from '../lib/services/service-validation'

test('Scheduling: parsing and formatting minutes', () => {
  assert.equal(parseTimeToMinutes('09:30'), 570)
  assert.equal(parseTimeToMinutes('14:45'), 885)
  assert.equal(formatMinutesAsTime(570), '09:30')
  assert.equal(formatMinutesAsTime(885), '14:45')
})

test('Scheduling: range overlaps calculation', () => {
  // Overlapping
  assert.equal(rangesOverlap({ start: 600, end: 720 }, { start: 660, end: 780 }), true)
  // Adjacent (touching end-to-start is non-overlapping)
  assert.equal(rangesOverlap({ start: 600, end: 720 }, { start: 720, end: 780 }), false)
  // Contained
  assert.equal(rangesOverlap({ start: 600, end: 720 }, { start: 620, end: 680 }), true)
  // Disjoint
  assert.equal(rangesOverlap({ start: 600, end: 660 }, { start: 700, end: 760 }), false)
})

test('Scheduling: long duration sessions (2-4 hours) slot collision and buffer logic', () => {
  // Working hours: 09:00 (540m) to 17:00 (1020m)
  // Existing commitment: 2-hour appointment from 10:00 to 12:00 with 15m break buffer = [600, 735)
  const existingFootprint = bookingFootprint({
    time: '10:00',
    durationMinutes: 120,
    bufferAfterMinutes: 15,
  })

  assert.equal(existingFootprint.start, 600)
  assert.equal(existingFootprint.end, 735)

  // Candidate: booking a 60-minute session with 30m grid interval
  const slots = generateDaySlots({
    dayStart: 540, // 09:00
    dayEnd: 1020,  // 17:00
    intervalMinutes: 30,
    durationMinutes: 60,
    bufferAfterMinutes: 0,
    commitments: [existingFootprint],
  })

  const slotMap = new Map(slots.map((s) => [s.time, s.available]))

  // 09:00 to 10:00: available (ends right at 10:00, start of commitment)
  assert.equal(slotMap.get('09:00'), true)
  // 09:30 to 10:30: overlaps commitment start (600) -> unavailable
  assert.equal(slotMap.get('09:30'), false)
  // 10:00 to 11:00: inside commitment -> unavailable
  assert.equal(slotMap.get('10:00'), false)
  // 10:30 to 11:30: inside commitment -> unavailable
  assert.equal(slotMap.get('10:30'), false)
  // 11:00 to 12:00: inside commitment -> unavailable
  assert.equal(slotMap.get('11:00'), false)
  // 11:30 to 12:30: inside commitment -> unavailable
  assert.equal(slotMap.get('11:30'), false)
  // 12:00 to 13:00: collides with 15m buffer [720, 735) -> unavailable
  assert.equal(slotMap.get('12:00'), false)
  // 12:15 would be clear, but grid is 30m: 12:30 starts at 750 >= 735 -> available!
  assert.equal(slotMap.get('12:30'), true)
  // 16:00 to 17:00 fits dayEnd (1020) -> available
  assert.equal(slotMap.get('16:00'), true)
  // 16:30 to 17:30 would exceed dayEnd (1020) -> not generated as valid slot
  assert.equal(slotMap.has('16:30'), false)
})

test('Classification: backward compatibility and engine mapping', () => {
  // Legacy service doc without classification
  const legacyResolved = resolveBookingClassification({})
  assert.equal(legacyResolved.bookingType, 'APPOINTMENT')
  assert.equal(legacyResolved.serviceKind, 'CONSULTATION')
  assert.equal(legacyResolved.deliveryMode, 'ONLINE')

  // Both consultations and general services use the APPOINTMENT engine
  assert.equal(isAppointmentBookingEngine('APPOINTMENT'), true)
  assert.equal(isAppointmentBookingEngine('WORKSHOP'), false)
  assert.equal(isEventBookingEngine('WORKSHOP'), true)
  assert.equal(isEventBookingEngine('WEBINAR'), true)
  assert.equal(isEventBookingEngine('APPOINTMENT'), false)

  // Listing filter checks
  const consultFilter = buildClassificationFilter('consultations')
  assert.ok(consultFilter.$and)

  const servicesFilter = buildClassificationFilter('services')
  assert.ok(servicesFilter.$and)

  const workshopFilter = buildClassificationFilter('workshops')
  assert.deepEqual(workshopFilter, {
    bookingType: 'WORKSHOP',
  })

  const exploreAllFilter = buildClassificationFilter('all')
  assert.deepEqual(exploreAllFilter, {})
})

test('Validation: schema validation across offering types', () => {
  // 1. Valid General Service (e.g. 180 min photoshoot, In-Person)
  const validService = validateServiceInput({
    title: { en: 'Studio Portrait Session', ar: 'جلسة تصوير بورتريه' },
    description: { en: 'Full studio lighting setup and digital retouches.', ar: 'إضاءة كاملة وتعديل رقمي.' },
    categorySlug: 'photography-videography',
    subcategorySlug: 'portrait-headshot-photography',
    bookingType: 'APPOINTMENT',
    serviceKind: 'GENERAL_SERVICE',
    deliveryMode: 'IN_PERSON',
    location: {
      address: '22 El-Tahrir Street, Dokki',
      city: 'Cairo',
    },
    durationMinutes: 180,
    breakAfterMinutes: 30,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 2500, USD: 80, SAR: 300 },
    },
  })
  assert.equal(validService.ok, true)

  // 2. In-Person without address should fail
  const missingLocation = validateServiceInput({
    title: { en: 'Studio Portrait Session', ar: 'جلسة تصوير' },
    bookingType: 'APPOINTMENT',
    serviceKind: 'GENERAL_SERVICE',
    deliveryMode: 'IN_PERSON',
    location: {},
    pricing: { baseCurrency: 'EGP', prices: { EGP: 1000 } },
  })
  assert.equal(missingLocation.ok, false)
  assert.match(missingLocation.errors.join('; '), /location.*required/i)

  // 3. Valid Workshop
  const validWorkshop = validateServiceInput({
    title: { en: 'Next.js & Fullstack Masterclass', ar: 'ماستركلاس نكست جي اس' },
    description: { en: 'Hands-on live coding workshop.', ar: 'ورشة عمل تطبيقية.' },
    categorySlug: 'technology-it',
    bookingType: 'WORKSHOP',
    deliveryMode: 'ONLINE',
    durationMinutes: 120,
    event: {
      date: '2026-11-15',
      startTime: '18:00',
      endTime: '20:00',
      capacity: 25,
    },
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 1200 },
    },
  })
  assert.equal(validWorkshop.ok, true)

  // 4. Workshop missing capacity should fail
  const invalidWorkshop = validateServiceInput({
    title: { en: 'Next.js & Fullstack Masterclass', ar: 'ماستركلاس' },
    categorySlug: 'technology-it',
    bookingType: 'WORKSHOP',
    event: {
      date: '2026-11-15',
      startTime: '18:00',
      endTime: '20:00',
    },
    pricing: { baseCurrency: 'EGP', prices: { EGP: 1200 } },
  })
  assert.equal(invalidWorkshop.ok, false)
  assert.match(invalidWorkshop.errors.join('; '), /capacity/i)
})

test('Slugs: URL slug generation and normalization', () => {
  assert.equal(slugify('Product Strategy & Roadmap Deep Dive!'), 'product-strategy-roadmap-deep-dive')
  assert.equal(slugify('   Wedding & Event Photography 2026   '), 'wedding-event-photography-2026')
  assert.equal(slugify('---hello---world---'), 'hello-world')
  assert.equal(slugify(''), 'service')
})
