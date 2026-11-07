'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/brand/logo'
import { Menu, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import { LanguageSwitcher } from './language-switcher'

// Routes where the standard public marketing navbar must NOT appear
const HIDDEN_PATH_PREFIXES = [
  '/dashboard',
  '/expert-dashboard',
  '/admin',
  '/login',
  '/signup',
  '/onboarding',
]

export function SiteHeader() {
  const pathname = usePathname() || ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t, localeHref } = useLanguage()

  // Normalize path for hidden checks (remove /ar prefix if present)
  const normalizedPath = pathname.replace(/^\/ar/, '') || '/'

  // Hide on dashboard, admin, auth, and onboarding screens
  const isHidden = HIDDEN_PATH_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
  )

  if (isHidden) {
    return null
  }

  const navLinks = [
    { label: t.header.consultations, href: '/consultations' },
    { label: t.header.workshops, href: '/workshops' },
    { label: t.header.webinars, href: '/webinars' },
    { label: t.header.explore, href: '/explore' },
    { label: t.header.experts, href: '/experts' },
    { label: t.header.howItWorks, href: '/how-it-works' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return normalizedPath === '/'
    return normalizedPath.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-[82px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
        {/* Brand Logo */}
        <BrandLogo href={localeHref('/')} />

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-5 text-[13px] font-medium text-muted-foreground lg:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={localeHref(link.href)}
                className={`transition-colors py-1 ${active
                  ? 'font-bold text-primary border-b-2 border-accent'
                  : 'hover:text-primary'
                  }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Right CTAs */}
        <div className="hidden items-center gap-3 sm:flex">
          {/* Language Switcher */}
          <LanguageSwitcher />

          <Link
            href={localeHref('/login')}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-primary hover:bg-surface transition"
          >
            {t.header.login}
          </Link>
          <Link
            href={localeHref('/signup')}
            className="rounded-full bg-accent hover:bg-accent-hover px-5 py-2.5 text-[13px] font-bold text-primary shadow-xs transition"
          >
            {t.header.signup}
          </Link>
        </div>

        {/* Mobile Menu Button & Language Switcher */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher compact />
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid size-10 place-items-center rounded-full bg-surface text-primary border border-border"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-border bg-background px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={localeHref(link.href)}
                  onClick={() => setMobileOpen(false)}
                  className={`py-1.5 transition ${active ? 'font-bold text-primary' : 'text-foreground hover:text-primary'
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <Link
              href={localeHref('/login')}
              onClick={() => setMobileOpen(false)}
              className="text-xs font-bold text-primary hover:underline"
            >
              {t.header.login}
            </Link>
            <Link
              href={localeHref('/signup')}
              onClick={() => setMobileOpen(false)}
              className="rounded-full bg-accent hover:bg-accent-hover px-4 py-2 text-xs font-bold text-primary"
            >
              {t.header.signup}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default SiteHeader
