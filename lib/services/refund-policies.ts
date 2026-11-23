/**
 * Predefined Service-Level Refund Policies and Calculation Engine.
 *
 * Reduced-Risk MVP Scope:
 * Experts select one of three immutable predefined policies:
 * 1. Customer Friendly:
 *    - 24+ hours before service: 100% refund
 *    - 6-24 hours before service: 50% refund
 *    - Less than 6 hours before service: 0% refund
 *
 * 2. Standard (Default):
 *    - 48+ hours before service: 100% refund
 *    - 24-48 hours before service: 50% refund
 *    - Less than 24 hours before service: 0% refund
 *
 * 3. Expert Protection:
 *    - 72+ hours before service: 100% refund
 *    - 24-72 hours before service: 50% refund
 *    - Less than 24 hours before service: 0% refund
 */

export const REFUND_POLICY_TYPES = [
  'customer_friendly',
  'standard',
  'expert_protection',
] as const

export type RefundPolicyType = (typeof REFUND_POLICY_TYPES)[number]

export interface RefundPolicyRule {
  refundPercentage: number
  minimumHoursBefore: number
}

export interface RefundPolicyConfig {
  type: RefundPolicyType
  name: string
  nameAr: string
  badgeEn?: string
  badgeAr?: string
  descriptionEn: string
  descriptionAr: string
  rules: RefundPolicyRule[]
}

export interface ServiceRefundPolicy {
  type: RefundPolicyType
  name: string
  rules: RefundPolicyRule[]
}

export interface BookingRefundPolicySnapshot extends ServiceRefundPolicy {
  snapshotAt?: Date | string
}

export const DEFAULT_REFUND_POLICY_TYPE: RefundPolicyType = 'standard'

export const PREDEFINED_REFUND_POLICIES: Record<RefundPolicyType, RefundPolicyConfig> = {
  customer_friendly: {
    type: 'customer_friendly',
    name: 'Customer Friendly',
    nameAr: 'مرنة (صديقة للعميل)',
    badgeEn: 'Maximum Flexibility',
    badgeAr: 'مرونة قصوى',
    descriptionEn:
      'Full refund up to 24 hours before the session, 50% refund between 6 and 24 hours, and no refund within 6 hours.',
    descriptionAr:
      'استرداد كامل حتى 24 ساعة قبل الجلسة، واسترداد 50% بين 6 و24 ساعة، ولا يوجد استرداد قبل أقل من 6 ساعات.',
    rules: [
      { refundPercentage: 100, minimumHoursBefore: 24 },
      { refundPercentage: 50, minimumHoursBefore: 6 },
      { refundPercentage: 0, minimumHoursBefore: 0 },
    ],
  },
  standard: {
    type: 'standard',
    name: 'Standard',
    nameAr: 'قياسية (متوازنة)',
    badgeEn: 'Recommended',
    badgeAr: 'موصى به',
    descriptionEn:
      'Full refund up to 48 hours before the session, 50% refund between 24 and 48 hours, and no refund within 24 hours.',
    descriptionAr:
      'استرداد كامل حتى 48 ساعة قبل الجلسة، واسترداد 50% بين 24 و48 ساعة، ولا يوجد استرداد قبل أقل من 24 ساعة.',
    rules: [
      { refundPercentage: 100, minimumHoursBefore: 48 },
      { refundPercentage: 50, minimumHoursBefore: 24 },
      { refundPercentage: 0, minimumHoursBefore: 0 },
    ],
  },
  expert_protection: {
    type: 'expert_protection',
    name: 'Expert Protection',
    nameAr: 'حماية الخبير',
    badgeEn: 'Strict Notice',
    badgeAr: 'إشعار مسبق صارم',
    descriptionEn:
      'Full refund up to 72 hours before the session, 50% refund between 24 and 72 hours, and no refund within 24 hours.',
    descriptionAr:
      'استرداد كامل حتى 72 ساعة قبل الجلسة، واسترداد 50% بين 24 و72 ساعة، ولا يوجد استرداد قبل أقل من 24 ساعة.',
    rules: [
      { refundPercentage: 100, minimumHoursBefore: 72 },
      { refundPercentage: 50, minimumHoursBefore: 24 },
      { refundPercentage: 0, minimumHoursBefore: 0 },
    ],
  },
}

export const REFUND_POLICY_OPTIONS: RefundPolicyConfig[] = [
  PREDEFINED_REFUND_POLICIES.customer_friendly,
  PREDEFINED_REFUND_POLICIES.standard,
  PREDEFINED_REFUND_POLICIES.expert_protection,
]

export function isRefundPolicyType(val: unknown): val is RefundPolicyType {
  return typeof val === 'string' && (REFUND_POLICY_TYPES as readonly string[]).includes(val)
}

/**
 * Returns the immutable predefined policy document for storage in ServiceDoc.
 * Never trusts rules or percentages passed by the client; uses the canonical configuration.
 */
export function getPredefinedRefundPolicy(type?: unknown): ServiceRefundPolicy {
  const policyType: RefundPolicyType = isRefundPolicyType(type) ? type : DEFAULT_REFUND_POLICY_TYPE
  const config = PREDEFINED_REFUND_POLICIES[policyType]
  return {
    type: config.type,
    name: config.name,
    rules: config.rules.map((r) => ({ ...r })),
  }
}

/**
 * Creates an immutable snapshot for storage in BookingDoc.
 */
export function createBookingRefundPolicySnapshot(
  servicePolicy?: ServiceRefundPolicy | null,
): BookingRefundPolicySnapshot {
  const base = getPredefinedRefundPolicy(servicePolicy?.type)
  return {
    ...base,
    snapshotAt: new Date().toISOString(),
  }
}

/**
 * Human-readable breakdown of the policy for UI presentation in EN and AR.
 */
export function formatRefundPolicyDetails(
  policy?: ServiceRefundPolicy | BookingRefundPolicySnapshot | null,
  locale: 'en' | 'ar' = 'en',
) {
  const resolvedType = isRefundPolicyType(policy?.type) ? policy!.type : DEFAULT_REFUND_POLICY_TYPE
  const config = PREDEFINED_REFUND_POLICIES[resolvedType]
  const isAr = locale === 'ar'

  let fullRefundDeadline = ''
  let partialRefundDeadline = ''
  let zeroRefundCondition = ''

  if (resolvedType === 'customer_friendly') {
    fullRefundDeadline = isAr ? 'إلغاء قبل 24 ساعة أو أكثر: استرداد 100%' : 'Cancellation 24+ hours before: 100% refund'
    partialRefundDeadline = isAr ? 'إلغاء قبل 6 إلى 24 ساعة: استرداد 50%' : 'Cancellation 6–24 hours before: 50% refund'
    zeroRefundCondition = isAr ? 'إلغاء قبل أقل من 6 ساعات: استرداد 0%' : 'Cancellation less than 6 hours before: 0% refund'
  } else if (resolvedType === 'expert_protection') {
    fullRefundDeadline = isAr ? 'إلغاء قبل 72 ساعة أو أكثر: استرداد 100%' : 'Cancellation 72+ hours before: 100% refund'
    partialRefundDeadline = isAr ? 'إلغاء قبل 24 إلى 72 ساعة: استرداد 50%' : 'Cancellation 24–72 hours before: 50% refund'
    zeroRefundCondition = isAr ? 'إلغاء قبل أقل من 24 ساعة: استرداد 0%' : 'Cancellation less than 24 hours before: 0% refund'
  } else {
    // standard
    fullRefundDeadline = isAr ? 'إلغاء قبل 48 ساعة أو أكثر: استرداد 100%' : 'Cancellation 48+ hours before: 100% refund'
    partialRefundDeadline = isAr ? 'إلغاء قبل 24 إلى 48 ساعة: استرداد 50%' : 'Cancellation 24–48 hours before: 50% refund'
    zeroRefundCondition = isAr ? 'إلغاء قبل أقل من 24 ساعة: استرداد 0%' : 'Cancellation less than 24 hours before: 0% refund'
  }

  return {
    type: config.type,
    name: isAr ? config.nameAr : config.name,
    nameEn: config.name,
    nameAr: config.nameAr,
    badge: isAr ? config.badgeAr : config.badgeEn,
    description: isAr ? config.descriptionAr : config.descriptionEn,
    fullRefundDeadline,
    partialRefundDeadline,
    zeroRefundCondition,
    rules: config.rules.map((r) => {
      let conditionLabel = ''
      if (r.minimumHoursBefore > 0) {
        conditionLabel = isAr
          ? `قبل ${r.minimumHoursBefore} ساعة أو أكثر من الجلسة`
          : `${r.minimumHoursBefore}+ hours before session`
      } else {
        conditionLabel = isAr ? 'أقل من المهلة المحددة' : 'After final deadline'
      }
      return {
        refundPercentage: r.refundPercentage,
        minimumHoursBefore: r.minimumHoursBefore,
        label: `${r.refundPercentage}% (${conditionLabel})`,
      }
    }),
  }
}

export interface RefundCalculationResult {
  refundPercentage: number
  refundAmount: number
  hoursRemaining: number
  matchedRule: RefundPolicyRule
  policyType: RefundPolicyType
  summaryTextEn: string
  summaryTextAr: string
}

/**
 * Calculates the eligible refund percentage and amount based on session start and cancellation time.
 */
export function calculateEligibleRefund(params: {
  policy?: ServiceRefundPolicy | BookingRefundPolicySnapshot | null
  sessionStartAt: Date | string
  cancellationTime?: Date | string
  totalAmount?: number
}): RefundCalculationResult {
  const policy = params.policy || getPredefinedRefundPolicy(DEFAULT_REFUND_POLICY_TYPE)
  const sessionStart = new Date(params.sessionStartAt)
  const cancelTime = params.cancellationTime ? new Date(params.cancellationTime) : new Date()
  const totalAmount = Math.max(0, Number(params.totalAmount) || 0)

  const diffMs = sessionStart.getTime() - cancelTime.getTime()
  const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60))

  // Sort rules descending by minimumHoursBefore
  const sortedRules = [...(policy.rules || [])].sort(
    (a, b) => b.minimumHoursBefore - a.minimumHoursBefore,
  )

  let matchedRule: RefundPolicyRule = { refundPercentage: 0, minimumHoursBefore: 0 }
  for (const rule of sortedRules) {
    if (hoursRemaining >= rule.minimumHoursBefore) {
      matchedRule = rule
      break
    }
  }

  const refundPercentage = matchedRule.refundPercentage
  const refundAmount = Math.round(((totalAmount * refundPercentage) / 100) * 100) / 100

  const summaryTextEn =
    refundPercentage === 100
      ? `Eligible for 100% full refund (${Math.floor(hoursRemaining)}h remaining before session start).`
      : refundPercentage > 0
        ? `Eligible for ${refundPercentage}% partial refund (${Math.floor(hoursRemaining)}h remaining before session start).`
        : `0% refund (cancelled less than minimum notice required before session start).`

  const summaryTextAr =
    refundPercentage === 100
      ? `مؤهل لاسترداد كامل 100% (متبقي ${Math.floor(hoursRemaining)} ساعة قبل موعد الجلسة).`
      : refundPercentage > 0
        ? `مؤهل لاسترداد جزئي ${refundPercentage}% (متبقي ${Math.floor(hoursRemaining)} ساعة قبل موعد الجلسة).`
        : `لا يوجد استرداد (0%) للإلغاء قبل أقل من المهلة المحددة لموعد الجلسة.`

  return {
    refundPercentage,
    refundAmount,
    hoursRemaining,
    matchedRule,
    policyType: policy.type,
    summaryTextEn,
    summaryTextAr,
  }
}
