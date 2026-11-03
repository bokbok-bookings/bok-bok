'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { withBokBok } from '@/components/brand/bok-bok'
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/data/categories'
import {
  Search,
  Calendar,
  Clock,
  ShieldCheck,
  Users,
} from 'lucide-react'

export interface CatalogPageProps {
  view: 'consultations' | 'services' | 'workshops' | 'webinars' | 'all'
  title: React.ReactNode
  subtitle: React.ReactNode
  badgeText: string
}

export function CatalogListing({ view, title, subtitle, badgeText }: CatalogPageProps) {
  const [services, setServices] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSubcategory, setSelectedSubcategory] = useState('All')

  useEffect(() => {
    setLoading(true)
    const url = new URL('/api/services', window.location.origin)
    if (view !== 'all') url.searchParams.set('view', view)

    fetch(url.toString())
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setServices(json.data)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))

    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data)
        }
      })
      .catch((err) => console.error(err))
  }, [view])

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.slug === selectedCategory),
    [categories, selectedCategory]
  )

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchCat =
        selectedCategory === 'All' || s.categorySlug === selectedCategory
      const matchSub =
        selectedSubcategory === 'All' || s.subcategorySlug === selectedSubcategory
      const textMatch =
        !search.trim() ||
        `${s.title?.en || ''} ${s.title?.ar || ''} ${s.description?.en || ''} ${s.description?.ar || ''} ${s.tags?.join(' ') || ''} ${s.expertName || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      return matchCat && matchSub && textMatch
    })
  }, [services, selectedCategory, selectedSubcategory, search])

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#14243b]">
      {/* Hero Banner */}
      <section className="border-b border-[#e7e2da] bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-[#fff2ed] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#ef5b4c]">
              {badgeText}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f2ee] px-3 py-1 text-[11px] font-bold text-[#14243b]">
              <ShieldCheck size={12} className="text-[#ef5b4c]" /> Adults 18+ Only • للبالغين +18 فقط
            </span>
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[#14243b]">
            {withBokBok(title)}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[#637084]">{withBokBok(subtitle)}</p>

          {/* Search & Category Filter */}
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[#dedbd5] bg-[#faf8f5] p-2.5 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Search size={16} className="text-[#8b94a1]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by topic, consultation, workshop, webinar, or expert..."
                className="w-full bg-transparent text-xs text-[#14243b] outline-none placeholder:text-[#8b94a1]"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => {
                  setSelectedCategory('All')
                  setSelectedSubcategory('All')
                }}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedCategory === 'All'
                    ? 'bg-[#14243b] text-white'
                    : 'bg-white border border-[#dedbd5] text-[#637084] hover:text-[#14243b]'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => {
                    setSelectedCategory(cat.slug)
                    setSelectedSubcategory('All')
                  }}
                  className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedCategory === cat.slug
                      ? 'bg-[#14243b] text-white'
                      : 'bg-white border border-[#dedbd5] text-[#637084] hover:text-[#14243b]'
                  }`}
                >
                  {cat.name?.en || cat.title?.en}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory Filter Bar when a Category is selected */}
          {activeCategoryObj && Array.isArray(activeCategoryObj.subcategories) && activeCategoryObj.subcategories.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedSubcategory('All')}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold transition ${
                  selectedSubcategory === 'All'
                    ? 'bg-[#ef5b4c] text-white'
                    : 'bg-white border border-[#e7e2da] text-[#637084] hover:text-[#14243b]'
                }`}
              >
                All in {activeCategoryObj.name?.en} ({activeCategoryObj.name?.ar})
              </button>
              {activeCategoryObj.subcategories.map((sub: any) => (
                <button
                  key={sub.slug}
                  onClick={() => setSelectedSubcategory(sub.slug)}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold transition ${
                    selectedSubcategory === sub.slug
                      ? 'bg-[#ef5b4c] text-white'
                      : 'bg-white border border-[#e7e2da] text-[#637084] hover:text-[#14243b]'
                  }`}
                >
                  {sub.name?.en} • {sub.name?.ar}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cards Grid */}
      <section className="mx-auto max-w-[1280px] px-5 sm:px-8 py-12">
        <div className="mb-6 flex items-center justify-between text-xs text-[#637084]">
          <span>
            Showing <strong>{filtered.length}</strong> approved MVP offerings
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-[#8b94a1]">
            Loading offerings...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#dedbd5] bg-white p-16 text-center">
            <p className="text-base font-bold text-[#14243b]">No offerings found</p>
            <p className="mt-1 text-xs text-[#637084]">
              Try selecting another MVP category or clearing your search.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const catLabelEn = getCategoryLabel(item.categorySlug, 'en')
              const subLabelEn = getSubcategoryLabel(item.categorySlug, item.subcategorySlug, 'en')
              const subLabelAr = getSubcategoryLabel(item.categorySlug, item.subcategorySlug, 'ar')
              return (
                <div
                  key={item._id}
                  className="group flex flex-col justify-between rounded-3xl border border-[#e7e2da] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#f1b0a7] hover:shadow-xl"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[#f4f2ee] px-2.5 py-0.5 text-[10px] font-bold text-[#14243b]">
                          {catLabelEn}
                        </span>
                        {subLabelEn && (
                          <span className="rounded-full bg-[#fff2ed] px-2.5 py-0.5 text-[10px] font-bold text-[#ef5b4c]">
                            {subLabelEn}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-black text-[#14243b] shrink-0">
                        {item.pricing?.prices?.[item.pricing?.baseCurrency || 'EGP'] ?? 0}{' '}
                        {item.pricing?.baseCurrency || 'EGP'}
                      </span>
                    </div>

                    {subLabelAr && (
                      <p className="mt-1 text-[10px] font-medium text-[#8b94a1]" dir="rtl">
                        {subLabelAr}
                      </p>
                    )}

                    <h3 className="mt-3 text-base font-bold text-[#14243b] leading-snug group-hover:text-[#ef5b4c] transition">
                      {item.title?.en}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#8b94a1]" dir="rtl">
                      {item.title?.ar}
                    </p>

                    {item.description?.en && (
                      <p className="mt-3 text-xs leading-relaxed text-[#637084] line-clamp-2">
                        {item.description.en}
                      </p>
                    )}

                    {item.intendedAudience?.en && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#637084]">
                        <Users size={12} className="text-[#ef5b4c] shrink-0" />
                        <span className="truncate">
                          Audience: <strong className="text-[#14243b]">{item.intendedAudience.en}</strong> (18+)
                        </span>
                      </div>
                    )}

                    {/* Event or Duration info */}
                    {item.event ? (
                      <div className="mt-4 rounded-xl bg-blue-50/70 border border-blue-200/60 p-2.5 text-[11px] text-blue-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Calendar size={13} /> {item.event.date}
                        </div>
                        <div className="flex items-center justify-between text-blue-800">
                          <span>
                            {item.event.startTime} - {item.event.endTime}
                          </span>
                          <span>
                            {item.event.capacity - (item.event.registeredCount || 0)} spots left
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center justify-between text-[11px] text-[#637084]">
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} />
                          {item.durationMinutes} min session
                        </span>
                        <span className="rounded-full bg-[#f4f2ee] px-2 py-0.5 text-[10px] font-bold text-[#14243b]">
                          18+ Adults
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 border-t border-[#f4f2ee] pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative size-7 overflow-hidden rounded-full bg-[#f5c3a8]">
                          <Image
                            src={item.expertImage || '/experts/layla.png'}
                            alt={item.expertName || 'Expert'}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-xs font-bold text-[#14243b] truncate max-w-[120px]">
                          {item.expertName}
                        </span>
                      </div>

                      <Link
                        href={`/services/${item.slug || item._id}`}
                        className="rounded-full bg-[#14243b] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#ef5b4c]"
                      >
                        Book →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
