'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/brand/logo'
import { Menu, X, Globe2, ChevronDown } from 'lucide-react'

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
  const [language, setLanguage] = useState<'EN' | 'AR'>('EN')

  // Hide on dashboard, admin, auth, and onboarding screens
  const isHidden = HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  if (isHidden) {
    return null
  }

  const navLinks = [
    { label: 'Consultations', href: '/consultations' },
    { label: 'Services', href: '/services' },
    { label: 'Workshops', href: '/workshops' },
    { label: 'Webinars', href: '/webinars' },
    { label: 'Explore All', href: '/explore' },
    { label: 'Experts', href: '/experts' },
    { label: 'How It Works', href: '/how-it-works' }
    // { label: 'Workspace', href: '/dashboard' },
    // { label: 'Admin Ops', href: '/admin' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e7e2da] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[82px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
        {/* Brand Logo */}
        <BrandLogo href="/" />

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-5 text-[13px] font-medium text-[#637084] lg:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1 ${active
                  ? 'font-bold text-[#ef5b4c] border-b-2 border-[#ef5b4c]'
                  : 'hover:text-[#ef5b4c]'
                  }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Right CTAs */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/translate"
            className="flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-semibold text-[#637084] hover:bg-white transition"
          >
            <Globe2 size={15} />
            <span>{language}</span>
            <ChevronDown size={13} />
          </Link>
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#14243b] hover:bg-white transition"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#14243b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#ef5b4c]"
          >
            Sign up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="grid size-10 place-items-center rounded-full bg-white text-[#14243b] border border-[#e7e2da] lg:hidden"
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-[#e7e2da] bg-[#fbfaf7] px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`py-1.5 transition ${active ? 'font-bold text-[#ef5b4c]' : 'text-[#14243b] hover:text-[#ef5b4c]'
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-5 flex items-center justify-between border-t border-[#e7e2da] pt-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-xs font-bold text-[#14243b] hover:underline"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="rounded-full bg-[#14243b] px-4 py-2 text-xs font-bold text-white hover:bg-[#ef5b4c]"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default SiteHeader
