'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CategoriesManager } from '@/components/dashboard/categories-manager'

export default function AdminCategoriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || json.user?.role !== 'admin') {
          router.push('/login?callbackUrl=/admin/categories')
          return
        }
        setLoading(false)
      })
      .catch(() => router.push('/login'))
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#0d1624] text-white">
        <p className="text-xs font-bold tracking-widest uppercase text-white/50">
          Loading Categories Console...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d1624] text-slate-100 selection:bg-[#ef5b4c]">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#121d2f]/80 backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8">
        <div className="mx-auto max-w-7xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-[#ef5b4c] text-xs font-black text-white">
              B
            </span>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Bok Bok Operations
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Categories & Taxonomy Manager
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              <ArrowLeft size={13} /> Admin Console
            </Link>
            <Link
              href="/"
              target="_blank"
              className="rounded-full border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500"
            >
              Public Site ↗
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Categories & Subcategories Management
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Manage bilingual taxonomy (Arabic & English), URL slugs, and visibility.
            </p>
          </div>
        </div>

        <CategoriesManager />
      </div>
    </main>
  )
}
