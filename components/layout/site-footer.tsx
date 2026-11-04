'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/brand/logo'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'

// Routes where the standard public footer must NOT appear
const HIDDEN_PATH_PREFIXES = [
  '/dashboard',
  '/expert-dashboard',
  '/admin',
  '/login',
  '/signup',
  '/onboarding',
]

export function SiteFooter() {
  const pathname = usePathname() || ''
  const { isAr, t, localeHref } = useLanguage()

  // Normalize path for hidden checks (remove /ar prefix if present)
  const normalizedPath = pathname.replace(/^\/ar/, '') || '/'

  // Hide on dashboard, admin, auth, and onboarding screens
  const isHidden = HIDDEN_PATH_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
  )

  if (isHidden) {
    return null
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border bg-surface text-foreground transition-colors">
      <div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-2">
            <BrandLogo href={localeHref('/')} size="md" />
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              {t.footer.description}
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary border border-accent/30 px-3 py-1 text-[11px] font-bold text-primary">
              <ShieldCheck size={14} className="text-primary" />
              <span>{t.footer.verifiedBadge}</span>
            </div>
          </div>

          {/* Formats Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              {t.footer.marketplaceFormats}
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link href={localeHref('/consultations')} className="hover:text-primary transition-colors">
                  {t.header.consultations}
                </Link>
              </li>
              <li>
                <Link href={localeHref('/workshops')} className="hover:text-primary transition-colors">
                  {t.header.workshops}
                </Link>
              </li>
              <li>
                <Link href={localeHref('/webinars')} className="hover:text-primary transition-colors">
                  {t.header.webinars}
                </Link>
              </li>
              <li>
                <Link href={localeHref('/explore')} className="hover:text-primary transition-colors">
                  {t.header.explore}
                </Link>
              </li>
              <li>
                <Link href={localeHref('/experts')} className="hover:text-primary transition-colors">
                  {t.header.experts}
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              {t.footer.learnDiscover}
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link href={localeHref('/how-it-works')} className="hover:text-primary transition-colors">
                  {t.header.howItWorks}
                </Link>
              </li>
              <li>
                <Link href={localeHref('/signup')} className="hover:text-primary transition-colors">
                  {t.footer.applyAsExpert}
                </Link>
              </li>
              <li>
                <Link href={localeHref('/login')} className="hover:text-primary transition-colors">
                  {t.footer.expertSignIn}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Trust Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              {t.footer.trustSupport}
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link href={localeHref('/how-it-works')} className="hover:text-primary transition-colors">
                  {isAr ? 'آلية التحقق والاعتماد' : 'Verification Process'}
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground/80 cursor-default">
                  {t.footer.specialistsTransfers}
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/80 cursor-default">
                  {t.footer.mvpScope}
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/80 cursor-default">
                  {t.footer.approvedTaxonomy}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {currentYear} Bok Bok. {t.footer.allRightsReserved}</p>
          <div className="flex items-center gap-6 text-xs font-medium">
            <span>{t.footer.tagline}</span>
            <span>•</span>
            <Link href={localeHref('/how-it-works')} className="hover:text-primary transition-colors">
              {t.footer.guidelines}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
