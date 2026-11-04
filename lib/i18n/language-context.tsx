'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Language, translations, TranslationDictionary } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  isAr: boolean
  dir: 'ltr' | 'rtl'
  t: TranslationDictionary
  locale: (enText: string, arText: string) => string
  localizedValue: (val: { en?: string; ar?: string } | undefined | null) => string
  localeHref: (path: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || '/'

  // Initialize language: check if current URL pathname starts with /ar or cookie says ar
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const isPathAr = window.location.pathname === '/ar' || window.location.pathname.startsWith('/ar/')
      if (isPathAr) return 'ar'
      try {
        const stored = localStorage.getItem('bok_lang')
        if (stored === 'ar') return 'ar'
        if (document.cookie.includes('bok_lang=ar')) return 'ar'
      } catch {}
    }
    return 'en'
  })

  // Keep state synchronized with pathname
  useEffect(() => {
    const isPathAr = pathname === '/ar' || pathname.startsWith('/ar/')
    if (isPathAr && language !== 'ar') {
      setLanguageState('ar')
    } else if (!isPathAr && language === 'ar') {
      const isCookieAr = typeof document !== 'undefined' && document.cookie.includes('bok_lang=ar')
      if (!isCookieAr) {
        setLanguageState('en')
      }
    }
  }, [pathname, language])

  // Synchronize document attributes (dir and lang)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.setAttribute('lang', language)
      document.documentElement.setAttribute('dir', dir)
    }
  }, [language])

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang)

    if (typeof document !== 'undefined') {
      const dir = newLang === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.setAttribute('lang', newLang)
      document.documentElement.setAttribute('dir', dir)
      try {
        localStorage.setItem('bok_lang', newLang)
        document.cookie = `bok_lang=${newLang};path=/;max-age=31536000;SameSite=Lax`
      } catch {}

      const currentPath = window.location.pathname
      const currentSearch = window.location.search

      if (newLang === 'ar') {
        if (!currentPath.startsWith('/ar')) {
          const target = currentPath === '/' ? '/ar' : `/ar${currentPath}`
          router.push(`${target}${currentSearch}`)
        }
      } else {
        if (currentPath.startsWith('/ar')) {
          const target = currentPath.replace(/^\/ar/, '') || '/'
          router.push(`${target}${currentSearch}`)
        }
      }
    }
  }, [router])

  const toggleLanguage = useCallback(() => {
    const nextLang: Language = language === 'en' ? 'ar' : 'en'
    setLanguage(nextLang)
  }, [language, setLanguage])

  const isAr = language === 'ar'
  const dir: 'ltr' | 'rtl' = isAr ? 'rtl' : 'ltr'
  const t = useMemo(() => translations[language], [language])

  const locale = useCallback((enText: string, arText: string) => {
    return isAr ? arText : enText
  }, [isAr])

  const localizedValue = useCallback((val: { en?: string; ar?: string } | undefined | null) => {
    if (!val) return ''
    if (isAr) {
      return val.ar || val.en || ''
    }
    return val.en || val.ar || ''
  }, [isAr])

  const localeHref = useCallback((path: string): string => {
    if (!path || path.startsWith('http') || path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('tel:') || path.startsWith('/api')) {
      return path
    }
    if (isAr) {
      if (path === '/ar' || path.startsWith('/ar/')) return path
      return path === '/' ? '/ar' : `/ar${path.startsWith('/') ? path : '/' + path}`
    } else {
      if (path === '/ar') return '/'
      if (path.startsWith('/ar/')) return path.replace(/^\/ar/, '') || '/'
      return path
    }
  }, [isAr])

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isAr,
        dir,
        t,
        locale,
        localizedValue,
        localeHref,
      }}
    >
      <div dir={dir} className={isAr ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      toggleLanguage: () => {},
      isAr: false,
      dir: 'ltr',
      t: translations.en,
      locale: (enText) => enText,
      localizedValue: (val) => val?.en || '',
      localeHref: (path) => path,
    }
  }
  return context
}
