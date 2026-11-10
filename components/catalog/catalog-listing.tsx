'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { withBokBok } from '@/components/brand/bok-bok'
import { Search, Clock, Calendar, Users, ShieldCheck, Sparkles } from 'lucide-react'
import { CATEGORIES, getCategoryLabel, getSubcategoryLabel } from '@/lib/data/categories'
import { useLanguage } from '@/lib/i18n/language-context'

export interface CatalogItem {
  _id: string
  slug?: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  thumbnailUrl?: string
  intendedAudience?: { en: string; ar: string }
  categorySlug?: string
  subcategorySlug?: string
  bookingType?: 'APPOINTMENT' | 'WORKSHOP' | 'WEBINAR'
  serviceKind?: 'CONSULTATION' | 'GENERAL_SERVICE'
  deliveryMode?: 'ONLINE' | 'IN_PERSON'
  durationMinutes: number
  event?: {
    date: string
    startTime: string
    endTime: string
    capacity: number
    registeredCount: number
  }
  pricing: {
    baseCurrency: string
    prices: Record<string, number>
  }
  expertId: string
  expertName?: string
  expertRole?: string
  expertImage?: string
  expertSlug?: string
  isActive?: boolean
  approvalStatus?: string
}

interface CatalogListingProps {
  view: 'all' | 'consultations' | 'workshops' | 'webinars'
  title: string
  subtitle: string
  badgeText?: string
}

function CatalogListingContent({ view, title, subtitle }: CatalogListingProps) {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  const { isAr, t, localizedValue, localeHref } = useLanguage()

  const [items, setItems] = useState<CatalogItem[]>([])
  const [categories, setCategories] = useState<any[]>(CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || 'All')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All')

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }
  }, [categoryParam])

  useEffect(() => {
    // 1. Fetch live published & approved MVP services
    fetch(`/api/services?type=${view}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data)
        }
      })
      .catch((err) => console.error('Failed to load offerings:', err))
      .finally(() => setLoading(false))

    // 2. Fetch active approved MVP categories
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCategories(json.data)
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))
  }, [view])

  // Active category object for subcategories list
  const activeCategoryObj: any = useMemo(() => {
    if (selectedCategory === 'All') return null
    const sourceList = categories.length > 0 ? categories : CATEGORIES
    return sourceList.find(
      (c) =>
        c.slug?.toLowerCase() === selectedCategory.toLowerCase() ||
        (c.name?.en || c.title?.en || '').toLowerCase() === selectedCategory.toLowerCase()
    )
  }, [categories, selectedCategory])

  // Filter items by search, category, and subcategory
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const titleEn = item.title?.en || ''
      const titleAr = item.title?.ar || ''
      const descEn = item.description?.en || ''
      const expertName = item.expertName || ''
      const categorySlug = item.categorySlug || ''
      const subcategorySlug = item.subcategorySlug || ''

      const searchTerms = `${titleEn} ${titleAr} ${descEn} ${expertName}`.toLowerCase()
      const matchesSearch = !search.trim() || searchTerms.includes(search.toLowerCase())

      const matchesCategory =
        selectedCategory === 'All' ||
        categorySlug.toLowerCase() === selectedCategory.toLowerCase() ||
        (activeCategoryObj && categorySlug.toLowerCase() === activeCategoryObj.slug?.toLowerCase())

      const matchesSubcategory =
        selectedSubcategory === 'All' ||
        subcategorySlug.toLowerCase() === selectedSubcategory.toLowerCase()

      return matchesSearch && matchesCategory && matchesSubcategory
    })
  }, [items, search, selectedCategory, selectedSubcategory, activeCategoryObj])

  // Dynamic titles based on active language
  const displayTitle = isAr
    ? view === 'consultations'
      ? 'استشارات الخبراء الفردية'
      : view === 'workshops'
        ? 'ورش العمل التفاعلية'
        : view === 'webinars'
          ? 'الندوات المباشرة'
          : 'استكشف المنصة'
    : title

  const displaySubtitle = isAr
    ? view === 'consultations'
      ? 'تواصل مباشرة مع نخبة من المختصين المعتمدين لحل تحدياتك وتطوير مسارك المهني.'
      : view === 'workshops'
        ? 'انضم لمجموعات تدريبية تطبيقية صغيرة ومكثفة بإشراف خبراء متخصصين.'
        : view === 'webinars'
          ? 'محاضرات تفاعلية وجلسات نقاش حية مع نخبة المتخصصين والمهنيين.'
          : 'اكتشف الجلسات الفردية، ورش العمل التفاعلية، والندوات المباشرة المعتمدة عبر 9 مجالات رئيسية.'
    : subtitle

  return (
    <main className="min-h-screen bg-background text-foreground py-5 sm:py-7">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        {/* Header: Compact title and subtitle with count */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
              {withBokBok(displayTitle)}
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">
              {withBokBok(displaySubtitle)}
            </p>
          </div>
          <div className="shrink-0 text-xs text-muted-foreground font-medium">
            {isAr ? (
              <>
                عرض <strong className="text-primary">{filtered.length}</strong> عروض معتمدة
              </>
            ) : (
              <>
                Showing <strong className="text-primary">{filtered.length}</strong> approved offerings
              </>
            )}
          </div>
        </div>

        {/* Unified Search & Filters Card */}
        <div className="mt-2 rounded-2xl border border-border bg-surface p-3.5 sm:p-4 shadow-xs flex flex-col gap-3">
          {/* Top Row: Search Input */}
          <div className="relative flex items-center rounded-xl border border-border bg-background px-3 py-1.5 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.catalog.searchPlaceholder}
              className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories Pill Bar - Wrapped, Clear, Completely Visible (No Swiping) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {isAr ? 'تصفح حسب المجال:' : 'Browse by category:'}
              </span>
              {selectedCategory !== 'All' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All')
                    setSelectedSubcategory('All')
                  }}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  {isAr ? 'عرض كل المجالات' : 'Reset category'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All')
                  setSelectedSubcategory('All')
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${selectedCategory === 'All'
                    ? 'bg-secondary border border-accent text-primary shadow-xs ring-1 ring-accent/30'
                    : 'bg-surface border border-border text-foreground hover:bg-secondary/40 hover:border-accent/40 font-medium'
                  }`}
              >
                {selectedCategory === 'All' && (
                  <span className="size-1.5 rounded-full bg-accent shrink-0" />
                )}
                <span>{t.catalog.allCategories}</span>
              </button>

              {categories.map((cat) => {
                const catLabel = isAr
                  ? cat.title?.ar || cat.name?.ar || cat.name?.en || cat.title?.en
                  : cat.title?.en || cat.name?.en || cat.name?.ar || cat.title?.ar

                const isSelected =
                  selectedCategory.toLowerCase() === cat.slug?.toLowerCase() ||
                  selectedCategory.toLowerCase() === (cat.name?.en || cat.title?.en || '').toLowerCase()

                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.slug)
                      setSelectedSubcategory('All')
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${isSelected
                        ? 'bg-secondary border border-accent text-primary shadow-xs ring-1 ring-accent/30'
                        : 'bg-surface border border-border text-foreground hover:bg-secondary/40 hover:border-accent/40 font-medium'
                      }`}
                  >
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-accent shrink-0" />
                    )}
                    <span>{catLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subcategories Section when a Category is selected */}
          {activeCategoryObj && Array.isArray(activeCategoryObj.subcategories) && activeCategoryObj.subcategories.length > 0 && (
            <div className="pt-2.5 border-t border-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isAr
                    ? `التخصصات المتاحة (${activeCategoryObj.title?.ar || activeCategoryObj.name?.ar || ''}):`
                    : `Specializations in ${activeCategoryObj.title?.en || activeCategoryObj.name?.en || ''}:`}
                </span>
                {selectedSubcategory !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory('All')}
                    className="text-[11px] font-bold text-accent hover:underline"
                  >
                    {isAr ? 'عرض جميع التخصصات' : 'All specializations'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory('All')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${selectedSubcategory === 'All'
                      ? 'bg-accent text-primary shadow-xs'
                      : 'bg-surface border border-border text-foreground hover:bg-secondary/40 hover:border-accent/40 font-medium'
                    }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                {activeCategoryObj.subcategories.map((sub: any) => {
                  const subLabel = isAr
                    ? sub.title?.ar || sub.name?.ar || sub.name?.en || sub.title?.en
                    : sub.title?.en || sub.name?.en || sub.name?.ar || sub.title?.ar

                  const isSubSelected = selectedSubcategory === sub.slug

                  return (
                    <button
                      key={sub.slug}
                      type="button"
                      onClick={() => setSelectedSubcategory(sub.slug)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${isSubSelected
                          ? 'bg-accent text-primary shadow-xs'
                          : 'bg-surface border border-border text-foreground hover:bg-secondary/40 hover:border-accent/40 font-medium'
                        }`}
                    >
                      {subLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Cards Grid - Directly under filters! */}
        <div className="mt-5 pb-16">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-muted-foreground">
              {isAr ? 'جاري تحميل العروض...' : 'Loading offerings...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-12 text-center">
              <p className="text-base font-bold text-primary">{t.catalog.noOfferingsFound}</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => {
                const catLabel = getCategoryLabel(item.categorySlug, isAr ? 'ar' : 'en')
                const subLabel = getSubcategoryLabel(item.categorySlug, item.subcategorySlug, isAr ? 'ar' : 'en')
                const titleText = isAr ? item.title?.ar || item.title?.en : item.title?.en || item.title?.ar
                const descText = isAr ? item.description?.ar || item.description?.en : item.description?.en || item.description?.ar
                const audienceText = isAr
                  ? item.intendedAudience?.ar || item.intendedAudience?.en
                  : item.intendedAudience?.en || item.intendedAudience?.ar

                return (
                  <div
                    key={item._id}
                    className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface shadow-xs transition hover:-translate-y-1 hover:border-accent/60 hover:shadow-md"
                  >
                    <div>
                      {/* Service Card Thumbnail */}
                      <Link
                        href={localeHref(`/services/${item.slug || item._id}`)}
                        className="relative block h-48 w-full overflow-hidden bg-gradient-to-br from-[#101F49] via-[#1c3575] to-[#2855C5]"
                      >
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={titleText}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                            <div className="mb-2.5 flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xs">
                              <Sparkles size={22} className="text-[#F8C15C]" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-white/85">
                              {catLabel}
                            </span>
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                        {/* Top Floating Category & Subcategory Badges */}
                        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-[#101F49] shadow-xs">
                              {catLabel}
                            </span>
                            {subLabel && (
                              <span className="rounded-full bg-[#F8C15C]/95 backdrop-blur-xs text-[#101F49] px-2.5 py-1 text-[10px] font-bold shadow-xs">
                                {subLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Floating Duration/Date & Price Pill */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-xs border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
                            {item.event ? (
                              <>
                                <Calendar size={11} /> {item.event.date}
                              </>
                            ) : (
                              <>
                                <Clock size={11} /> {item.durationMinutes} {t.catalog.duration}
                              </>
                            )}
                          </span>

                          <span className="rounded-2xl bg-white/95 backdrop-blur-xs px-3 py-1 text-xs font-black text-[#101F49] shadow-sm shrink-0">
                            {item.pricing?.prices?.[item.pricing?.baseCurrency || 'EGP'] ?? 0}{' '}
                            {item.pricing?.baseCurrency || 'EGP'}
                          </span>
                        </div>
                      </Link>

                      {/* Card Body */}
                      <div className="p-5 sm:p-6 pb-0">
                        <Link href={localeHref(`/services/${item.slug || item._id}`)}>
                          <h3 className="text-base font-bold text-primary leading-snug group-hover:text-accent-hover transition line-clamp-2">
                            {titleText}
                          </h3>
                        </Link>

                        {descText && (
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {descText}
                          </p>
                        )}

                        {audienceText && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Users size={12} className="text-primary shrink-0" />
                            <span className="truncate">
                              {isAr ? 'الفئة المستهدفة: ' : 'Audience: '}
                              <strong className="text-primary">{audienceText}</strong>
                            </span>
                          </div>
                        )}

                        {/* Event or Duration info */}
                        {item.event ? (
                          <div className="mt-4 rounded-xl bg-secondary/80 border border-accent/30 p-2.5 text-[11px] text-primary space-y-1">
                            <div className="flex items-center justify-between text-primary/80">
                              <span className="font-semibold">
                                {item.event.startTime} - {item.event.endTime}
                              </span>
                              <span className="font-bold">
                                {item.event.capacity - (item.event.registeredCount || 0)}{' '}
                                {isAr ? 'أماكن متبقية' : 'spots left'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3.5 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock size={13} />
                              {item.durationMinutes} {t.catalog.duration}
                            </span>
                            <span className="rounded-full bg-secondary text-primary px-2 py-0.5 text-[10px] font-bold">
                              {isAr ? 'معتمد' : 'Verified'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 pt-4 mt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative size-7 overflow-hidden rounded-full bg-secondary">
                            <Image
                              src={item.expertImage || '/experts/layla.png'}
                              alt={item.expertName || 'Expert'}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="text-xs font-bold text-primary truncate max-w-[120px]">
                            {item.expertName}
                          </span>
                        </div>

                        <Link
                          href={localeHref(`/services/${item.slug || item._id}`)}
                          className="rounded-full bg-accent hover:bg-accent-hover text-primary font-bold px-4 py-1.5 text-xs transition shadow-xs"
                        >
                          {t.catalog.bookNow} {isAr ? '←' : '→'}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export function CatalogListing(props: CatalogListingProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background text-foreground py-24 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Loading marketplace offerings...
          </p>
        </main>
      }
    >
      <CatalogListingContent {...props} />
    </Suspense>
  )
}
