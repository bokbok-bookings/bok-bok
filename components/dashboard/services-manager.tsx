'use client'

import React, { useState, useEffect } from 'react'
import { CATEGORIES } from '@/lib/data/categories'

export interface ServiceItem {
  _id: string
  expertId: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  categorySlug?: string
  subcategorySlug?: string
  tags: string[]
  durationMinutes: number
  breakAfterMinutes: number
  pricing: {
    baseCurrency: string
    prices: Record<string, number>
  }
  isActive: boolean
  isMostBooked: boolean
  sortOrder: number
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
}

interface ServicesManagerProps {
  expertId: string
  expertName?: string
}

export function ServicesManager({ expertId, expertName }: ServicesManagerProps) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [titleEn, setTitleEn] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [descEn, setDescEn] = useState('')
  const [descAr, setDescAr] = useState('')
  const [categorySlug, setCategorySlug] = useState('marketing-growth')
  const [subcategorySlug, setSubcategorySlug] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [duration, setDuration] = useState(45)
  const [breakAfter, setBreakAfter] = useState(10)
  const [priceEGP, setPriceEGP] = useState(500)
  const [priceUSD, setPriceUSD] = useState(20)
  const [priceSAR, setPriceSAR] = useState(75)
  const [isActive, setIsActive] = useState(true)
  const [isMostBooked, setIsMostBooked] = useState(false)
  const [categoriesList, setCategoriesList] = useState<any[]>(CATEGORIES)

  const selectedCategory =
    categoriesList.find((c) => c.slug === categorySlug) || categoriesList[0] || CATEGORIES[0]

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          // Normalize to title/name
          const normalized = json.data.map((c: any) => ({
            ...c,
            title: c.name || c.title,
            subcategories: (c.subcategories || []).map((s: any) => ({
              ...s,
              title: s.name || s.title,
            })),
          }))
          setCategoriesList(normalized)
        }
      })
      .catch((err) => console.error('Failed to load categories from API:', err))
  }, [])

  const loadServices = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/dashboard/services?expertId=${expertId}`)
      const json = await res.json()
      if (json.success) {
        setServices(json.data)
      } else {
        setError(json.error || 'Failed to load services')
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [expertId])

  const openAddModal = () => {
    const firstCat = categoriesList[0] || CATEGORIES[0]
    setEditingService(null)
    setTitleEn('')
    setTitleAr('')
    setDescEn('')
    setDescAr('')
    setCategorySlug(firstCat.slug)
    setSubcategorySlug(firstCat.subcategories?.[0]?.slug || '')
    setTagsStr('')
    setDuration(45)
    setBreakAfter(10)
    setPriceEGP(500)
    setPriceUSD(20)
    setPriceSAR(75)
    setIsActive(true)
    setIsMostBooked(false)
    setModalOpen(true)
  }

  const openEditModal = (s: ServiceItem) => {
    const firstCat = categoriesList[0] || CATEGORIES[0]
    setEditingService(s)
    setTitleEn(s.title.en)
    setTitleAr(s.title.ar)
    setDescEn(s.description.en)
    setDescAr(s.description.ar)
    setCategorySlug(s.categorySlug || firstCat.slug)
    setSubcategorySlug(s.subcategorySlug || '')
    setTagsStr(s.tags?.join(', ') || '')
    setDuration(s.durationMinutes)
    setBreakAfter(s.breakAfterMinutes)
    setPriceEGP(s.pricing?.prices?.EGP ?? 500)
    setPriceUSD(s.pricing?.prices?.USD ?? 20)
    setPriceSAR(s.pricing?.prices?.SAR ?? 75)
    setIsActive(s.isActive)
    setIsMostBooked(s.isMostBooked)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleEn.trim() || !titleAr.trim()) {
      alert('Please provide titles in both English and Arabic.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        id: editingService?._id,
        title: { en: titleEn, ar: titleAr },
        description: { en: descEn, ar: descAr },
        categorySlug,
        subcategorySlug,
        tags: tagsStr
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        durationMinutes: Number(duration),
        breakAfterMinutes: Number(breakAfter),
        pricing: {
          baseCurrency: 'EGP',
          prices: {
            EGP: Number(priceEGP),
            USD: Number(priceUSD),
            SAR: Number(priceSAR),
          },
        },
        isActive,
        isMostBooked,
      }

      const method = editingService ? 'PUT' : 'POST'
      const res = await fetch(`/api/dashboard/services?expertId=${expertId}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setModalOpen(false)
        loadServices()
      } else {
        alert(json.error || 'Failed to save service')
      }
    } catch (err: any) {
      alert(err.message || 'Error saving service')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      const res = await fetch(`/api/dashboard/services?expertId=${expertId}&id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        loadServices()
      } else {
        alert(json.error || 'Failed to delete service')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting service')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#eeeae4] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#14243b]">Consultation Services</h2>
          <p className="text-xs text-[#637084] mt-1">
            {expertName ? `Managing session types for ${expertName}` : 'Define the services clients can book on your profile.'}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-full bg-[#ef5b4c] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#14243b]"
        >
          + Add New Service
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-[#8b94a1]">Loading services...</div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#dedbd5] bg-white p-12 text-center">
          <p className="text-base font-bold text-[#14243b]">No services defined yet</p>
          <p className="mt-1 text-xs text-[#637084]">Create your first consultation offering so clients can book appointments.</p>
          <button
            onClick={openAddModal}
            className="mt-5 rounded-full bg-[#14243b] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#ef5b4c]"
          >
            Create service
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <div
              key={s._id}
              className={`flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition ${
                s.isActive ? 'border-[#e7e2da]' : 'border-[#dedbd5] opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.approvalStatus === 'pending' && (
                      <span className="rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Pending Review
                      </span>
                    )}
                    {s.approvalStatus === 'rejected' && (
                      <span className="rounded-full bg-red-50 border border-red-300 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                        Rejected
                      </span>
                    )}
                    {(s.approvalStatus === 'approved' || !s.approvalStatus) && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        Approved
                      </span>
                    )}
                    {s.isMostBooked && (
                      <span className="rounded-full bg-[#ef5b4c]/10 border border-[#ef5b4c]/30 px-2.5 py-0.5 text-[10px] font-black text-[#ef5b4c] uppercase tracking-wider">
                        Most Booked
                      </span>
                    )}
                    <span className="rounded-full bg-[#f4f2ee] px-2.5 py-0.5 text-[10px] font-bold text-[#637084]">
                      {s.durationMinutes} min (+{s.breakAfterMinutes}m break)
                    </span>
                    {!s.isActive && (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-[#14243b]">{s.pricing?.prices?.EGP ?? 0} EGP</p>
                    <p className="text-[10px] text-[#8b94a1]">
                      ${s.pricing?.prices?.USD ?? 0} / {s.pricing?.prices?.SAR ?? 0} SAR
                    </p>
                  </div>
                </div>

                <h3 className="mt-4 text-base font-bold text-[#14243b] leading-snug">{s.title.en}</h3>
                <p className="text-xs font-medium text-[#8b94a1] mt-0.5" dir="rtl">
                  {s.title.ar}
                </p>

                {s.description?.en && (
                  <p className="mt-3 text-xs leading-5 text-[#637084] line-clamp-2">{s.description.en}</p>
                )}

                {s.approvalStatus === 'rejected' && s.rejectionReason && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800">
                    <strong>Rejection note:</strong> {s.rejectionReason}
                  </div>
                )}

                {s.approvalStatus === 'pending' && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-800">
                    Under review by administrators. Clients cannot book this service until approved.
                  </div>
                )}

                {s.tags && s.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span key={t} className="rounded-md bg-[#faf8f5] border border-[#eeeae4] px-2 py-0.5 text-[10px] text-[#637084]">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[#f4f2ee] pt-4">
                <span className="text-[11px] font-semibold text-[#8b94a1]">
                  Status: <strong className={s.isActive ? 'text-emerald-700' : 'text-neutral-500'}>{s.isActive ? 'Active' : 'Hidden'}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(s)}
                    className="rounded-full border border-[#dedbd5] bg-white px-3.5 py-1.5 text-xs font-bold text-[#14243b] hover:border-[#14243b]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-4">
              <h3 className="text-lg font-bold text-[#14243b]">
                {editingService ? 'Edit Consultation Service' : 'Create New Consultation Service'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="size-8 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              {/* Bilingual Titles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#14243b]">
                  Title (English) *
                  <input
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. 1-on-1 Growth Strategy"
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
                <label className="text-xs font-bold text-[#14243b]">
                  Title (Arabic) *
                  <input
                    required
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: جلسة استراتيجية النمو الفردية"
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
              </div>

              {/* Descriptions */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#14243b]">
                  Description (English)
                  <textarea
                    rows={3}
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="What will client gain from this session?"
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
                <label className="text-xs font-bold text-[#14243b]">
                  Description (Arabic)
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder="ما الذي سيستفيده العميل من هذه الجلسة؟"
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
              </div>

              {/* Taxonomy: Category & Subcategory */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#14243b]">
                  Primary Category
                  <select
                    value={categorySlug}
                    onChange={(e) => {
                      setCategorySlug(e.target.value)
                      const cat = categoriesList.find((c) => c.slug === e.target.value)
                      setSubcategorySlug(cat?.subcategories?.[0]?.slug || '')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title?.en || c.name?.en} — {c.title?.ar || c.name?.ar}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#14243b]">
                  Subcategory
                  <select
                    value={subcategorySlug}
                    onChange={(e) => setSubcategorySlug(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                  >
                    {(selectedCategory?.subcategories || []).map((sub: any) => (
                      <option key={sub.slug} value={sub.slug}>
                        {sub.title?.en || sub.name?.en} — {sub.title?.ar || sub.name?.ar}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Duration and Buffer */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#14243b]">
                  Session Duration (Minutes)
                  <input
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
                <label className="text-xs font-bold text-[#14243b]">
                  Break Buffer After (Minutes)
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={5}
                    value={breakAfter}
                    onChange={(e) => setBreakAfter(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
              </div>

              {/* Multi-Currency Pricing */}
              <div>
                <p className="text-xs font-bold text-[#14243b] mb-2">Multi-Currency Pricing</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-[11px] font-semibold text-[#637084]">
                    EGP (Base)
                    <input
                      type="number"
                      min={0}
                      value={priceEGP}
                      onChange={(e) => setPriceEGP(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#dedbd5] px-3 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-[#637084]">
                    USD
                    <input
                      type="number"
                      min={0}
                      value={priceUSD}
                      onChange={(e) => setPriceUSD(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#dedbd5] px-3 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-[#637084]">
                    SAR
                    <input
                      type="number"
                      min={0}
                      value={priceSAR}
                      onChange={(e) => setPriceSAR(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#dedbd5] px-3 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                    />
                  </label>
                </div>
              </div>

              {/* Tags */}
              <label className="block text-xs font-bold text-[#14243b]">
                Tags (Comma separated)
                <input
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="e.g. Strategy, Mentorship, Audit"
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[#14243b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 rounded accent-[#ef5b4c]"
                  />
                  Active (Visible for booking)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-[#14243b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMostBooked}
                    onChange={(e) => setIsMostBooked(e.target.checked)}
                    className="size-4 rounded accent-[#ef5b4c]"
                  />
                  Highlight as &quot;Most Booked&quot;
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-[#eeeae4] pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-[#dedbd5] px-5 py-2.5 text-xs font-bold text-[#637084] hover:border-[#14243b] hover:text-[#14243b]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#ef5b4c] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#14243b] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
