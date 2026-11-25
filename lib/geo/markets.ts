export type MarketCode = 'EG' | 'SA' | 'AE' | 'KW' | 'QA' | 'BH' | 'OM' | 'GLOBAL'
export type CurrencyCode = 'EGP' | 'SAR' | 'AED' | 'KWD' | 'QAR' | 'BHD' | 'OMR' | 'USD'

export interface MarketInfo {
  code: MarketCode
  name: { en: string; ar: string }
  currency: CurrencyCode
  symbol: { en: string; ar: string }
  flag: string
  isGcc: boolean
  isEgypt: boolean
  isGlobal: boolean
  defaultPrice: number
}

export const GCC_MARKET_CODES: MarketCode[] = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM']

export const ALL_MARKET_CODES: MarketCode[] = ['EG', ...GCC_MARKET_CODES, 'GLOBAL']

export const MARKETS: Record<MarketCode, MarketInfo> = {
  EG: {
    code: 'EG',
    name: { en: 'Egypt', ar: 'مصر' },
    currency: 'EGP',
    symbol: { en: 'EGP', ar: 'ج.م' },
    flag: '🇪🇬',
    isGcc: false,
    isEgypt: true,
    isGlobal: false,
    defaultPrice: 500,
  },
  SA: {
    code: 'SA',
    name: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
    currency: 'SAR',
    symbol: { en: 'SAR', ar: 'ر.س' },
    flag: '🇸🇦',
    isGcc: true,
    isEgypt: false,
    isGlobal: false,
    defaultPrice: 75,
  },
  AE: {
    code: 'AE',
    name: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
    currency: 'AED',
    symbol: { en: 'AED', ar: 'د.إ' },
    flag: '🇦🇪',
    isGcc: true,
    isEgypt: false,
    isGlobal: false,
    defaultPrice: 75,
  },
  KW: {
    code: 'KW',
    name: { en: 'Kuwait', ar: 'الكويت' },
    currency: 'KWD',
    symbol: { en: 'KWD', ar: 'د.ك' },
    flag: '🇰🇼',
    isGcc: true,
    isEgypt: false,
    isGlobal: false,
    defaultPrice: 6,
  },
  QA: {
    code: 'QA',
    name: { en: 'Qatar', ar: 'قطر' },
    currency: 'QAR',
    symbol: { en: 'QAR', ar: 'ر.ق' },
    flag: '🇶🇦',
    isGcc: true,
    isEgypt: false,
    isGlobal: false,
    defaultPrice: 75,
  },
  BH: {
    code: 'BH',
    name: { en: 'Bahrain', ar: 'البحرين' },
    currency: 'BHD',
    symbol: { en: 'BHD', ar: '.د.ب' },
    flag: '🇧🇭',
    isGcc: true,
    isEgypt: false,
    isGlobal: false,
    defaultPrice: 7.5,
  },
  OM: {
    code: 'OM',
    name: { en: 'Oman', ar: 'عمان' },
    currency: 'OMR',
    symbol: { en: 'OMR', ar: 'ر.ع.' },
    flag: '🇴🇲',
    isGcc: true,
    isEgypt: false,
    isGlobal: false,
    defaultPrice: 7.5,
  },
  GLOBAL: {
    code: 'GLOBAL',
    name: { en: 'Global (USD)', ar: 'عالمي (دولار)' },
    currency: 'USD',
    symbol: { en: '$', ar: '$' },
    flag: '🌍',
    isGcc: false,
    isEgypt: false,
    isGlobal: true,
    defaultPrice: 20,
  },
}

/**
 * Resolves a 2-letter ISO country code into a supported MarketCode.
 * - 'EG' -> 'EG'
 * - GCC countries ('SA', 'AE', 'KW', 'QA', 'BH', 'OM') -> corresponding GCC MarketCode
 * - Any other country -> 'GLOBAL' (USD)
 * - Null / undefined / empty -> 'EG' default
 */
export function resolveMarketFromCountry(countryCode?: string | null): MarketCode {
  if (!countryCode) return 'EG'
  const normalized = countryCode.trim().toUpperCase()
  if (normalized === 'EG') return 'EG'
  if (normalized === 'SA') return 'SA'
  if (normalized === 'AE') return 'AE'
  if (normalized === 'KW') return 'KW'
  if (normalized === 'QA') return 'QA'
  if (normalized === 'BH') return 'BH'
  if (normalized === 'OM') return 'OM'
  if (normalized === 'GLOBAL') return 'GLOBAL'
  // Any other country in the world maps to GLOBAL
  return 'GLOBAL'
}

/**
 * Normalizes service availableMarkets array.
 * If empty or undefined (legacy documents), defaults to ['EG'] per backward compatibility rule.
 */
export function getServiceMarkets(service?: { availableMarkets?: MarketCode[] } | null): MarketCode[] {
  if (!service) return ['EG']
  if (Array.isArray(service.availableMarkets) && service.availableMarkets.length > 0) {
    return service.availableMarkets
  }
  return ['EG']
}

/**
 * Checks whether a service is available in a given market.
 */
export function isServiceAvailableInMarket(
  service: { availableMarkets?: MarketCode[] } | null | undefined,
  market: MarketCode,
): boolean {
  const markets = getServiceMarkets(service)
  return markets.includes(market)
}

export interface ResolvedServicePrice {
  amount: number
  currency: CurrencyCode
  symbolEn: string
  symbolAr: string
  formattedEn: string
  formattedAr: string
}

/**
 * Gets the price for a service in the specified market.
 * Returns null if the service is not enabled for this market.
 */
export function getServicePriceForMarket(
  service: any,
  market: MarketCode,
): ResolvedServicePrice | null {
  if (!isServiceAvailableInMarket(service, market)) {
    return null
  }

  const marketInfo = MARKETS[market]
  const currency = marketInfo.currency
  const rawPrice = service?.pricing?.prices?.[currency]

  // If rawPrice is explicitly set, use it; otherwise fallback to defaultPrice for that market
  const amount = typeof rawPrice === 'number' && !isNaN(rawPrice)
    ? rawPrice
    : (market === 'EG' && typeof service?.pricing?.prices?.EGP === 'number'
        ? service.pricing.prices.EGP
        : marketInfo.defaultPrice)

  return {
    amount,
    currency,
    symbolEn: marketInfo.symbol.en,
    symbolAr: marketInfo.symbol.ar,
    formattedEn: `${amount} ${marketInfo.symbol.en}`,
    formattedAr: `${amount} ${marketInfo.symbol.ar}`,
  }
}
