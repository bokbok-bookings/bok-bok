import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerGeo } from '@/lib/geo/server'
import { ALL_MARKET_CODES, MARKETS, type MarketCode } from '@/lib/geo/markets'

export const dynamic = 'force-dynamic'

/**
 * GET /api/geo
 * Returns visitor country, market, and active currency based on Vercel Edge geo headers or dev mock.
 */
export async function GET(request: NextRequest) {
  const geo = await getServerGeo(request)

  return NextResponse.json(
    {
      country: geo.country,
      market: geo.market,
      currency: geo.marketInfo.currency,
      symbolEn: geo.marketInfo.symbol.en,
      symbolAr: geo.marketInfo.symbol.ar,
      marketName: geo.marketInfo.name,
      flag: geo.marketInfo.flag,
      isEgypt: geo.isEgypt,
      isGcc: geo.isGcc,
      isGlobal: geo.isGlobal,
      isMocked: geo.isMocked,
      city: geo.city,
      region: geo.region,
      allMarkets: ALL_MARKET_CODES.map((code) => MARKETS[code]),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * POST /api/geo
 * Endpoint to set or reset the preview country cookie for testing/previewing markets.
 * Accessible to admins, experts, or during local development.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { country, reset } = body

    const response = NextResponse.json({ success: true, country: reset ? 'EG' : country })

    if (reset) {
      response.cookies.delete('bok_mock_country')
      response.cookies.delete('bok_country')
    } else if (country && typeof country === 'string') {
      const normalizedCode = country.trim().toUpperCase()
      response.cookies.set('bok_mock_country', normalizedCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days persistence
        sameSite: 'lax',
      })
      response.cookies.set('bok_country', normalizedCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      })
    }

    return response
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
}
