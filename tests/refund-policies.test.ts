import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REFUND_POLICY_TYPES,
  PREDEFINED_REFUND_POLICIES,
  DEFAULT_REFUND_POLICY_TYPE,
  getPredefinedRefundPolicy,
  createBookingRefundPolicySnapshot,
  calculateEligibleRefund,
  formatRefundPolicyDetails,
  isRefundPolicyType,
} from '../lib/services/refund-policies'
import { validateServiceInput } from '../lib/services/service-validation'

test('Refund Policies: exactly three predefined policies with correct rules', () => {
  assert.equal(REFUND_POLICY_TYPES.length, 3)
  assert.deepEqual([...REFUND_POLICY_TYPES], ['customer_friendly', 'standard', 'expert_protection'])
  assert.equal(DEFAULT_REFUND_POLICY_TYPE, 'standard')

  // 1. Customer Friendly
  const cf = PREDEFINED_REFUND_POLICIES.customer_friendly
  assert.equal(cf.type, 'customer_friendly')
  assert.equal(cf.name, 'Customer Friendly')
  assert.deepEqual(cf.rules, [
    { refundPercentage: 100, minimumHoursBefore: 24 },
    { refundPercentage: 50, minimumHoursBefore: 6 },
    { refundPercentage: 0, minimumHoursBefore: 0 },
  ])

  // 2. Standard
  const std = PREDEFINED_REFUND_POLICIES.standard
  assert.equal(std.type, 'standard')
  assert.equal(std.name, 'Standard')
  assert.deepEqual(std.rules, [
    { refundPercentage: 100, minimumHoursBefore: 48 },
    { refundPercentage: 50, minimumHoursBefore: 24 },
    { refundPercentage: 0, minimumHoursBefore: 0 },
  ])

  // 3. Expert Protection
  const ep = PREDEFINED_REFUND_POLICIES.expert_protection
  assert.equal(ep.type, 'expert_protection')
  assert.equal(ep.name, 'Expert Protection')
  assert.deepEqual(ep.rules, [
    { refundPercentage: 100, minimumHoursBefore: 72 },
    { refundPercentage: 50, minimumHoursBefore: 24 },
    { refundPercentage: 0, minimumHoursBefore: 0 },
  ])
})

test('Refund Policies: factory and type guard functions', () => {
  assert.equal(isRefundPolicyType('customer_friendly'), true)
  assert.equal(isRefundPolicyType('standard'), true)
  assert.equal(isRefundPolicyType('expert_protection'), true)
  assert.equal(isRefundPolicyType('custom_policy'), false)
  assert.equal(isRefundPolicyType(null), false)
  assert.equal(isRefundPolicyType(undefined), false)

  // Factory returns pristine immutable copy
  const standardPolicy = getPredefinedRefundPolicy('standard')
  assert.equal(standardPolicy.type, 'standard')
  assert.equal(standardPolicy.name, 'Standard')
  assert.equal(standardPolicy.rules.length, 3)

  // Fallback to Standard on invalid or missing type
  const fallbackPolicy = getPredefinedRefundPolicy('invalid_unknown')
  assert.equal(fallbackPolicy.type, 'standard')

  const defaultPolicy = getPredefinedRefundPolicy(undefined)
  assert.equal(defaultPolicy.type, 'standard')
})

test('Refund Policies: booking snapshot is immutable and captures active policy', () => {
  const servicePolicy = getPredefinedRefundPolicy('expert_protection')
  const snapshot = createBookingRefundPolicySnapshot(servicePolicy)

  assert.equal(snapshot.type, 'expert_protection')
  assert.equal(snapshot.name, 'Expert Protection')
  assert.deepEqual(snapshot.rules, servicePolicy.rules)
  assert.ok(snapshot.snapshotAt)

  // Null service fallback
  const nullSnapshot = createBookingRefundPolicySnapshot(null)
  assert.equal(nullSnapshot.type, 'standard')
})

test('Refund Policies: calculation engine boundaries for all three policies', () => {
  const now = new Date('2026-12-01T12:00:00Z')

  // --- Customer Friendly (24h 100%, 6-24h 50%, <6h 0%) ---
  const cfPolicy = getPredefinedRefundPolicy('customer_friendly')

  // 30 hours before session -> 100%
  const cf30h = calculateEligibleRefund({
    policy: cfPolicy,
    sessionStartAt: new Date('2026-12-02T18:00:00Z'),
    cancellationTime: now,
    totalAmount: 1000,
  })
  assert.equal(cf30h.refundPercentage, 100)
  assert.equal(cf30h.refundAmount, 1000)

  // Exactly 24 hours before session -> 100%
  const cf24h = calculateEligibleRefund({
    policy: cfPolicy,
    sessionStartAt: new Date('2026-12-02T12:00:00Z'),
    cancellationTime: now,
    totalAmount: 1000,
  })
  assert.equal(cf24h.refundPercentage, 100)
  assert.equal(cf24h.refundAmount, 1000)

  // 12 hours before session -> 50%
  const cf12h = calculateEligibleRefund({
    policy: cfPolicy,
    sessionStartAt: new Date('2026-12-02T00:00:00Z'),
    cancellationTime: now,
    totalAmount: 1000,
  })
  assert.equal(cf12h.refundPercentage, 50)
  assert.equal(cf12h.refundAmount, 500)

  // Exactly 6 hours before session -> 50%
  const cf6h = calculateEligibleRefund({
    policy: cfPolicy,
    sessionStartAt: new Date('2026-12-01T18:00:00Z'),
    cancellationTime: now,
    totalAmount: 1000,
  })
  assert.equal(cf6h.refundPercentage, 50)
  assert.equal(cf6h.refundAmount, 500)

  // 3 hours before session -> 0%
  const cf3h = calculateEligibleRefund({
    policy: cfPolicy,
    sessionStartAt: new Date('2026-12-01T15:00:00Z'),
    cancellationTime: now,
    totalAmount: 1000,
  })
  assert.equal(cf3h.refundPercentage, 0)
  assert.equal(cf3h.refundAmount, 0)

  // --- Standard (48h 100%, 24-48h 50%, <24h 0%) ---
  const stdPolicy = getPredefinedRefundPolicy('standard')

  // 50 hours before -> 100%
  const std50h = calculateEligibleRefund({
    policy: stdPolicy,
    sessionStartAt: new Date('2026-12-03T14:00:00Z'),
    cancellationTime: now,
    totalAmount: 800,
  })
  assert.equal(std50h.refundPercentage, 100)
  assert.equal(std50h.refundAmount, 800)

  // 36 hours before -> 50%
  const std36h = calculateEligibleRefund({
    policy: stdPolicy,
    sessionStartAt: new Date('2026-12-03T00:00:00Z'),
    cancellationTime: now,
    totalAmount: 800,
  })
  assert.equal(std36h.refundPercentage, 50)
  assert.equal(std36h.refundAmount, 400)

  // 12 hours before -> 0%
  const std12h = calculateEligibleRefund({
    policy: stdPolicy,
    sessionStartAt: new Date('2026-12-02T00:00:00Z'),
    cancellationTime: now,
    totalAmount: 800,
  })
  assert.equal(std12h.refundPercentage, 0)
  assert.equal(std12h.refundAmount, 0)

  // --- Expert Protection (72h 100%, 24-72h 50%, <24h 0%) ---
  const epPolicy = getPredefinedRefundPolicy('expert_protection')

  // 80 hours before -> 100%
  const ep80h = calculateEligibleRefund({
    policy: epPolicy,
    sessionStartAt: new Date('2026-12-04T20:00:00Z'),
    cancellationTime: now,
    totalAmount: 1200,
  })
  assert.equal(ep80h.refundPercentage, 100)
  assert.equal(ep80h.refundAmount, 1200)

  // 48 hours before -> 50%
  const ep48h = calculateEligibleRefund({
    policy: epPolicy,
    sessionStartAt: new Date('2026-12-03T12:00:00Z'),
    cancellationTime: now,
    totalAmount: 1200,
  })
  assert.equal(ep48h.refundPercentage, 50)
  assert.equal(ep48h.refundAmount, 600)

  // 20 hours before -> 0%
  const ep20h = calculateEligibleRefund({
    policy: epPolicy,
    sessionStartAt: new Date('2026-12-02T08:00:00Z'),
    cancellationTime: now,
    totalAmount: 1200,
  })
  assert.equal(ep20h.refundPercentage, 0)
  assert.equal(ep20h.refundAmount, 0)
})

test('Refund Policies: backend validation in validateServiceInput', () => {
  const baseServicePayload = {
    title: { en: 'Product Strategy Review', ar: 'مراجعة استراتيجية المنتج' },
    description: {
      en: 'A comprehensive 45-minute deep-dive review of product architecture.',
      ar: 'مراجعة تفصيلية شاملة لمعمارية وهندسة المنتج الرقمي.',
    },
    intendedAudience: { en: 'Founders and Product Managers', ar: 'المؤسسون ومدراء المنتجات' },
    adultsOnly: true,
    minimumAge: 18,
    categorySlug: 'marketing',
    subcategorySlug: 'campaign-review',
    bookingType: 'APPOINTMENT',
    serviceKind: 'CONSULTATION',
    deliveryMode: 'ONLINE',
    durationMinutes: 45,
    pricing: { baseCurrency: 'EGP', prices: { EGP: 750 } },
  }

  // 1. Explicit Customer Friendly
  const resCf = validateServiceInput({
    ...baseServicePayload,
    refundPolicyType: 'customer_friendly',
  })
  assert.equal(resCf.ok, true)
  assert.equal(resCf.value?.refundPolicy.type, 'customer_friendly')
  assert.equal(resCf.value?.refundPolicy.name, 'Customer Friendly')
  assert.equal(resCf.value?.refundPolicy.rules.length, 3)

  // 2. Explicit Expert Protection
  const resEp = validateServiceInput({
    ...baseServicePayload,
    refundPolicyType: 'expert_protection',
  })
  assert.equal(resEp.ok, true)
  assert.equal(resEp.value?.refundPolicy.type, 'expert_protection')

  // 3. Default to Standard when omitted
  const resDefault = validateServiceInput(baseServicePayload)
  assert.equal(resDefault.ok, true)
  assert.equal(resDefault.value?.refundPolicy.type, 'standard')
  assert.equal(resDefault.value?.refundPolicy.name, 'Standard')

  // 4. Client tampering protection: Custom rules submitted directly are ignored
  const resTampered = validateServiceInput({
    ...baseServicePayload,
    refundPolicy: {
      type: 'standard',
      name: 'Hacked Policy',
      rules: [{ refundPercentage: 100, minimumHoursBefore: 0 }],
    },
  })
  assert.equal(resTampered.ok, true)
  assert.equal(resTampered.value?.refundPolicy.name, 'Standard')
  // Original immutable 3 rules enforced
  assert.deepEqual(resTampered.value?.refundPolicy.rules, [
    { refundPercentage: 100, minimumHoursBefore: 48 },
    { refundPercentage: 50, minimumHoursBefore: 24 },
    { refundPercentage: 0, minimumHoursBefore: 0 },
  ])

  // 5. Rejects unknown policy type
  const resInvalid = validateServiceInput({
    ...baseServicePayload,
    refundPolicyType: 'non_existent_policy',
  })
  assert.equal(resInvalid.ok, false)
  assert.match(resInvalid.errors.join('; '), /Invalid refund policy/i)
})

test('Refund Policies: formatting helper supports English and Arabic', () => {
  const enDetails = formatRefundPolicyDetails(getPredefinedRefundPolicy('standard'), 'en')
  assert.equal(enDetails.name, 'Standard')
  assert.match(enDetails.fullRefundDeadline, /Cancellation 48\+ hours before: 100% refund/i)
  assert.match(enDetails.partialRefundDeadline, /Cancellation 24–48 hours before: 50% refund/i)
  assert.match(enDetails.zeroRefundCondition, /Cancellation less than 24 hours before: 0% refund/i)

  const arDetails = formatRefundPolicyDetails(getPredefinedRefundPolicy('customer_friendly'), 'ar')
  assert.equal(arDetails.name, 'مرنة (صديقة للعميل)')
  assert.match(arDetails.fullRefundDeadline, /24/i)
  assert.match(arDetails.partialRefundDeadline, /6/i)
  assert.match(arDetails.zeroRefundCondition, /0%/i)
})
