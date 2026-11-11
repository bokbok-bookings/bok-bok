'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BokBok } from '@/components/brand/bok-bok'
import { useMemo, useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { EXPERTS } from '@/lib/data/experts'
import { CATEGORIES } from '@/lib/data/categories'
import { useLanguage } from '@/lib/i18n/language-context'

export default function ExpertsPage() {
  const { isAr, t, localeHref } = useLanguage()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [dbExperts, setDbExperts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>(CATEGORIES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/experts')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setDbExperts(json.data)
        }
      })
      .catch((err) => console.error('Failed to load experts from DB:', err))
      .finally(() => setLoading(false))

    // Dynamically load active categories for filters
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCategories(json.data)
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))
  }, [])

  const filterOptions = useMemo(() => {
    const list: { id: string; label: string }[] = [
      { id: 'ALL', label: isAr ? 'جميع الخبراء' : 'All experts' },
    ]
    const sourceList = categories && categories.length > 0 ? categories : CATEGORIES
    sourceList.forEach((cat) => {
      const label = isAr
        ? cat.name?.ar || cat.title?.ar || cat.name?.en || cat.title?.en
        : cat.name?.en || cat.title?.en || cat.name?.ar || cat.title?.ar
      const slug = cat.slug || cat.id
      if (label && !list.some((item) => item.id === slug)) {
        list.push({ id: slug, label })
      }
    })
    return list
  }, [categories, isAr])

  const allExperts = useMemo(() => {
    if (dbExperts.length > 0) {
      return dbExperts
    }
    return EXPERTS
  }, [dbExperts])

  const results = useMemo(() => {
    return allExperts.filter((expert) => {
      const tagsList = Array.isArray(expert.tags) ? expert.tags : []
      const catSlugs = Array.isArray(expert.categorySlugs) ? expert.categorySlugs : []
      const expertRole = expert.role || ''
      const expertLocation = expert.location || ''
      const matchesQuery = `${expert.name} ${expertRole} ${expertLocation} ${tagsList.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase())

      if (!matchesQuery) return false
      if (filter === 'ALL') return true

      const fLower = filter.toLowerCase()
      const fParts = fLower.split('-').filter(Boolean)

      const matchesFilter =
        tagsList.some((t: string) => {
          const tLower = t.toLowerCase()
          return (
            tLower === fLower ||
            fLower.includes(tLower) ||
            tLower.includes(fLower) ||
            fParts.some((part) => tLower.includes(part))
          )
        }) ||
        catSlugs.some((c: string) => {
          const cLower = c.toLowerCase()
          return (
            cLower === fLower ||
            fLower.includes(cLower) ||
            cLower.includes(fLower) ||
            fParts.some((part) => cLower.includes(part))
          )
        }) ||
        (expert.categorySlug &&
          (expert.categorySlug.toLowerCase().includes(fLower) ||
            fLower.includes(expert.categorySlug.toLowerCase()) ||
            fParts.some((part) => expert.categorySlug.toLowerCase().includes(part)))) ||
        fParts.some((part) => expertRole.toLowerCase().includes(part))

      return matchesFilter
    })
  }, [allExperts, filter, query])

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden py-5 sm:py-7">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12 w-full">
        {/* Header: Compact title and subtitle with count */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-3">
          <div>
            <Link
              href={localeHref('/')}
              className="mb-1 inline-flex items-center text-xs font-bold text-primary hover:underline"
            >
              {isAr ? '← العودة للرئيسية' : '← Back home'}
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
              {isAr ? (
                <>
                  تواصل مع من{' '}
                  <span className="relative inline-block text-primary">
                    <span className="relative z-10">يفهم تحدياتك.</span>
                    <span className="absolute bottom-1 left-0 w-full h-2.5 bg-accent -z-0 rounded-sm" />
                  </span>
                </>
              ) : (
                <>
                  Find someone who{' '}
                  <span className="relative inline-block text-primary">
                    <span className="relative z-10">gets it.</span>
                    <span className="absolute bottom-1 left-0 w-full h-1.5 bg-accent -z-0 rounded-sm" />
                  </span>
                </>
              )}
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">
              {isAr
                ? 'تصفح نخبة من المتخصصين المعتمدين في الأعمال، التسويق، التكنولوجيا، والمسار المهني.'
                : 'Browse vetted experts across business, marketing, product, and career with direct live bookings.'}
            </p>
          </div>
          <div className="shrink-0 text-xs text-muted-foreground font-medium">
            <span className="font-bold text-primary">
              {results.length} {isAr ? 'خبير معتمد' : 'vetted experts'}
            </span>{' '}
            {isAr ? 'جاهزون للمساعدة' : 'ready to help'}
          </div>
        </div>

        {/* Unified Search & Filters Card */}
        <div className="mt-2 rounded-2xl border border-border bg-surface p-3.5 sm:p-4 shadow-xs flex flex-col gap-3">
          {/* Top Row: Search Input */}
          <div className="relative flex items-center rounded-xl border border-border bg-background px-3 py-1.5 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              aria-label={t.experts.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.experts.searchPlaceholder}
              className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              >
                ✕
              </button>
            )}
            <button
              type="button"
              className="rounded-lg bg-accent hover:bg-accent-hover text-primary font-bold px-3 py-1 text-xs transition shrink-0 shadow-xs"
            >
              {t.experts.searchBtn}
            </button>
          </div>

          {/* Categories Pill Bar - Wrapped, clear, all 8 categories visible */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {isAr ? 'تصفح حسب المجال:' : 'Browse by category:'}
              </span>
              {filter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setFilter('ALL')}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  {isAr ? 'عرض كل المجالات' : 'Reset category filter'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {filterOptions.map((item) => {
                const isSelected = filter === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${isSelected
                      ? 'bg-secondary border border-accent text-primary shadow-xs ring-1 ring-accent/30'
                      : 'bg-surface border border-border text-foreground hover:bg-secondary/40 hover:border-accent/40 font-medium'
                      }`}
                  >
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-accent shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Directory Grid - Directly under filters! */}
        <div className="mt-5 pb-20">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-muted-foreground">
              {isAr ? 'جاري تحميل الخبراء...' : 'Loading experts...'}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground bg-surface">
              {t.experts.noExperts}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {results.map((expert) => (
                <Link
                  key={expert.slug}
                  href={localeHref(`/experts/${expert.slug}`)}
                  className="group flex flex-col justify-between rounded-[28px] border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-accent hover:shadow-lg cursor-pointer"
                >
                  <div>
                    <div className="relative h-52 overflow-hidden rounded-2xl bg-secondary/60">
                      <Image
                        src={expert.image || expert.avatarUrl || '/experts/layla.png'}
                        alt={`${expert.name} portrait`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-[10px] font-bold text-primary shadow-xs border border-border/50">
                        {isAr ? 'خبير معتمد' : 'Vetted expert'}
                      </span>
                    </div>

                    <div className="mt-5 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-primary group-hover:text-primary transition-colors">
                          {expert.name}
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">{expert.role}</p>
                        <p className="mt-1 text-xs text-muted-foreground/80">{expert.location}</p>
                      </div>
                      {Number(expert.reviews) > 0 && Number(expert.rating) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-accent/40 px-2.5 py-1 text-[11px] font-bold text-primary shrink-0">
                          <span className="text-accent">★</span>
                          <span>{expert.rating}</span>
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground line-clamp-3">
                      {expert.bio}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(expert.tags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full bg-secondary text-primary px-2.5 py-1 text-[10px] font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-primary group-hover:text-primary transition-colors inline-flex items-center gap-1.5">
                      {isAr ? 'عرض الملف والحجز' : 'View profile & book'}
                    </span>
                    <span className="grid size-8 place-items-center rounded-full bg-accent text-primary transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 shadow-xs">
                      <span className="text-sm font-bold leading-none">{isAr ? '←' : '→'}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
