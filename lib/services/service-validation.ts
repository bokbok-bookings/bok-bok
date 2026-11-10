/**
 * Conditional, booking-type-aware validation and MVP risk-reduction controls for offerings.
 * Pure module (only relative .ts imports) so it can run under Node's test runner.
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
import {
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
  isRemovedCategory,
} from '../data/categories'

export interface LocalizedValue {
  en: string
  ar: string
}

export interface ServiceLocation {
  city: string
  address: string
  addressDescription?: string
  googleMapsUrl?: string
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

export type LicensingReviewStatus =
  | 'not_required'
  | 'pending_licensing_review'
  | 'licensing_approved'
  | 'licensing_rejected'

export interface ServiceIntakeQuestion {
  id: string
  question: string
  type: 'string' | 'pdf' | 'image'
  required?: boolean
}

export interface NormalizedService {
  slug?: string
  thumbnailUrl?: string
  title: LocalizedValue
  description: LocalizedValue
  intendedAudience: LocalizedValue
  whatYouWillGet?: LocalizedValue[]
  intakeQuestions?: ServiceIntakeQuestion[]
  adultsOnly: boolean
  minimumAge: number
  categorySlug: string
  subcategorySlug: string
  tags: string[]
  bookingType: BookingType
  serviceKind?: ServiceKind
  deliveryMode: DeliveryMode
  location?: ServiceLocation
  durationMinutes: number
  breakAfterMinutes: number
  minNoticeHours?: number
  pricing: { baseCurrency: string; prices: Record<string, number> }
  event?: ServiceEventDetails
  isStructuredVocationalProgramme: boolean
  requiresLicensingReview: boolean
  licensingReviewStatus: LicensingReviewStatus
  licensingReviewReason?: string
  hasVerifiedAccreditationAuthorization: boolean
}

export interface ServiceValidationResult {
  ok: boolean
  errors: string[]
  warnings?: string[]
  value?: NormalizedService
  /** fields that are irrelevant for the resulting booking type and must be removed */
  unset: Array<'event' | 'serviceKind' | 'location' | 'thumbnailUrl'>
}

export interface ServiceValidationOptions {
  /** Local "today" (YYYY-MM-DD) used to reject past events. */
  todayISO?: string
  /** The persisted document when updating (raw input is merged on top of it). */
  existing?: Record<string, any> | null
}

export const DEFAULT_EVENT_TIMEZONE = 'Africa/Cairo'

/**
 * 10 Excluded Service Categories across ALL categories in the reduced-risk MVP scope.
 * Offers matching these exclusions must not be moved into another category or renamed to bypass restrictions.
 */
export interface ExcludedServiceRule {
  id: string
  label: LocalizedValue
  patterns: RegExp[]
}

export const EXCLUDED_SERVICE_RULES: ExcludedServiceRule[] = [
  {
    id: 'medical-fitness',
    label: {
      en: 'Medical advice, diagnosis, treatment, therapeutic nutrition, rehabilitation, and personalized fitness plans',
      ar: 'الاستشارات الطبية، التشخيص، العلاج، التغذية العلاجية، التأهيل الطبي، وخطط اللياقة البدنية الشخصية',
    },
    patterns: [
      /\b(medical\s+advice|medical\s+diagnosis|medical\s+treatment|clinical\s+diagnosis|therapeutic\s+nutrition|clinical\s+nutrition|physical\s+rehabilitation|physiotherapy|personali[sz]ed\s+fitness\s+plan|custom\s+workout\s+plan|personal\s+fitness\s+plan|medical\s+prescription)\b/i,
      /(استشارة\s+طبية|تشخيص\s+طبي|علاج\s+طبي|تغذية\s+علاجية|تأهيل\s+طبي|علاج\s+طبيعي|خطة\s+لياقة\s+شخصية|برنامج\s+تمارين\s+شخصي|وصفة\s+طبية)/i,
    ],
  },
  {
    id: 'mental-health-therapy',
    label: {
      en: 'Mental health assessment or treatment, trauma therapy, addiction treatment, and services making therapeutic claims',
      ar: 'تقييم أو علاج الصحة النفسية، علاج الصدمات، علاج الإدمان، والخدمات ذات الادعاءات العلاجية',
    },
    patterns: [
      /\b(mental\s+health\s+(assessment|treatment|therapy|diagnosis)|psychotherapy|psychiatric|trauma\s+therapy|addiction\s+(treatment|therapy|recovery)|clinical\s+counseling|therapeutic\s+(healing|treatment|claim))\b/i,
      /(علاج\s+نفسي|تشخيص\s+نفسي|تقييم\s+نفسي|علاج\s+الصدمات|علاج\s+الإدمان|جلسة\s+علاجية\s+نفسية|طب\s+نفسي)/i,
    ],
  },
  {
    id: 'legal-tax-investment',
    label: {
      en: 'Legal advice, legal representation, tax advice, auditing, securities recommendations, portfolio management, and handling client investments',
      ar: 'الاستشارات القانونية، التمثيل القانوني، الاستشارات الضريبية، التدقيق المالي والقانوني، توصيات الأوراق المالية، وإدارة استثمارات العملاء',
    },
    patterns: [
      /\b(legal\s+advice|legal\s+representation|legal\s+counsel|attorney\s+service|tax\s+advice|tax\s+filing|statutory\s+audit|financial\s+auditing|accounting\s+audit|securities\s+recommendation|stock\s+picking|investment\s+portfolio\s+management|managing\s+client\s+investments|wealth\s+management|asset\s+management)\b/i,
      /(استشارة\s+قانونية|استشارات\s+قانونية|تمثيل\s+قانوني|محاماة|استشارة\s+ضريبية|استشارات\s+ضريبية|تدقيق\s+مالي|مراجعة\s+حسابات\s+قانونية|توصيات\s+أسهم|توصيات\s+أوراق\s+مالية|إدارة\s+محافظ\s+استثمارية|إدارة\s+استثمارات\s+العملاء)/i,
    ],
  },
  {
    id: 'architecture-engineering-safety',
    label: {
      en: 'Architectural or engineering approvals, structural advice, construction plans, and safety-critical technical recommendations',
      ar: 'الاعتمادات المعمارية أو الهندسية، الاستشارات الإنشائية، مخططات البناء، والتوصيات الفنية الحرجة للسلامة',
    },
    patterns: [
      /\b(architectural\s+approval|engineering\s+approval|structural\s+(advice|engineering|calculation|analysis)|construction\s+(plan|blueprint|drawing)|building\s+permit\s+sign[-\s]?off|safety[-\s]critical\s+engineering)\b/i,
      /(اعتماد\s+معماري|اعتماد\s+هندسي|استشارات\s+إنشائية|مخططات\s+إنشائية|مخططات\s+بناء|تراخيص\s+بناء|حسابات\s+أحمال\s+إنشائية)/i,
    ],
  },
  {
    id: 'recruitment-visa-guarantees',
    label: {
      en: 'Recruitment, job placement, visa processing, immigration advice, or guarantees of jobs, visas, income, or business results',
      ar: 'التوظيف، إلحاق العمالة، استخراج التأشيرات، استشارات الهجرة، أو ضمان الوظائف أو التأشيرات أو الدخل أو نتائج الأعمال',
    },
    patterns: [
      /\b(job\s+placement|recruitment\s+(service|agency)|headhunting\s+service|visa\s+(processing|application\s+service)|immigration\s+(advice|consultant|lawyer)|guaranteed\s+(job|employment|visa|income|profit|revenue|business\s+results)|job\s+guarantee|income\s+guarantee)\b/i,
      /(توظيف\s+مباشر|إلحاق\s+عمالة|استخراج\s+تأشيرات|تجهيز\s+تأشيرات|استشارات\s+هجرة|ضمان\s+وظيفة|وظيفة\s+مضمونة|تأشيرة\s+مضمونة|ضمان\s+دخل|ربح\s+مضمون)/i,
    ],
  },
  {
    id: 'travel-operations-guiding',
    label: {
      en: 'Selling, booking, or operating travel packages, transport, accommodation, tours, or in-person tourist guiding',
      ar: 'بيع أو حجز أو تشغيل باقات السفر، النقل، الإقامة، الجولات السياحية، أو الإرشاد السياحي الميداني',
    },
    patterns: [
      /\b(travel\s+package\s+(booking|sale|operation)|book\s+(flights|hotels|accommodation)|tour\s+operator|guided\s+tour\s+package|in[-\s]?person\s+tour(ist)?\s+guid(e|ing)|airport\s+transfer\s+service)\b/i,
      /(حجز\s+طيران|حجز\s+فنادق|بيع\s+باقات\s+سفر|تنظيم\s+رحلات\s+سياحية|تسيير\s+رحلات|مرشد\s+سياحي\s+مرافق|إرشاد\s+سياحي\s+ميداني)/i,
    ],
  },
  {
    id: 'pentesting-sensitive-data',
    label: {
      en: 'Penetration testing, unauthorized system access, or technical services requiring access to live sensitive client data',
      ar: 'اختبار الاختراق، الوصول غير المصرح للأنظمة، أو الخدمات التقنية التي تتطلب الوصول إلى بيانات العملاء الحية الحساسة',
    },
    patterns: [
      /\b(penetration\s+test(ing)?|pentest(ing)?|ethical\s+hacking\s+service|exploit\s+testing|unauthorized\s+system\s+access|live\s+sensitive\s+(client|customer|production)\s+data\s+access)\b/i,
      /(اختبار\s+اختراق|تهكير|اختراق\s+أخلاقي|وصول\s+غير\s+مصرح|بيانات\s+العملاء\s+الحية\s+الحساسة)/i,
    ],
  },
  {
    id: 'school-tutoring-exam-children',
    label: {
      en: 'School tutoring, school or university exam preparation, academic ghostwriting, and services directed at children',
      ar: 'الدروس الخصوصية المدرسية، التحضير لامتحانات المدارس أو الجامعات، كتابة الأبحاث الأكاديمية بالنيابة، والخدمات الموجهة للأطفال',
    },
    patterns: [
      /\b(school\s+tutoring|academic\s+tutoring|(school|university|college|high\s+school|igcse|sat|thanawiya)\s+exam\s+prep(aration)?|academic\s+ghostwriting|write\s+your\s+(thesis|dissertation|essay)|essay\s+writing\s+service|for\s+(kids|children|minors|under\s+18)|children'?s\s+(class|workshop|session))\b/i,
      /(دروس\s+خصوصية|تقوية\s+مدرسية|تحضير\s+امتحانات\s+(المدارس|الجامعات|الثانوية)|كتابة\s+(رسائل\s+علمية|أبحاث\s+جامعية|أطروحات)\s+بالنيابة|للأطفال|للقصر|لمن\s+هم\s+دون\s+18|طلاب\s+المدارس)/i,
    ],
  },
  {
    id: 'accredited-licensing-claims',
    label: {
      en: 'Accredited qualifications, professional licensing preparation presented as official, or claims that a certificate authorizes professional practice',
      ar: 'المؤهلات المعتمدة، التحضير للتراخيص المهنية المقدم كجهة رسمية، أو الادعاء بأن الشهادة تخول مزاولة المهنة',
    },
    patterns: [
      /\b(accredited\s+(qualification|degree|diploma)|official\s+licensing\s+(authority|preparation|exam)|authori[sz]es\s+professional\s+practice|license\s+to\s+practice\s+certificate)\b/i,
      /(مؤهل\s+معتمد|شهادة\s+تخول\s+مزاولة\s+المهنة|ترخيص\s+مزاولة\s+مهنة|جهة\s+اعتماد\s+رسمية)/i,
    ],
  },
  {
    id: 'hazardous-weapons-safety',
    label: {
      en: 'Activities involving hazardous equipment, weapons, or significant physical safety risks',
      ar: 'الأنشطة التي تتضمن معدات خطرة أو أسلحة أو مخاطر جسدية كبيرة على السلامة',
    },
    patterns: [
      /\b(hazardous\s+(equipment|materials)|weapons?\s+training|firearms?\s+training|explosives|high[-\s]risk\s+physical\s+stunt)\b/i,
      /(معدات\s+خطرة|تدريب\s+أسلحة|أسلحة\s+نارية|مواد\s+خطرة|مواد\s+متفجرة)/i,
    ],
  },
]

const UNVERIFIED_ACCREDITATION_PATTERN =
  /\b(accredited|officially\s+recogni[sz]ed|official\s+accreditation|certified\s+qualification|ministry\s+approved)\b|(معتمد\s+رسميا|معتمد\s+رسمياً|معترف\s+به\s+رسميا|معترف\s+به\s+رسمياً|شهادة\s+معتمدة)/i

const STRUCTURED_VOCATIONAL_PROGRAMME_PATTERN =
  /\b(vocational\s+training|structured\s+(training\s+)?program(me)?|bootcamp|diploma|comprehensive\s+curriculum|professional\s+training\s+course|multi[-\s]?week\s+course|accredited\s+course)\b|(برنامج\s+تدريبي\s+مهني|تدريب\s+مهني\s+منظم|دورة\s+تدريبية\s+متكاملة|معسكر\s+تدريبي|دبلومة\s+تدريبية|منهج\s+تدريبي\s+متكامل)/i

const MINORS_AUDIENCE_PATTERN =
  /\b(under\s+18|below\s+18|kids|children|teenagers|minors|school\s+students|k-12)\b|(أقل\s+من\s+18|دون\s+18|للأطفال|أطفال|مراهقين|قصر|طلاب\s+مدارس)/i

export function detectExcludedService(text: string): {
  excluded: boolean
  ruleId?: string
  reason?: string
} {
  const combined = String(text || '')
  for (const rule of EXCLUDED_SERVICE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(combined)) {
        return {
          excluded: true,
          ruleId: rule.id,
          reason: `Excluded from platform scope: ${rule.label.en}. Do not move excluded services into another category or rename them to bypass restrictions.`,
        }
      }
    }
  }
  return { excluded: false }
}

export function detectUnverifiedAccreditationClaim(text: string): boolean {
  return UNVERIFIED_ACCREDITATION_PATTERN.test(String(text || ''))
}

export function stripUnverifiedAccreditationClaims(text: string): string {
  if (!text) return ''
  return String(text).replace(
    /\b(accredited|officially\s+recogni[sz]ed|official\s+accreditation|ministry\s+approved)\b|(معتمد\s+رسميا|معتمد\s+رسمياً|معترف\s+به\s+رسميا|معترف\s+به\s+رسمياً|شهادة\s+معتمدة)/gi,
    '[unverified claim removed]',
  )
}

export function detectStructuredVocationalProgramme(text: string): boolean {
  return STRUCTURED_VOCATIONAL_PROGRAMME_PATTERN.test(String(text || ''))
}

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
  const addressDescription = str(raw.addressDescription)
  const googleMapsUrl = str(raw.googleMapsUrl)
  return city || address
    ? {
        city,
        address,
        ...(addressDescription ? { addressDescription } : {}),
        ...(googleMapsUrl ? { googleMapsUrl } : {}),
      }
    : undefined
}

/**
 * Validate & normalize a create/update payload according to its booking type and MVP controls.
 * For updates, pass `existing`; the payload is merged over it so validation always
 * runs against the full resulting document.
 */
export function validateServiceInput(
  input: Record<string, any>,
  options: ServiceValidationOptions = {},
): ServiceValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
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
    if (rawKind === 'GENERAL_SERVICE') {
      errors.push(
        'Professional Services are outside the platform scope. Bok Bok only supports Consultations, Workshops, and Webinars.',
      )
    }
    serviceKind = 'CONSULTATION'
  }

  // ---- shared fields & activity / audience controls ----------------------
  const rawTitle = pick('title') || {}
  const title = { en: str(rawTitle.en), ar: str(rawTitle.ar) }
  if (!title.en || !title.ar) {
    errors.push('Title in both English and Arabic is required')
  }

  const rawDesc = pick('description') || {}
  const description = { en: str(rawDesc.en), ar: str(rawDesc.ar) }
  if (!description.en || description.en.length < 15 || !description.ar || description.ar.length < 10) {
    errors.push(
      'A clear description of the actual activity and scope is required in both English and Arabic (at least 15 characters).',
    )
  }

  const rawAudience = pick('intendedAudience')
  let intendedAudience: LocalizedValue = {
    en: 'Learners and professionals seeking professional or personal guidance',
    ar: 'الباحثون عن الإرشاد والتطوير المهني والشخصي',
  }
  if (rawAudience && typeof rawAudience === 'object') {
    const enAud = str(rawAudience.en)
    const arAud = str(rawAudience.ar)
    if (!enAud || !arAud) {
      errors.push('Intended audience description is required in both English and Arabic.')
    } else {
      intendedAudience = { en: enAud, ar: arAud }
    }
  } else if (typeof rawAudience === 'string' && rawAudience.trim()) {
    intendedAudience = { en: rawAudience.trim(), ar: rawAudience.trim() }
  }

  // ---- 18+ Adult restriction control -------------------------------------
  const rawAdultsOnly = pick('adultsOnly')
  const rawMinAge = pick('minimumAge')
  const adultsOnly = rawAdultsOnly === undefined ? true : Boolean(rawAdultsOnly)
  const minimumAge = rawMinAge === undefined ? 18 : Number(rawMinAge)

  if (!adultsOnly || !Number.isFinite(minimumAge) || minimumAge < 18) {
    errors.push('Platform offers are strictly limited to adults aged 18 and over.')
  }

  if (MINORS_AUDIENCE_PATTERN.test(`${title.en} ${title.ar} ${description.en} ${description.ar} ${intendedAudience.en} ${intendedAudience.ar}`)) {
    errors.push('Services directed at children or minors under 18 are excluded from the platform.')
  }

  // ---- Approved taxonomy enforcement (no free-text bypass) -----------
  const categorySlug = str(pick('categorySlug')).toLowerCase()
  const subcategorySlug = str(pick('subcategorySlug')).toLowerCase()

  if (!categorySlug) {
    errors.push('Category is required')
  } else if (isRemovedCategory(categorySlug)) {
    errors.push(
      `Category "${categorySlug}" is not available for new or updated offers.`,
    )
  } else if (!isAllowedMvpCategory(categorySlug)) {
    errors.push(
      `Category "${categorySlug}" is not in the approved platform taxonomy. Free-text or unapproved categories are not permitted.`,
    )
  }

  if (!subcategorySlug) {
    errors.push('An approved subcategory is required (free-text or unspecified subcategories are not permitted).')
  } else if (isAllowedMvpCategory(categorySlug) && !isAllowedMvpSubcategory(categorySlug, subcategorySlug)) {
    errors.push(
      `Subcategory "${subcategorySlug}" is not in the approved platform taxonomy for category "${categorySlug}".`,
    )
  }

  const tags = normalizeTagSlugs(pick('tags'))
  const pricing = normalizePricing(pick('pricing'), errors)

  // ---- Excluded services check across ALL categories ---------------------
  const combinedText = [
    title.en,
    title.ar,
    description.en,
    description.ar,
    intendedAudience.en,
    intendedAudience.ar,
    tags.join(' '),
  ].join(' ')

  const exclusionCheck = detectExcludedService(combinedText)
  if (exclusionCheck.excluded && exclusionCheck.reason) {
    errors.push(exclusionCheck.reason)
  }

  // ---- Unverified accreditation / official recognition claims ------------
  const hasVerifiedAccreditationAuthorization = Boolean(
    pick('hasVerifiedAccreditationAuthorization'),
  )
  if (
    !hasVerifiedAccreditationAuthorization &&
    detectUnverifiedAccreditationClaim(combinedText)
  ) {
    errors.push(
      'Do not include "accredited," "officially recognized," or equivalent claims without verified supporting authorization.',
    )
  }

  // ---- Structured vocational training programme flagging -----------------
  const explicitVocationalFlag = Boolean(pick('isStructuredVocationalProgramme'))
  const detectedVocational = detectStructuredVocationalProgramme(combinedText)
  const isStructuredVocationalProgramme = explicitVocationalFlag || detectedVocational
  const requiresLicensingReview =
    isStructuredVocationalProgramme || Boolean(pick('requiresLicensingReview'))

  const existingLicensingStatus = pick('licensingReviewStatus') as LicensingReviewStatus | undefined
  let licensingReviewStatus: LicensingReviewStatus = 'not_required'
  let licensingReviewReason: string | undefined = str(pick('licensingReviewReason')) || undefined

  if (requiresLicensingReview) {
    licensingReviewStatus =
      existingLicensingStatus === 'licensing_approved' ? 'licensing_approved' : 'pending_licensing_review'
    if (!licensingReviewReason) {
      licensingReviewReason =
        'Flagged as a structured vocational training programme; requires separate licensing review before publication (calling an offer a consultation, workshop, or webinar does not exempt it from licensing requirements).'
    }
    warnings.push(licensingReviewReason)
  }

  // ---- delivery mode & location -------------------------------------------
  const rawMode = pick('deliveryMode')
  if (rawMode !== undefined && rawMode !== null && rawMode !== '' && !isDeliveryMode(rawMode)) {
    errors.push(`Invalid delivery mode: ${rawMode}`)
  }
  let deliveryMode: DeliveryMode = isDeliveryMode(rawMode) ? rawMode : 'ONLINE'

  const location = deliveryMode === 'ONLINE' ? undefined : normalizeLocation(pick('location'))
  if (deliveryMode !== 'ONLINE' && !location) {
    errors.push('A location (city or address) is required for in-person offerings')
  }

  const unset: ServiceValidationResult['unset'] = []
  if (deliveryMode === 'ONLINE') unset.push('location')

  let durationMinutes = 0
  let breakAfterMinutes = 0
  let event: ServiceEventDetails | undefined

  if (bookingType === 'APPOINTMENT') {
    // ---- appointment (consultation) ---------------------------------------
    unset.push('event')
    const rawDuration = pick('durationMinutes')
    durationMinutes = Number(rawDuration)
    if (rawDuration === undefined || rawDuration === null || rawDuration === '') {
      errors.push('Duration is required for appointment-based consultations')
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
    if (bookingType === 'WEBINAR' && deliveryMode === 'ONLINE' && !joinUrl) {
      errors.push('A joining link is required for online webinars')
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

  if (errors.length > 0) return { ok: false, errors, warnings, unset }

  const rawSlug = pick('slug')
  const slug = rawSlug ? slugify(rawSlug) : undefined

  const rawThumbnail = input.thumbnailUrl !== undefined ? input.thumbnailUrl : existing.thumbnailUrl
  const thumbnailUrl = str(rawThumbnail)
  if (input.thumbnailUrl === '' || input.thumbnailUrl === null) {
    unset.push('thumbnailUrl')
  } else if (thumbnailUrl && !isHttpUrl(thumbnailUrl) && !thumbnailUrl.startsWith('/')) {
    errors.push('Service thumbnail must be a valid image URL')
    return { ok: false, errors, warnings, unset }
  }

  const rawMinNotice = pick('minNoticeHours')
  const minNoticeHours =
    rawMinNotice !== undefined && rawMinNotice !== null && rawMinNotice !== ''
      ? Math.max(0, Number(rawMinNotice))
      : existing.minNoticeHours !== undefined
        ? existing.minNoticeHours
        : 24

  const rawWhatYouWillGet = pick('whatYouWillGet')
  let whatYouWillGet: LocalizedValue[] = []
  if (Array.isArray(rawWhatYouWillGet)) {
    whatYouWillGet = rawWhatYouWillGet
      .map((item: any) => {
        if (!item) return null
        if (typeof item === 'string') {
          const s = item.trim()
          return s ? { en: s, ar: s } : null
        }
        if (typeof item === 'object') {
          const en = String(item.en || '').trim()
          const ar = String(item.ar || '').trim()
          if (!en && !ar) return null
          return { en: en || ar, ar: ar || en }
        }
        return null
      })
      .filter((v): v is LocalizedValue => Boolean(v))
  } else if (typeof rawWhatYouWillGet === 'string' && rawWhatYouWillGet.trim()) {
    whatYouWillGet = rawWhatYouWillGet
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ en: s, ar: s }))
  }

  const rawIntake = pick('intakeQuestions')
  let intakeQuestions: ServiceIntakeQuestion[] = []
  if (Array.isArray(rawIntake)) {
    intakeQuestions = rawIntake
      .filter((q: any) => q && typeof q === 'object' && String(q.question || '').trim())
      .map((q: any, idx: number) => ({
        id: String(q.id || `q_${Date.now()}_${idx}`),
        question: String(q.question).trim(),
        type: q.type === 'pdf' || q.type === 'image' ? q.type : 'string',
        required: Boolean(q.required),
      }))
  }

  const value: NormalizedService = {
    title,
    description,
    intendedAudience,
    whatYouWillGet,
    intakeQuestions,
    adultsOnly: true,
    minimumAge: Math.max(18, minimumAge),
    categorySlug,
    subcategorySlug,
    tags,
    bookingType,
    deliveryMode,
    durationMinutes,
    breakAfterMinutes,
    minNoticeHours,
    pricing,
    isStructuredVocationalProgramme,
    requiresLicensingReview,
    licensingReviewStatus,
    hasVerifiedAccreditationAuthorization,
    ...(licensingReviewReason ? { licensingReviewReason } : {}),
    ...(slug ? { slug } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(serviceKind ? { serviceKind } : {}),
    ...(location ? { location } : {}),
    ...(event ? { event } : {}),
  }
  return { ok: true, errors: [], warnings, value, unset }
}
