'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { EXPERTS } from '@/lib/data/experts'

export default function ExpertsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All experts')
  const [dbExperts, setDbExperts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
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
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data)
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))
  }, [])

  const filterOptions = useMemo(() => {
    const list = ['All experts']
    if (categories.length > 0) {
      categories.forEach((cat) => {
        const name = cat.name?.en || cat.title?.en
        if (name && !list.includes(name)) list.push(name)
      })
    } else {
      list.push('Marketing', 'Business', 'Technology', 'Career', 'Design')
    }
    return list
  }, [categories])

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
      const matchesQuery = `${expert.name} ${expert.role} ${expert.location} ${tagsList.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchesFilter =
        filter === 'All experts' ||
        tagsList.some((t: string) => t.toLowerCase() === filter.toLowerCase()) ||
        catSlugs.some((c: string) => c.toLowerCase().includes(filter.toLowerCase())) ||
        (expert.categorySlug && expert.categorySlug.toLowerCase().includes(filter.toLowerCase()))
      return matchesQuery && matchesFilter
    })
  }, [allExperts, filter, query])

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#14243b] overflow-x-hidden">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12 w-full">
        {/* Header */}
        <header className="flex h-[82px] items-center justify-between border-b border-[#e7e2da]">
          <Link href="/" className="flex items-center gap-2.5 text-[22px] font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#ef5b4c] text-sm font-black text-white">
              B
            </span>
            Bok Bok
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#637084] lg:flex">
            <Link className="font-bold text-[#ef5b4c]" href="/experts">
              Find an Expert
            </Link>
            <Link href="/dashboard">Expert Workspace</Link>
            <Link href="/dashboard/availability">Schedule</Link>
            <Link href="/admin">Admin Ops</Link>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-[13px] font-semibold text-[#14243b] hover:border-[#14243b]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#14243b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#ef5b4c]"
            >
              Join as Expert
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-14 sm:py-16">
          <Link
            href="/"
            className="mb-6 inline-flex items-center text-xs font-bold text-[#ef5b4c] hover:underline"
          >
            ← Back home
          </Link>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.17em] text-[#ef5b4c]">
              The Bok Bok directory
            </p>
            <h1 className="mt-3 text-5xl font-semibold leading-[.98] tracking-[-.06em] sm:text-7xl">
              Find someone who
              <br />
              <span className="text-[#ef5b4c]">gets it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#637084]">
              Browse vetted experts across business, marketing, product, and career. Each expert
              manages their own availability schedule so you can book live slots that fit your week.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="mt-10 flex flex-col gap-3 rounded-3xl border border-[#e7e2da] bg-white p-3 shadow-sm sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center px-3">
              <input
                aria-label="Search experts"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, skill, or topic..."
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[#a2a9b2]"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto border-t border-[#eeeae4] pt-3 sm:border-0 sm:pt-0">
              {filterOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold transition ${
                    filter === item
                      ? 'bg-[#14243b] text-white'
                      : 'bg-[#f7f5f1] text-[#637084] hover:bg-[#eeeae4]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Directory Grid */}
        <section className="pb-24">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm font-medium text-[#637084]">
              <span className="font-bold text-[#14243b]">{results.length} vetted experts</span> ready
              to help
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((expert) => (
              <article
                key={expert.slug}
                className="group flex flex-col justify-between rounded-[28px] border border-[#e7e2da] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#f1b0a7] hover:shadow-xl"
              >
                <div>
                  <div className="relative h-52 overflow-hidden rounded-2xl bg-[#f5c3a8]">
                    <Image
                      src={expert.image || expert.avatarUrl || '/experts/layla.png'}
                      alt={`${expert.name} portrait`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-[#14243b] shadow-xs">
                      Vetted expert
                    </span>
                  </div>

                  <div className="mt-5 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#14243b]">{expert.name}</h2>
                      <p className="mt-0.5 text-sm text-[#637084]">{expert.role}</p>
                      <p className="mt-1 text-xs text-[#9aa2ad]">{expert.location}</p>
                    </div>
                    <span className="rounded-full bg-[#fff9e8] px-2.5 py-1 text-[11px] font-bold text-[#b17b17]">
                      {expert.rating} ★
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#637084]">{expert.bio}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(expert.tags || []).map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f7f5f1] px-2.5 py-1 text-[10px] font-bold text-[#637084]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-[#eeeae4] pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b94a1]">Format</span>
                    <span className="font-bold text-[#14243b]">
                      {expert.durationMinutes} min video session
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#14243b]">{expert.price}</span>
                    <Link
                      href={`/experts/${expert.slug}`}
                      className="rounded-full bg-[#14243b] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ef5b4c]"
                    >
                      View profile & book →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {results.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#d9d6d0] p-16 text-center text-sm text-[#637084]">
              No experts match that search yet. Try another skill or category.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
