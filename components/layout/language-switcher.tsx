'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Globe2, ChevronDown, Check } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import type { Language } from '@/lib/i18n/translations'

interface LanguageSwitcherProps {
  className?: string
  compact?: boolean
  dropUp?: boolean
}

interface LanguageOption {
  code: Language
  nativeName: string
  label: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', label: 'English' },
  { code: 'ar', nativeName: 'العربية', label: 'Arabic' },
]

export function LanguageSwitcher({
  className = '',
  compact = false,
  dropUp = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { language, setLanguage, isAr } = useLanguage()

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (code: Language) => {
    if (code !== language) {
      setLanguage(code)
    }
    setIsOpen(false)
  }

  // Always display the CURRENT language on the button (not the one to switch to)
  const currentDisplay = compact
    ? (isAr ? 'عربي' : 'EN')
    : (isAr ? 'العربية' : 'English')

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-start ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={isAr ? `اللغة الحالية: العربية. اضغط لتغيير اللغة` : `Current language: English. Click to choose language`}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface text-primary hover:border-accent hover:bg-secondary/40 transition shadow-2xs cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? 'px-2.5 py-1 text-xs font-bold' : 'px-3 py-1.5 text-[12px] font-bold'
          }`}
      >
        <Globe2 size={compact ? 13 : 14} className="text-primary shrink-0" />
        <span>{currentDisplay}</span>
        <ChevronDown
          size={compact ? 11 : 12}
          className={`text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute end-0 z-50 min-w-[150px] rounded-2xl border border-border bg-surface/98 p-1.5 shadow-lg backdrop-blur-md ltr:right-0 rtl:left-0 animate-in fade-in zoom-in-95 duration-150 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            {isAr ? 'اختر اللغة' : 'Select Language'}
          </div>
          <div className="space-y-0.5">
            {LANGUAGES.map((item) => {
              const isSelected = language === item.code
              return (
                <button
                  key={item.code}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(item.code)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs transition cursor-pointer select-none text-start ${isSelected
                      ? 'bg-secondary text-primary font-bold shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-primary font-medium'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                      {item.code}
                    </span>
                    <span className={isSelected ? 'text-primary font-bold' : 'text-foreground'}>
                      {item.nativeName}
                    </span>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-accent shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher

