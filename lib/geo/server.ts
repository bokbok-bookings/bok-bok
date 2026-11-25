import { headers, cookies } from 'next/headers'
import {
  type MarketCode,
  type MarketInfo,
  MARKETS,
  resolveMarketFromCountry,
} from './markets'

export interface ServerGeoResult {
  country: string
  market: MarketCode
  marketInfo: MarketInfo
  isEgypt: boolean
  isGcc: boolean
  isGlobal: boolean
  isMocked: boolean
  city?: string
  region?: string
}

/**
 * Resolves the visitor's country and market from request headers and cookies.
 * Works seamlessly in Next.js Server Components, Actions, and Route Handlers.
 */
export async function getServerGeo(req?: Request | null): Promise<ServerGeoResult> {
  const isDev = process.env.NODE_ENV === 'development'

  let vercelCountry: string | null = null
  let mockHeader: string | null = null
  let mockCookie: string | null = null
  let persistedCountryCookie: string | null = null
  let mockQuery: string | null = null
  let city: string | undefined = undefined
  let region: string | undefined = undefined

  if (req) {
    const reqHeaders = req.headers
    vercelCountry = reqHeaders.get('x-vercel-ip-country') || reqHeaders.get('x-country') || reqHeaders.get('x-bok-country')
    mockHeader = reqHeaders.get('x-mock-country')
    city = reqHeaders.get('x-vercel-ip-city') || undefined
    region = reqHeaders.get('x-vercel-ip-country-region') || undefined

    // Check query param if url available
    try {
      const url = new URL(req.url)
      mockQuery = url.searchParams.get('mockCountry')
    } catch {
      // ignore
    }

    // Check cookies from header
    const cookieHeader = reqHeaders.get('cookie') || ''
    const matchMock = cookieHeader.match(/bok_mock_country=([^;]+)/)
    if (matchMock) {
      mockCookie = decodeURIComponent(matchMock[1])
    }
    const matchCountry = cookieHeader.match(/bok_country=([^;]+)/)
    if (matchCountry) {
      persistedCountryCookie = decodeURIComponent(matchCountry[1])
    }
  } else {
    try {
      const h = await headers()
      vercelCountry = h.get('x-vercel-ip-country') || h.get('x-country') || h.get('x-bok-country')
      mockHeader = h.get('x-mock-country')
      city = h.get('x-vercel-ip-city') || undefined
      region = h.get('x-vercel-ip-country-region') || undefined
    } catch {
      // outside request context
    }

    try {
      const c = await cookies()
      mockCookie = c.get('bok_mock_country')?.value || null
      persistedCountryCookie = c.get('bok_country')?.value || null
    } catch {
      // outside cookie context
    }
  }

  // Preview / mock priority: mock country cookie (set by admin/expert switcher or dev) > mock query/header > vercel country > persisted cookie > EG
  const previewCountry = mockCookie || mockQuery || mockHeader || (isDev ? process.env.MOCK_GEO_COUNTRY : null)
  const rawCountry = (previewCountry || vercelCountry || persistedCountryCookie || 'EG').trim().toUpperCase()
  const market = resolveMarketFromCountry(rawCountry)
  const marketInfo = MARKETS[market]

  return {
    country: rawCountry,
    market,
    marketInfo,
    isEgypt: marketInfo.isEgypt,
    isGcc: marketInfo.isGcc,
    isGlobal: marketInfo.isGlobal,
    isMocked: Boolean(previewCountry || !vercelCountry),
    city: city || (isDev ? 'Cairo (Dev)' : undefined),
    region: region || (isDev ? 'Cairo' : undefined),
  }
}
