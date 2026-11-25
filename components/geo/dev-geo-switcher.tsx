'use client'

import { useEffect, useState } from 'react'
import { MARKETS, type MarketCode, GCC_MARKET_CODES } from '@/lib/geo/markets'

interface GeoData {
  country: string
  market: MarketCode
  currency: string
  symbolEn: string
  symbolAr: string
  isMocked: boolean
}

export function DevGeoSwitcher() {
  const [geo, setGeo] = useState<GeoData | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    // 1. Fetch geo state
    fetch('/api/geo')
      .then((res) => res.json())
      .then((data) => setGeo(data))
      .catch((err) => console.error('Failed to fetch geo:', err))

    // 2. Fetch current user session to verify expert/admin privileges
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user)
        }
      })
      .catch(() => { })
      .finally(() => setAuthChecked(true))
  }, [])

  // Allow in development OR for authenticated Admins & Experts
  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'expert'

  if (authChecked && !isDev && !isPrivileged) {
    return null
  }
  if (!authChecked && !isDev) {
    return null
  }

  const switchCountry = async (countryCode: string | null) => {
    setLoading(true)
    try {
      if (countryCode) {
        await fetch('/api/geo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: countryCode }),
        })
      } else {
        await fetch('/api/geo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reset: true }),
        })
      }
      window.location.reload()
    } catch (err) {
      console.error('Failed to switch preview country:', err)
      setLoading(false)
    }
  }

  const currentMarket = geo?.market ? MARKETS[geo.market] : null

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans text-xs">
      {open ? (
        <div className="w-72 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🌍</span>
              <div>
                <span className="font-bold text-amber-400">Market Preview</span>
                <span className="ml-1.5 rounded bg-amber-400/20 text-amber-300 px-1 py-0.2 text-[9px] font-semibold uppercase">
                  {currentUser?.role || (isDev ? 'Dev' : 'Admin')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mb-2.5">
            Preview the platform catalog and pricing as a visitor from any target country. Your choice stays active across all pages until reset.
          </p>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {/* Egypt */}
            <button
              onClick={() => switchCountry('EG')}
              disabled={loading}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 transition text-left ${geo?.country === 'EG'
                  ? 'bg-amber-400 font-bold text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
            >
              <span>🇪🇬 Egypt</span>
              <span className="text-[10px] font-mono opacity-80">EGP (ج.م)</span>
            </button>

            {/* GCC Group */}
            <div className="pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              GCC Countries
            </div>

            {GCC_MARKET_CODES.map((code) => {
              const m = MARKETS[code]
              const isCurrent = geo?.country === code
              return (
                <button
                  key={code}
                  onClick={() => switchCountry(code)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 transition text-left ${isCurrent
                      ? 'bg-amber-400 font-bold text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                >
                  <span>{m.flag} {m.name.en}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    {m.currency} ({m.symbol.ar})
                  </span>
                </button>
              )
            })}

            {/* Global */}
            <div className="pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Global Option
            </div>
            <button
              onClick={() => switchCountry('US')}
              disabled={loading}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 transition text-left ${geo?.market === 'GLOBAL'
                  ? 'bg-amber-400 font-bold text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
            >
              <span>🌍 Global (US / ROW)</span>
              <span className="text-[10px] font-mono opacity-80">USD ($)</span>
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">
              Active: <strong className="text-white">{geo?.country || 'EG'}</strong> ({geo?.currency || 'EGP'})
            </span>
            <button
              onClick={() => switchCountry(null)}
              disabled={loading}
              className="text-amber-400 hover:underline font-bold"
            >
              Reset Auto
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md hover:bg-slate-800 transition"
          title="Market Preview (Experts & Admin only)"
        >
          <span>{currentMarket?.flag || '🇪🇬'}</span>
          <span className="text-amber-400">{geo?.country || 'EG'}</span>
          <span className="text-slate-400">({geo?.currency || 'EGP'})</span>
          <span className="rounded bg-amber-400/20 text-amber-300 px-1 py-0.2 text-[9px] font-normal uppercase">
            Preview
          </span>
        </button>
      )}
    </div>
  )
}
