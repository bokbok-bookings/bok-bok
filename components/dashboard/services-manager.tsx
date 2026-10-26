'use client'

import React, { useState, useEffect } from 'react'
import { CATEGORIES } from '@/lib/data/categories'
import {
  type BookingType,
  type ServiceKind,
  type DeliveryMode,
  type OfferingType,
  offeringTypeToModel,
  getOfferingType,
} from '@/lib/services/service-types'
import { Share2, Check } from 'lucide-react'

export interface ServiceItem {
  _id: string
  expertId: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  slug?: string
  categorySlug?: string
  subcategorySlug?: string
  tags: string[]
  bookingType?: BookingType
  serviceKind?: ServiceKind
  deliveryMode?: DeliveryMode
  location?: { city: string; address: string }
  event?: {
    date: string
    startTime: string
    endTime: string
    timezone: string
    capacity: number
    registeredCount: number
    joinUrl?: string
    platform?: string
  }
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
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyLink = (service: ServiceItem) => {
    if (typeof window === 'undefined') return
    const identifier = service.slug || service._id
    const url = `${window.location.origin}/services/${identifier}`
    navigator.clipboard.writeText(url)
    setCopiedId(service._id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  // Offering Type
  const [offeringType, setOfferingType] = useState<OfferingType>('CONSULTATION')
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('ONLINE')

  // Form states
  const [titleEn, setTitleEn] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [descEn, setDescEn] = useState('')
  const [descAr, setDescAr] = useState('')
  const [categorySlug, setCategorySlug] = useState('marketing')
  const [subcategorySlug, setSubcategorySlug] = useState('')
  const [tagsStr, setTagsStr] = useState('')

  // Appointment fields
  const [duration, setDuration] = useState(45)
  const [breakAfter, setBreakAfter] = useState(10)

  // In-person location
  const [city, setCity] = useState('Cairo')
  const [address, setAddress] = useState('')

  // Event fields (Workshop / Webinar)
  const [eventDate, setEventDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('18:00')
  const [eventEndTime, setEventEndTime] = useState('20:00')
  const [eventCapacity, setEventCapacity] = useState(25)
  const [eventJoinUrl, setEventJoinUrl] = useState('')
  const [eventPlatform, setEventPlatform] = useState('Zoom')

  // Pricing
  const [priceEGP, setPriceEGP] = useState(500)
  const [priceUSD, setPriceUSD] = useState(20)
  const [priceSAR, setPriceSAR] = useState(75)

  // Toggles
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
    setOfferingType('CONSULTATION')
    setDeliveryMode('ONLINE')
    setTitleEn('')
    setTitleAr('')
    setDescEn('')
    setDescAr('')
    setCategorySlug(firstCat.slug)
    setSubcategorySlug(firstCat.subcategories?.[0]?.slug || '')
    setTagsStr('')
    setDuration(45)
    setBreakAfter(10)
    setCity('Cairo')
    setAddress('')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 2)
    setEventDate(tomorrow.toISOString().slice(0, 10))
    setEventStartTime('18:00')
    setEventEndTime('20:00')
    setEventCapacity(25)
    setEventJoinUrl('https://zoom.us/j/123456789')
    setEventPlatform('Zoom')
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
    setOfferingType(getOfferingType(s))
    setDeliveryMode(s.deliveryMode || 'ONLINE')
    setTitleEn(s.title.en)
    setTitleAr(s.title.ar)
    setDescEn(s.description.en)
    setDescAr(s.description.ar)
    setCategorySlug(s.categorySlug || firstCat.slug)
    setSubcategorySlug(s.subcategorySlug || '')
    setTagsStr(s.tags?.join(', ') || '')
    setDuration(s.durationMinutes || 45)
    setBreakAfter(s.breakAfterMinutes || 10)
    setCity(s.location?.city || 'Cairo')
    setAddress(s.location?.address || '')
    setEventDate(s.event?.date || '')
    setEventStartTime(s.event?.startTime || '18:00')
    setEventEndTime(s.event?.endTime || '20:00')
    setEventCapacity(s.event?.capacity || 25)
    setEventJoinUrl(s.event?.joinUrl || '')
    setEventPlatform(s.event?.platform || 'Zoom')
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
      const typeConfig = offeringTypeToModel(offeringType)

      const payload: any = {
        id: editingService?._id,
        bookingType: typeConfig.bookingType,
        serviceKind: typeConfig.serviceKind,
        deliveryMode: offeringType === 'WEBINAR' ? 'ONLINE' : deliveryMode,
        title: { en: titleEn, ar: titleAr },
        description: { en: descEn, ar: descAr },
        categorySlug,
        subcategorySlug,
        tags: tagsStr
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
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

      if (typeConfig.bookingType === 'APPOINTMENT') {
        payload.durationMinutes = Number(duration)
        payload.breakAfterMinutes = Number(breakAfter)
        if (deliveryMode !== 'ONLINE') {
          payload.location = { city, address }
        }
      } else {
        payload.event = {
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          timezone: 'Africa/Cairo',
          capacity: Number(eventCapacity),
          joinUrl: eventJoinUrl || undefined,
          platform: eventPlatform || undefined,
        }
        if (deliveryMode !== 'ONLINE') {
          payload.location = { city, address }
        }
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
    if (!confirm('Are you sure you want to delete this service offering?')) return
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8E2D8] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#101F49]">Services & Offerings</h2>
          <p className="text-xs text-[#637084] mt-1">
            {expertName
              ? `Manage consultations, services, workshops, and webinars for ${expertName}`
              : 'Create and configure consultations, appointment services, workshops, or webinars.'}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-full bg-[#2855C5] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#101F49]"
        >
          + Add New Offering
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
        <div className="rounded-3xl border border-dashed border-[#E8E2D8] bg-white p-12 text-center">
          <p className="text-base font-bold text-[#101F49]">No offerings created yet</p>
          <p className="mt-1 text-xs text-[#637084]">
            Create your first offering (consultation, appointment service, workshop, or webinar).
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 rounded-full bg-[#101F49] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2855C5]"
          >
            Create Offering
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => {
            const kind = getOfferingType(s)
            return (
              <div
                key={s._id}
                className={`flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition ${
                  s.isActive ? 'border-[#E8E2D8]' : 'border-[#E8E2D8] opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[#E8EFFF] px-2.5 py-0.5 text-[10px] font-black text-[#2855C5] uppercase tracking-wider">
                        {kind.replace('_', ' ')}
                      </span>

                      {s.approvalStatus === 'pending' && (
                        <span className="rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          In Review
                        </span>
                      )}
                      {(s.approvalStatus === 'approved' || !s.approvalStatus) && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Approved
                        </span>
                      )}
                      {s.isMostBooked && (
                        <span className="rounded-full bg-[#2855C5]/10 border border-[#2855C5]/30 px-2 py-0.5 text-[10px] font-black text-[#2855C5] uppercase">
                          Popular
                        </span>
                      )}
                      <span className="rounded-full bg-[#f4f2ee] px-2 py-0.5 text-[10px] font-bold text-[#637084]">
                        {s.event ? `${s.event.date} · ${s.event.capacity} seats` : `${s.durationMinutes} min`}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-[#101F49]">{s.pricing?.prices?.EGP ?? 0} EGP</p>
                      <p className="text-[10px] text-[#8b94a1]">
                        ${s.pricing?.prices?.USD ?? 0} / {s.pricing?.prices?.SAR ?? 0} SAR
                      </p>
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-[#101F49] leading-snug">{s.title.en}</h3>
                  <p className="text-xs font-medium text-[#8b94a1] mt-0.5" dir="rtl">
                    {s.title.ar}
                  </p>

                  {s.description?.en && (
                    <p className="mt-3 text-xs leading-5 text-[#637084] line-clamp-2">{s.description.en}</p>
                  )}

                  {s.tags && s.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {s.tags.map((t) => (
                        <span key={t} className="rounded-md bg-[#FFF9EE] border border-[#E8E2D8] px-2 py-0.5 text-[10px] text-[#637084]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#f4f2ee] pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(s)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FFF9EE] border border-[#E8E2D8] px-2.5 py-1 text-[11px] font-bold text-[#101F49] hover:bg-[#101F49] hover:text-white transition"
                    >
                      {copiedId === s._id ? <Check size={12} className="text-emerald-500" /> : <Share2 size={12} />}
                      {copiedId === s._id ? 'Copied Link!' : 'Share Link'}
                    </button>
                    <a
                      href={`/services/${s.slug || s._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      View Page ↗
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(s)}
                      className="rounded-full border border-[#E8E2D8] bg-white px-3 py-1 text-xs font-bold text-[#101F49] hover:border-[#101F49]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="rounded-full px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-4">
              <h3 className="text-lg font-bold text-[#101F49]">
                {editingService ? 'Edit Offering' : 'Create New Offering'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="size-8 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#E8E2D8]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              {/* Offering Type Selector */}
              <div>
                <label className="block text-xs font-bold text-[#101F49] mb-1.5">
                  Offering Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'CONSULTATION', label: 'Consultation', hint: '1-on-1 advice' },
                    { id: 'GENERAL_SERVICE', label: 'Service', hint: 'Direct appointment' },
                    { id: 'WORKSHOP', label: 'Workshop', hint: 'Group learning' },
                    { id: 'WEBINAR', label: 'Webinar', hint: 'Live online event' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOfferingType(t.id as OfferingType)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        offeringType === t.id
                          ? 'border-[#2855C5] bg-[#E8EFFF] text-[#2855C5]'
                          : 'border-[#E8E2D8] bg-white text-[#101F49] hover:border-[#101F49]'
                      }`}
                    >
                      <span className="block text-xs font-bold">{t.label}</span>
                      <span className="block text-[10px] text-[#8b94a1] mt-0.5">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Mode (for all except Webinars which are strictly ONLINE) */}
              {offeringType !== 'WEBINAR' && (
                <div>
                  <label className="block text-xs font-bold text-[#101F49] mb-1.5">
                    Delivery Mode
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'ONLINE', label: '🌐 Online (Video call / remote)' },
                      { id: 'IN_PERSON', label: '📍 In-Person (Studio / client location)' },
                      { id: 'HYBRID', label: '⚡ Hybrid' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setDeliveryMode(m.id as DeliveryMode)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          deliveryMode === m.id
                            ? 'border-[#101F49] bg-[#101F49] text-white'
                            : 'border-[#E8E2D8] bg-white text-[#637084] hover:text-[#101F49]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* In-Person Location if needed */}
              {deliveryMode !== 'ONLINE' && offeringType !== 'WEBINAR' && (
                <div className="grid gap-3 sm:grid-cols-2 rounded-2xl bg-[#FFF9EE] p-3 border border-[#E8E2D8]">
                  <label className="text-xs font-bold text-[#101F49]">
                    City
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Cairo"
                      className="mt-1 w-full rounded-xl border border-[#E8E2D8] px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#101F49]">
                    Studio / Street Address
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Maadi Degla, St 214"
                      className="mt-1 w-full rounded-xl border border-[#E8E2D8] px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </label>
                </div>
              )}

              {/* Bilingual Titles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#101F49]">
                  Title (English) *
                  <input
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. 1-on-1 Growth Strategy"
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
                <label className="text-xs font-bold text-[#101F49]">
                  Title (Arabic) *
                  <input
                    required
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: جلسة استراتيجية النمو الفردية"
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              {/* Descriptions */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#101F49]">
                  Description (English)
                  <textarea
                    rows={3}
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="What will client gain or experience?"
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
                <label className="text-xs font-bold text-[#101F49]">
                  Description (Arabic)
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder="ما الذي سيستفيده العميل من هذا العرض؟"
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              {/* Taxonomy: Category & Subcategory */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#101F49]">
                  Primary Category
                  <select
                    value={categorySlug}
                    onChange={(e) => {
                      setCategorySlug(e.target.value)
                      const cat = categoriesList.find((c) => c.slug === e.target.value)
                      setSubcategorySlug(cat?.subcategories?.[0]?.slug || '')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title?.en || c.name?.en} — {c.title?.ar || c.name?.ar}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#101F49]">
                  Subcategory
                  <select
                    value={subcategorySlug}
                    onChange={(e) => setSubcategorySlug(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                  >
                    {(selectedCategory?.subcategories || []).map((sub: any) => (
                      <option key={sub.slug} value={sub.slug}>
                        {sub.title?.en || sub.name?.en} — {sub.title?.ar || sub.name?.ar}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* CONDITIONAL: Appointment vs Workshop/Webinar Fields */}
              {(offeringType === 'CONSULTATION' || offeringType === 'GENERAL_SERVICE') ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#101F49]">
                    Appointment Duration (Minutes)
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </label>
                  <label className="text-xs font-bold text-[#101F49]">
                    Break Buffer After (Minutes)
                    <input
                      type="number"
                      min={0}
                      max={120}
                      step={5}
                      value={breakAfter}
                      onChange={(e) => setBreakAfter(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#FFF9EE] p-4 border border-[#E8E2D8] space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#2855C5]">
                    Event Schedule & Capacity
                  </p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="text-xs font-bold text-[#101F49] sm:col-span-2">
                      Event Date
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                    <label className="text-xs font-bold text-[#101F49]">
                      Start (HH:mm)
                      <input
                        type="time"
                        required
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                    <label className="text-xs font-bold text-[#101F49]">
                      End (HH:mm)
                      <input
                        type="time"
                        required
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-bold text-[#101F49]">
                      Capacity (Max Seats)
                      <input
                        type="number"
                        min={1}
                        value={eventCapacity}
                        onChange={(e) => setEventCapacity(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                    <label className="text-xs font-bold text-[#101F49] sm:col-span-2">
                      Online Joining URL {offeringType === 'WEBINAR' && '*'}
                      <input
                        type="url"
                        required={offeringType === 'WEBINAR'}
                        value={eventJoinUrl}
                        onChange={(e) => setEventJoinUrl(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Multi-Currency Pricing */}
              <div>
                <p className="text-xs font-bold text-[#101F49] mb-2">Multi-Currency Pricing</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-[11px] font-semibold text-[#637084]">
                    EGP (Base)
                    <input
                      type="number"
                      min={0}
                      value={priceEGP}
                      onChange={(e) => setPriceEGP(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#E8E2D8] px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-[#637084]">
                    USD
                    <input
                      type="number"
                      min={0}
                      value={priceUSD}
                      onChange={(e) => setPriceUSD(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#E8E2D8] px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-[#637084]">
                    SAR
                    <input
                      type="number"
                      min={0}
                      value={priceSAR}
                      onChange={(e) => setPriceSAR(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#E8E2D8] px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </label>
                </div>
              </div>

              {/* Tags */}
              <label className="block text-xs font-bold text-[#101F49]">
                Tags (Comma separated)
                <input
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="e.g. photography, portrait, bridal, strategy"
                  className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                />
              </label>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[#101F49] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 rounded accent-[#2855C5]"
                  />
                  Active (Visible for public booking)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-[#101F49] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMostBooked}
                    onChange={(e) => setIsMostBooked(e.target.checked)}
                    className="size-4 rounded accent-[#2855C5]"
                  />
                  Highlight as &quot;Popular&quot;
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-[#E8E2D8] pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-[#E8E2D8] px-5 py-2.5 text-xs font-bold text-[#637084] hover:border-[#101F49] hover:text-[#101F49]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#2855C5] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#101F49] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingService ? 'Update Offering' : 'Create Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

