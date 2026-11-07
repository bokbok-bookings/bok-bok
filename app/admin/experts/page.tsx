'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ExpertAdminItem } from '@/components/admin/expert-verification-card'
import { RefreshCw } from 'lucide-react'

export default function AdminExpertsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [experts, setExperts] = useState<ExpertAdminItem[]>([])
  const [search, setSearch] = useState('')

  const loadExperts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/experts')
      const json = await res.json()
      if (json.success) {
        setExperts(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load experts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExperts()
  }, [loadExperts])

  const handleToggleFeatured = async (expertId: string) => {
    try {
      const res = await fetch('/api/admin/experts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, action: 'toggle_featured' }),
      })
      const json = await res.json()
      if (json.success) {
        setExperts((prev) =>
          prev.map((e) => (e._id === expertId ? { ...e, featuredHome: !e.featuredHome } : e))
        )
      } else {
        alert(json.error || 'Failed to update featured status')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating featured status')
    }
  }

  const handleExpertAction = async (expertId: string, action: 'approve' | 'suspend') => {
    if (!confirm(`Are you sure you want to ${action} this expert?`)) return
    try {
      const res = await fetch('/api/admin/experts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, action }),
      })
      const json = await res.json()
      if (json.success) {
        await loadExperts()
        router.refresh()
      } else {
        alert(json.error || 'Failed to update expert')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating expert')
    }
  }

  const filtered = experts.filter((exp) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      exp.name?.toLowerCase().includes(q) ||
      exp.slug?.toLowerCase().includes(q) ||
      exp.role?.toLowerCase().includes(q) ||
      exp.categorySlug?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeeae4] pb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Expert Directory
          </span>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
            Directory Experts ({experts.length})
          </h1>
          <p className="text-xs text-[#637084] mt-0.5">
            Manage all registered experts, feature profiles on the home page, or open their workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, slug, or role..."
            className="rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs text-[#14243b] outline-none focus:border-[#14243b] w-60"
          />
          <button
            type="button"
            onClick={() => loadExperts()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Loading Directory Experts...
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#e7e2da] bg-white overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-neutral-50/80 text-muted-foreground font-semibold">
                <th className="py-3.5 px-4 font-semibold">Expert</th>
                <th className="py-3.5 px-4 font-semibold">Headline</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Home Feature</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((exp) => (
                <tr key={exp._id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-foreground">{exp.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">/{exp.slug}</p>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">{exp.role}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    {exp.categorySlug || 'marketing'}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(exp._id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        exp.featuredHome
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-200'
                          : 'bg-neutral-100 text-muted-foreground border border-border hover:bg-neutral-200 hover:text-foreground'
                      }`}
                    >
                      <span>{exp.featuredHome ? '⭐ Featured' : '☆ Not featured'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        exp.status === 'approved' || !exp.status
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : exp.status === 'pending_review'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {exp.status || 'approved'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/experts/${exp.slug}`}
                        target="_blank"
                        className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
                      >
                        Public Page ↗
                      </Link>
                      <Link
                        href={`/dashboard?expertId=${exp._id}`}
                        target="_blank"
                        className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
                      >
                        Workspace ↗
                      </Link>
                      {exp.status !== 'suspended' ? (
                        <button
                          onClick={() => handleExpertAction(exp._id, 'suspend')}
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleExpertAction(exp._id, 'approve')}
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          Unsuspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

