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
  isMvpOfferingService,
  slugify,
} from '../lib/services/service-types'
import {
  validateServiceInput,
  detectExcludedService,
  detectStructuredVocationalProgramme,
  detectUnverifiedAccreditationClaim,
  stripUnverifiedAccreditationClaims,
} from '../lib/services/service-validation'
import {
  CATEGORIES,
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
  isRemovedCategory,
} from '../lib/data/categories'

test('Scheduling: parsing and formatting minutes', () => {
  assert.equal(parseTimeToMinutes('09:30'), 570)
  assert.equal(parseTimeToMinutes('14:45'), 885)
  assert.equal(formatMinutesAsTime(570), '09:30')
  assert.equal(formatMinutesAsTime(885), '14:45')
})

test('Scheduling: range overlaps calculation', () => {
  assert.equal(rangesOverlap({ start: 600, end: 720 }, { start: 660, end: 780 }), true)
  assert.equal(rangesOverlap({ start: 600, end: 720 }, { start: 720, end: 780 }), false)
  assert.equal(rangesOverlap({ start: 600, end: 720 }, { start: 620, end: 680 }), true)
  assert.equal(rangesOverlap({ start: 600, end: 660 }, { start: 700, end: 760 }), false)
})

test('Scheduling: long duration sessions (2-4 hours) slot collision and buffer logic', () => {
  const existingFootprint = bookingFootprint({
    time: '10:00',
    durationMinutes: 120,
    bufferAfterMinutes: 15,
  })

  assert.equal(existingFootprint.start, 600)
  assert.equal(existingFootprint.end, 735)

  const slots = generateDaySlots({
    dayStart: 540,
    dayEnd: 1020,
    intervalMinutes: 30,
    durationMinutes: 60,
    bufferAfterMinutes: 0,
    commitments: [existingFootprint],
  })

  const slotMap = new Map(slots.map((s) => [s.time, s.available]))

  assert.equal(slotMap.get('09:00'), true)
  assert.equal(slotMap.get('09:30'), false)
  assert.equal(slotMap.get('10:00'), false)
  assert.equal(slotMap.get('10:30'), false)
  assert.equal(slotMap.get('11:00'), false)
  assert.equal(slotMap.get('11:30'), false)
  assert.equal(slotMap.get('12:00'), false)
  assert.equal(slotMap.get('12:30'), true)
  assert.equal(slotMap.get('16:00'), true)
  assert.equal(slotMap.has('16:30'), false)
})

test('MVP Taxonomy: exact 9 categories and 63 subcategories with removed categories blocked', () => {
  assert.equal(CATEGORIES.length, 9)
  const totalSubs = CATEGORIES.reduce((sum, c) => sum + c.subcategories.length, 0)
  assert.equal(totalSubs, 63)

  // Removed categories must be blocked
  assert.equal(isRemovedCategory('education-learning'), true)
  assert.equal(isRemovedCategory('fitness-wellness'), true)
  assert.equal(isAllowedMvpCategory('education-learning'), false)
  assert.equal(isAllowedMvpCategory('fitness-wellness'), false)

  // Allowed categories and subcategories
  assert.equal(isAllowedMvpCategory('marketing'), true)
  assert.equal(isAllowedMvpSubcategory('marketing', 'campaign-review'), true)
  assert.equal(isAllowedMvpSubcategory('marketing', 'digital-marketing'), false)
  assert.equal(isAllowedMvpCategory('travel'), true)
  assert.equal(isAllowedMvpSubcategory('travel', 'destination-information'), true)
  assert.equal(isAllowedMvpSubcategory('travel', 'travel-packages'), false)
})

test('Classification: MVP offering types exclude GENERAL_SERVICE (Professional Services)', () => {
  const legacyResolved = resolveBookingClassification({})
  assert.equal(legacyResolved.bookingType, 'APPOINTMENT')
  assert.equal(legacyResolved.serviceKind, 'CONSULTATION')
  assert.equal(legacyResolved.deliveryMode, 'ONLINE')

  assert.equal(isAppointmentBookingEngine('APPOINTMENT'), true)
  assert.equal(isEventBookingEngine('WORKSHOP'), true)
  assert.equal(isEventBookingEngine('WEBINAR'), true)

  assert.equal(isMvpOfferingService({ bookingType: 'APPOINTMENT', serviceKind: 'CONSULTATION' }), true)
  assert.equal(isMvpOfferingService({ bookingType: 'WORKSHOP' }), true)
  assert.equal(isMvpOfferingService({ bookingType: 'WEBINAR' }), true)
  assert.equal(isMvpOfferingService({ bookingType: 'APPOINTMENT', serviceKind: 'GENERAL_SERVICE' }), false)

  const exploreAllFilter = buildClassificationFilter('all')
  assert.deepEqual(exploreAllFilter, { serviceKind: { $ne: 'GENERAL_SERVICE' } })
})

test('Validation: valid MVP Consultation, Workshop, and Webinar', () => {
  // 1. Valid 1:1 Consultation in allowed MVP taxonomy
  const validConsultation = validateServiceInput({
    title: { en: 'Marketing Campaign Strategy Review', ar: 'مراجعة استراتيجية الحملة التسويقية' },
    description: {
      en: 'We review your current ad campaign structure, audience targeting, and messaging in a live 1-on-1 consultation.',
      ar: 'نراجع هيكل حملتك الإعلانية الحالية واستهداف الجمهور والرسائل التسويقية في جلسة استشارية فردية مباشرة.',
    },
    intendedAudience: {
      en: 'Adults (18+): Startup founders and marketing managers.',
      ar: 'البالغون (18+): مؤسسو الشركات الناشئة ومديرو التسويق.',
    },
    adultsOnly: true,
    minimumAge: 18,
    categorySlug: 'marketing',
    subcategorySlug: 'campaign-review',
    bookingType: 'APPOINTMENT',
    serviceKind: 'CONSULTATION',
    deliveryMode: 'ONLINE',
    durationMinutes: 60,
    pricing: {
      baseCurrency: 'EGP',
      prices: { EGP: 750, USD: 25, SAR: 90 },
    },
  })
  assert.equal(validConsultation.ok, true)

  // 2. Reject GENERAL_SERVICE (Professional Services outside MVP)
  const rejectedGeneralService = validateServiceInput({
    title: { en: 'Studio Portrait Session', ar: 'جلسة تصوير بورتريه' },
    description: {
      en: 'Full studio lighting setup and digital retouches for adult professionals.',
      ar: 'إضاءة استوديو كاملة وتعديلات رقمية للمهنيين البالغين.',
    },
    intendedAudience: { en: 'Adults 18+ professionals', ar: 'المهنيون البالغون 18+' },
    adultsOnly: true,
    minimumAge: 18,
    categorySlug: 'design-creative',
    subcategorySlug: 'photography',
    bookingType: 'APPOINTMENT',
    serviceKind: 'GENERAL_SERVICE',
    deliveryMode: 'IN_PERSON',
    location: { address: '22 El-Tahrir Street, Dokki', city: 'Cairo' },
    durationMinutes: 120,
    pricing: { baseCurrency: 'EGP', prices: { EGP: 1500 } },
  })
  assert.equal(rejectedGeneralService.ok, false)
  assert.match(rejectedGeneralService.errors.join('; '), /Professional Services.*outside the MVP/i)

  // 3. Reject removed categories (Education & Learning, Fitness & Wellness)
  const rejectedRemovedCat = validateServiceInput({
    title: { en: 'Study Skills Session', ar: 'جلسة مهارات الدراسة' },
    description: {
      en: 'Learn time management and reading strategies in a live consultation.',
      ar: 'تعلم إدارة الوقت واستراتيجيات القراءة في جلسة استشارية مباشرة.',
    },
    intendedAudience: { en: 'Adults 18+', ar: 'البالغون 18+' },
    adultsOnly: true,
    minimumAge: 18,
    categorySlug: 'education-learning',
    subcategorySlug: 'study-skills',
    bookingType: 'APPOINTMENT',
    serviceKind: 'CONSULTATION',
    pricing: { baseCurrency: 'EGP', prices: { EGP: 500 } },
  })
  assert.equal(rejectedRemovedCat.ok, false)
  assert.match(rejectedRemovedCat.errors.join('; '), /removed from active MVP use/i)
})

test('Validation: enforce all 10 excluded service categories and offer-level controls', () => {
  // Medical / personalized fitness plan
  assert.ok(detectExcludedService('Personalized fitness plan and therapeutic nutrition diagnosis'))
  // Mental health / trauma therapy
  assert.ok(detectExcludedService('Trauma therapy and clinical mental health assessment'))
  // Legal / tax / investment portfolio management
  assert.ok(detectExcludedService('Tax advice, auditing, and client investment portfolio management'))
  // Architectural approval / structural engineering
  assert.ok(detectExcludedService('Structural engineering calculations and architectural approval stamps'))
  // Recruitment / visa processing / job guarantee
  assert.ok(detectExcludedService('Visa processing, immigration advice, and guaranteed job placement'))
  // Selling travel packages / in-person tourist guiding
  assert.ok(detectExcludedService('Book a tour package with hotel booking and in-person tourist guide'))
  // Penetration testing / live sensitive client data
  assert.ok(detectExcludedService('Live penetration testing and exploit testing on production systems'))
  // School tutoring / exam prep / children
  assert.ok(detectExcludedService('IGCSE & Thanaweya Amma school tutoring for kids and teens'))
  // Accredited qualification / official licensing claim
  assert.ok(detectExcludedService('Accredited degree that authorizes professional practice'))
  // Hazardous equipment / weapons
  assert.ok(detectExcludedService('Firearms and explosives handling workshop'))

  // Vocational programme detection (requires separate licensing review even in allowed category)
  assert.equal(
    detectStructuredVocationalProgramme('12-week Intensive Web Development Bootcamp with Graded Final Assessment'),
    true
  )

  // Unverified accreditation claim detection and stripping
  assert.equal(detectUnverifiedAccreditationClaim('An officially recognized and accredited workshop'), true)
  assert.equal(
    stripUnverifiedAccreditationClaims('This is an accredited workshop for designers'),
    'This is an workshop for designers'
  )
})

test('Slugs: URL slug generation and normalization', () => {
  assert.equal(slugify('Product Strategy & Roadmap Deep Dive!'), 'product-strategy-roadmap-deep-dive')
  assert.equal(slugify('   Wedding & Event Photography 2026   '), 'wedding-event-photography-2026')
  assert.equal(slugify('---hello---world---'), 'hello-world')
  assert.equal(slugify(''), 'service')
})
