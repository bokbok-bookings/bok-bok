'use client'

import React, { useState, useEffect } from 'react'
import {
  CATEGORIES,
  getCategoryLabel,
  getSubcategoryLabel,
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
} from '@/lib/data/categories'
import {
  type BookingType,
  type ServiceKind,
  type DeliveryMode,
  type OfferingType,
  offeringTypeToModel,
  getOfferingType,
} from '@/lib/services/service-types'
import { Share2, Check, ShieldAlert, Users, Image as ImageIcon, Trash2, MapPin, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { CloudinaryUploadWidget } from '@/components/ui/cloudinary-upload-widget'
import { useLanguage } from '@/lib/i18n/language-context'

export interface ServiceItem {
  _id: string
  expertId: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  thumbnailUrl?: string
  intendedAudience?: { en: string; ar: string }
  adultsOnly?: boolean
  minimumAge?: number
  slug?: string
  categorySlug?: string
  subcategorySlug?: string
  tags: string[]
  whatYouWillGet?: Array<{ en: string; ar: string } | string>
  intakeQuestions?: Array<{ id: string; question: string; type: 'string' | 'pdf' | 'image'; required?: boolean }>
  bookingType?: BookingType
  serviceKind?: ServiceKind
  deliveryMode?: DeliveryMode
  location?: {
    city: string
    address: string
    addressDescription?: string
    googleMapsUrl?: string
  }
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
  minNoticeHours?: number
  pricing: {
    baseCurrency: string
    prices: Record<string, number>
  }
  isActive: boolean
  isMostBooked: boolean
  sortOrder: number
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  isStructuredVocationalProgramme?: boolean
  requiresLicensingReview?: boolean
  licensingReviewStatus?:
  | 'not_required'
  | 'pending_licensing_review'
  | 'licensing_approved'
  | 'licensing_rejected'
  licensingReviewReason?: string
  adminReviewNote?: string
}

interface ServicesManagerProps {
  expertId: string
  expertName?: string
}

export function ServicesManager({ expertId, expertName }: ServicesManagerProps) {
  const { isAr, dir } = useLanguage()
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

  // Offering Type (MVP: CONSULTATION, WORKSHOP, WEBINAR only)
  const [offeringType, setOfferingType] = useState<OfferingType>('CONSULTATION')
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('ONLINE')

  // Form states
  const [titleEn, setTitleEn] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [descEn, setDescEn] = useState('')
  const [descAr, setDescAr] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [whatYouWillGet, setWhatYouWillGet] = useState<Array<{ en: string; ar: string }>>([])
  const [newTakeawayEn, setNewTakeawayEn] = useState('')
  const [newTakeawayAr, setNewTakeawayAr] = useState('')
  const [intakeQuestions, setIntakeQuestions] = useState<
    Array<{ id: string; question: string; type: 'string' | 'pdf' | 'image'; required?: boolean }>
  >([])
  const [audienceEn, setAudienceEn] = useState('Professionals, founders, and learners')
  const [audienceAr, setAudienceAr] = useState('المهنيون ورواد الأعمال والمتعلمون')
  const [adultsOnly, setAdultsOnly] = useState(true)
  const [isStructuredVocationalProgramme, setIsStructuredVocationalProgramme] = useState(false)
  const [categorySlug, setCategorySlug] = useState('marketing')
  const [subcategorySlug, setSubcategorySlug] = useState('marketing-strategy')
  const [tagsStr, setTagsStr] = useState('')

  // Appointment fields
  const [duration, setDuration] = useState(45)
  const [breakAfter, setBreakAfter] = useState(10)
  const [minNoticeHours, setMinNoticeHours] = useState(24)

  // In-person location
  const [city, setCity] = useState('Cairo')
  const [address, setAddress] = useState('')
  const [addressDescription, setAddressDescription] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')

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

  const [draggedTakeawayIndex, setDraggedTakeawayIndex] = useState<number | null>(null)

  const moveTakeaway = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= whatYouWillGet.length) return
    const updated = [...whatYouWillGet]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setWhatYouWillGet(updated)
  }

  const handleDragStartTakeaway = (index: number) => {
    setDraggedTakeawayIndex(index)
  }

  const handleDropTakeaway = (index: number) => {
    if (draggedTakeawayIndex === null || draggedTakeawayIndex === index) return
    const updated = [...whatYouWillGet]
    const [moved] = updated.splice(draggedTakeawayIndex, 1)
    updated.splice(index, 0, moved)
    setWhatYouWillGet(updated)
    setDraggedTakeawayIndex(null)
  }

  const addTakeaway = () => {
    const en = newTakeawayEn.trim()
    const ar = newTakeawayAr.trim()
    if (!en && !ar) return
    setWhatYouWillGet([...whatYouWillGet, { en: en || ar, ar: ar || en }])
    setNewTakeawayEn('')
    setNewTakeawayAr('')
  }

  const moveIntakeQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= intakeQuestions.length) return
    const updated = [...intakeQuestions]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setIntakeQuestions(updated)
  }

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
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('new') === '1') {
        openAddModal()
      }
    }
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
    setThumbnailUrl('')
    setWhatYouWillGet([])
    setNewTakeawayEn('')
    setNewTakeawayAr('')
    setIntakeQuestions([])
    setAudienceEn('Professionals, founders, and learners')
    setAudienceAr('المهنيون ورواد الأعمال والمتعلمون')
    setAdultsOnly(true)
    setIsStructuredVocationalProgramme(false)
    setCategorySlug(firstCat.slug)
    setSubcategorySlug(firstCat.subcategories?.[0]?.slug || '')
    setTagsStr('')
    setDuration(45)
    setBreakAfter(10)
    setMinNoticeHours(24)
    setCity('Cairo')
    setAddress('')
    setAddressDescription('')
    setGoogleMapsUrl('')
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
    const rawType = getOfferingType(s)
    // Professional Services (GENERAL_SERVICE) are outside the MVP; map to CONSULTATION when editing
    const safeType: OfferingType = rawType === 'GENERAL_SERVICE' ? 'CONSULTATION' : rawType
    const validCatSlug = isAllowedMvpCategory(s.categorySlug) ? s.categorySlug! : firstCat.slug
    const catObj = categoriesList.find((c) => c.slug === validCatSlug) || firstCat
    const validSubSlug = isAllowedMvpSubcategory(validCatSlug, s.subcategorySlug)
      ? s.subcategorySlug!
      : catObj.subcategories?.[0]?.slug || ''

    setEditingService(s)
    setOfferingType(safeType)
    setDeliveryMode(s.deliveryMode || 'ONLINE')
    setTitleEn(s.title.en)
    setTitleAr(s.title.ar)
    setDescEn(s.description.en)
    setDescAr(s.description.ar)
    setThumbnailUrl(s.thumbnailUrl || '')
    const normalizedTakeaways: Array<{ en: string; ar: string }> = Array.isArray(s.whatYouWillGet)
      ? s.whatYouWillGet
        .map((item: any) => {
          if (typeof item === 'string') return { en: item, ar: item }
          return { en: item?.en || item?.ar || '', ar: item?.ar || item?.en || '' }
        })
        .filter((t) => Boolean(t.en || t.ar))
      : []
    setWhatYouWillGet(normalizedTakeaways)
    setNewTakeawayEn('')
    setNewTakeawayAr('')
    setIntakeQuestions(Array.isArray(s.intakeQuestions) ? [...s.intakeQuestions] : [])
    setAudienceEn(s.intendedAudience?.en || 'Professionals, founders, and learners')
    setAudienceAr(s.intendedAudience?.ar || 'المهنيون ورواد الأعمال والمتعلمون')
    setAdultsOnly(s.adultsOnly !== false)
    setIsStructuredVocationalProgramme(Boolean(s.isStructuredVocationalProgramme || s.requiresLicensingReview))
    setCategorySlug(validCatSlug)
    setSubcategorySlug(validSubSlug)
    setTagsStr(s.tags?.join(', ') || '')
    setDuration(s.durationMinutes || 45)
    setBreakAfter(s.breakAfterMinutes || 10)
    setMinNoticeHours(s.minNoticeHours !== undefined ? Number(s.minNoticeHours) : 24)
    setCity(s.location?.city || 'Cairo')
    setAddress(s.location?.address || '')
    setAddressDescription(s.location?.addressDescription || '')
    setGoogleMapsUrl(s.location?.googleMapsUrl || '')
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
    if (!descEn.trim() || !descAr.trim()) {
      alert('Please provide a clear description of the actual activity in both English and Arabic.')
      return
    }
    if (!audienceEn.trim() || !audienceAr.trim()) {
      alert('Please specify the intended audience in both English and Arabic.')
      return
    }

    setSaving(true)
    try {
      const typeConfig = offeringTypeToModel(offeringType)

      const payload: any = {
        id: editingService?._id,
        bookingType: typeConfig.bookingType,
        serviceKind: typeConfig.serviceKind,
        deliveryMode,
        title: { en: titleEn, ar: titleAr },
        description: { en: descEn, ar: descAr },
        thumbnailUrl: thumbnailUrl.trim() || '',
        intendedAudience: { en: audienceEn, ar: audienceAr },
        adultsOnly: true,
        minimumAge: 18,
        isStructuredVocationalProgramme,
        whatYouWillGet: whatYouWillGet.filter((w) => Boolean(w.en.trim() || w.ar.trim())),
        intakeQuestions: intakeQuestions.filter((q) => Boolean(q.question.trim())),
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
        minNoticeHours: Number(minNoticeHours),
      }

      if (deliveryMode !== 'ONLINE') {
        payload.location = {
          city: city.trim(),
          address: address.trim(),
          ...(addressDescription.trim() ? { addressDescription: addressDescription.trim() } : {}),
          ...(googleMapsUrl.trim() ? { googleMapsUrl: googleMapsUrl.trim() } : {}),
        }
      }

      if (typeConfig.bookingType === 'APPOINTMENT') {
        payload.durationMinutes = Number(duration)
        payload.breakAfterMinutes = Number(breakAfter)
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
    if (!confirm('Are you sure you want to delete this offering?')) return
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
          <h2 className="text-2xl font-bold tracking-tight text-[#101F49]">Consultations, Workshops & Webinars</h2>
          <p className="text-xs text-[#637084] mt-1">
            {expertName
              ? `Manage consultations, workshops, and webinars for ${expertName}`
              : 'Create and configure 1-on-1 consultations, interactive workshops, or live webinars (Admin review required before publishing).'}
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
        <div className="p-12 text-center text-xs font-semibold text-[#8b94a1]">Loading offerings...</div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#E8E2D8] bg-white p-12 text-center">
          <p className="text-base font-bold text-[#101F49]">No offerings created yet</p>
          <p className="mt-1 text-xs text-[#637084]">
            Create your first consultation, workshop, or webinar within the approved taxonomy.
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
            const catLabel = getCategoryLabel(s.categorySlug, 'en')
            const subLabel = getSubcategoryLabel(s.categorySlug, s.subcategorySlug, 'en')
            const isValidTaxonomy =
              isAllowedMvpCategory(s.categorySlug) &&
              isAllowedMvpSubcategory(s.categorySlug, s.subcategorySlug)
            return (
              <div
                key={s._id}
                className={`group flex flex-col justify-between overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md ${s.isActive && s.approvalStatus === 'approved'
                    ? 'border-[#E8E2D8]'
                    : 'border-amber-300/70 bg-[#FFFDF9]'
                  }`}
              >
                <div>
                  {/* Service Thumbnail Banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#101F49] via-[#1b3374] to-[#2855C5]">
                    {s.thumbnailUrl ? (
                      <img
                        src={s.thumbnailUrl}
                        alt={s.title.en}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-white/90">
                        <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/15 mb-2">
                          <ImageIcon size={22} className="text-[#F8C15C]" />
                        </div>
                        <span className="text-[11px] font-bold tracking-wider uppercase text-white/80">
                          {catLabel}
                        </span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                    {/* Top-left floating badges */}
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
                      <span className="rounded-full bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-black text-[#2855C5] uppercase tracking-wider shadow-xs">
                        {kind.replace('_', ' ')}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {s.approvalStatus === 'pending' && (
                          <span className="rounded-full bg-amber-50/95 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 shadow-xs">
                            Pending Review
                          </span>
                        )}
                        {s.approvalStatus === 'approved' && (
                          <span className="rounded-full bg-emerald-50/95 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 shadow-xs">
                            Published
                          </span>
                        )}
                        {s.approvalStatus === 'rejected' && (
                          <span className="rounded-full bg-rose-50/95 border border-rose-300 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 shadow-xs">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom overlay info on thumbnail */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                      <span className="rounded-full bg-black/55 backdrop-blur-xs border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
                        {s.event ? `${s.event.date} · ${s.event.capacity} seats` : `${s.durationMinutes} min`}
                      </span>
                      <div className="rounded-2xl bg-white/95 backdrop-blur-xs px-3 py-1 text-right shadow-sm">
                        <p className="text-sm font-black text-[#101F49] leading-tight">{s.pricing?.prices?.EGP ?? 0} EGP</p>
                        <p className="text-[9px] font-semibold text-[#637084]">
                          ${s.pricing?.prices?.USD ?? 0} / {s.pricing?.prices?.SAR ?? 0} SAR
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 pb-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-[#637084]">
                      <span className="rounded-md bg-[#f4f2ee] px-2 py-0.5">{catLabel}</span>
                      {subLabel && (
                        <span className="rounded-md bg-[#FFF9EE] border border-[#E8E2D8] px-2 py-0.5 text-[#101F49]">
                          {subLabel}
                        </span>
                      )}
                      <span className="rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-sky-800 font-bold">
                        {s.minNoticeHours === 0
                          ? '⚡ Same Day'
                          : (s.minNoticeHours === 24 || s.minNoticeHours === undefined)
                            ? '🕒 24h Notice'
                            : `🕒 ${Math.round(s.minNoticeHours / 24)}d Notice`}
                      </span>
                      {s.requiresLicensingReview && (
                        <span className="rounded-full bg-purple-50 border border-purple-300 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                          {s.licensingReviewStatus === 'licensing_approved'
                            ? 'Licensing Cleared'
                            : s.licensingReviewStatus === 'licensing_rejected'
                              ? 'Licensing Rejected'
                              : 'Separate Licensing Review Required'}
                        </span>
                      )}
                      {!isValidTaxonomy && (
                        <span className="rounded-full bg-red-50 border border-red-300 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          Needs Category Mapping
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-base font-bold text-[#101F49] leading-snug">{s.title.en}</h3>
                    <p className="text-xs font-medium text-[#8b94a1] mt-0.5" dir="rtl">
                      {s.title.ar}
                    </p>

                    {s.description?.en && (
                      <p className="mt-2.5 text-xs leading-5 text-[#637084] line-clamp-2">{s.description.en}</p>
                    )}

                    {s.intendedAudience?.en && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-[#637084]">
                        <Users size={12} className="text-[#2855C5]" />
                        <span>
                          Audience: <strong>{s.intendedAudience.en}</strong>
                        </span>
                      </p>
                    )}

                    {s.adminReviewNote && (
                      <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900">
                        <strong>Admin Review Note:</strong> {s.adminReviewNote}
                      </p>
                    )}

                    {s.rejectionReason && (
                      <p className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-800">
                        <strong>Rejection Reason:</strong> {s.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 sm:p-6 pt-4 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f4f2ee]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(s)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FFF9EE] border border-[#E8E2D8] px-2.5 py-1 text-[11px] font-bold text-[#101F49] hover:bg-[#101F49] hover:text-white transition"
                    >
                      {copiedId === s._id ? <Check size={12} className="text-emerald-500" /> : <Share2 size={12} />}
                      {copiedId === s._id ? 'Copied Link!' : 'Share Link'}
                    </button>
                    {s.isActive && s.approvalStatus === 'approved' && (
                      <a
                        href={`/services/${s.slug || s._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                      >
                        View Page ↗
                      </a>
                    )}
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
              <div>
                <h3 className="text-lg font-bold text-[#101F49]">
                  {editingService
                    ? isAr ? 'تعديل الجلسة / العرض' : 'Edit Offering'
                    : isAr ? 'إنشاء جلسة / عرض جديد' : 'Create New Offering'}
                </h3>
                <p className="text-[11px] text-[#637084]">
                  {isAr ? 'تخضع كافة العروض لمراجعة الإدارة قبل النشر.' : 'All offers require admin review before publication.'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="size-8 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#E8E2D8]"
              >
                ✕
              </button>
            </div>

            {/* Platform Scope & Exclusions Notice */}
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-[11px] text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <ShieldAlert size={14} className="shrink-0" />
                Platform Offer Guidelines:
              </p>
              <p>
                • <strong>Allowed Formats:</strong> Consultations, Workshops, and Webinars only.
              </p>
              <p>
                • <strong>Excluded Across All Categories:</strong> Medical/nutrition/fitness plans, mental health/therapy, legal/tax/auditing/investment advice, engineering/architectural approvals, recruitment/visa/job or income guarantees, travel booking/guiding, penetration testing/live client data access, school tutoring/exam prep/ghostwriting/children&apos;s services, unverified accreditation claims, and hazardous activities.
              </p>
              <p>
                • Calling an offer a &ldquo;consultation,&rdquo; &ldquo;workshop,&rdquo; or &ldquo;webinar&rdquo; does not exempt it from licensing requirements.
              </p>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {/* Offering Type Selector */}
              <div>
                <label className="block text-xs font-bold text-[#101F49] mb-1.5">
                  Offering Format *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CONSULTATION', label: 'Consultation / استشارة', hint: '1-on-1 advisory or review' },
                    { id: 'WORKSHOP', label: 'Workshop / ورشة عمل', hint: 'Interactive group cohort' },
                    { id: 'WEBINAR', label: 'Webinar / ندوة مباشرة', hint: 'Live online masterclass' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOfferingType(t.id as OfferingType)}
                      className={`rounded-2xl border p-3 text-left transition ${offeringType === t.id
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

              {/* Delivery Mode (Available for Consultations, Workshops, and Webinars) */}
              <div>
                <label className="block text-xs font-bold text-[#101F49] mb-1.5">
                  {isAr ? 'طريقة تقديم الجلسة *' : 'Delivery Mode *'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'ONLINE', label: isAr ? '🌐 عبر الإنترنت (مكالمة فيديو / عن بُعد)' : '🌐 Online (Video call / remote)' },
                    { id: 'IN_PERSON', label: isAr ? '📍 حضورياً في مقر/عنوان' : '📍 In-Person' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDeliveryMode(m.id as DeliveryMode)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${deliveryMode === m.id
                          ? 'border-[#101F49] bg-[#101F49] text-white'
                          : 'border-[#E8E2D8] bg-white text-[#637084] hover:text-[#101F49]'
                        }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* In-Person Location (Available whenever deliveryMode !== 'ONLINE') */}
              {deliveryMode !== 'ONLINE' && (
                <div className="rounded-2xl bg-[#FFF9EE] p-4 border border-[#E8E2D8] space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#101F49]">
                    <MapPin size={15} className="text-[#2855C5]" />
                    <span>{isAr ? 'بيانات الموقع والحضور الشخصي' : 'In-Person Venue & Location Details'}</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-[#101F49]">
                      {isAr ? 'المدينة *' : 'City *'}
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={isAr ? 'مثال: القاهرة، الجيزة، دبي...' : 'e.g. Cairo, Giza, Dubai...'}
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                    <label className="text-xs font-bold text-[#101F49]">
                      {isAr ? 'العنوان / اسم المكان أو الشارع *' : 'Venue / Street Address *'}
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={isAr ? 'مثال: المعادي دجلة، شارع 214، مبنى تك هاب' : 'e.g. Maadi Degla, St 214, TechHub building'}
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-[#101F49]">
                      {isAr ? 'تفاصيل العنوان وإرشادات الوصول' : 'Address Description & Directions'}
                      <input
                        value={addressDescription}
                        onChange={(e) => setAddressDescription(e.target.value)}
                        placeholder={isAr ? 'مثال: الدور الثالث، شقة 5، بجوار محطة المترو' : 'e.g. 3rd floor, suite 5, next to metro station'}
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                    <label className="text-xs font-bold text-[#101F49]">
                      {isAr ? 'رابط خرائط جوجل (Google Maps Link)' : 'Google Maps Link (URL)'}
                      <input
                        type="url"
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                        className="mt-1 w-full rounded-xl border border-[#E8E2D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#2855C5]"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Taxonomy: Approved Category & Subcategory (No Free-Text) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#101F49]">
                  Approved Category *
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
                  Approved Subcategory *
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

              {/* Bilingual Titles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#101F49]">
                  Title (English) *
                  <input
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. 1-on-1 Marketing Strategy Review"
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
                    placeholder="مثال: مراجعة فردية لاستراتيجية التسويق"
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              {/* Service Thumbnail Upload */}
              <div className="rounded-2xl border border-[#E8E2D8] bg-[#FFFDF9] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="block text-xs font-bold text-[#101F49]">
                      Service Card Thumbnail
                    </label>
                    <p className="text-[11px] text-[#637084] mt-0.5">
                      Upload a 16:9 cover image (recommended 1280×720px) to stand out on service cards.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CloudinaryUploadWidget
                      onSuccess={(res) => setThumbnailUrl(res.secureUrl || res.url)}
                      folder="bokbok/service_thumbnails"
                      fallbackType="service_thumbnail"
                      cropping={true}
                      croppingAspectRatio={16 / 9}
                      buttonText={thumbnailUrl ? 'Change Thumbnail' : 'Upload Thumbnail'}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2855C5] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#101F49]"
                    />
                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('')}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {thumbnailUrl && (
                  <div className="mt-3 relative h-40 w-full sm:w-72 overflow-hidden rounded-2xl border border-[#E8E2D8] bg-[#101F49]">
                    <img
                      src={thumbnailUrl}
                      alt="Service thumbnail preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Clear Activity Descriptions (Required in EN & AR) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#101F49]">
                  Clear Description of Actual Activity (English) *
                  <textarea
                    required
                    rows={3}
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="Describe the exact scope, format, and activity of this session (min 20 characters)..."
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
                <label className="text-xs font-bold text-[#101F49]">
                  Clear Description of Actual Activity (Arabic) *
                  <textarea
                    required
                    rows={3}
                    dir="rtl"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder="اشرح بوضوح النشاط الفعلي ونطاق الجلسة وما سيتم تقديمه..."
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              {/* Intended Audience (Required in EN & AR) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#101F49]">
                  Intended Audience (English) *
                  <input
                    required
                    value={audienceEn}
                    onChange={(e) => setAudienceEn(e.target.value)}
                    placeholder="e.g. Startup founders and marketing managers"
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
                <label className="text-xs font-bold text-[#101F49]">
                  Intended Audience (Arabic) *
                  <input
                    required
                    dir="rtl"
                    value={audienceAr}
                    onChange={(e) => setAudienceAr(e.target.value)}
                    placeholder="مثال: رواد الأعمال ومديرو التسويق"
                    className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              {/* What You Will Get / Key Deliverables & Outcomes (Bilingual & Arrangable) */}
              <div className="rounded-2xl border border-[#E8E2D8] bg-[#FFFDF9] p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#101F49]">
                    {isAr ? 'ماذا ستستفيد / تجد في هذه الجلسة (المخرجات باللغتين)' : 'What You Will Get / Outcomes (Bilingual)'}
                  </label>
                  <p className="text-[11px] text-[#637084] mt-0.5">
                    {isAr
                      ? 'أضف نقاطاً بالمخرجات والأدوات والمهارات باللغتين الإنجليزية والعربية (يمكنك إعادة ترتيب النقاط بالأسهم أو السحب):'
                      : 'Add bullet points highlighting tangible takeaways, documents, or skills in both English and Arabic (reorderable via arrows or dragging):'}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="block text-[10px] font-bold text-[#637084] mb-1">
                      {isAr ? 'النقطة بالإنجليزية' : 'Point (English)'}
                    </span>
                    <input
                      type="text"
                      value={newTakeawayEn}
                      onChange={(e) => setNewTakeawayEn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTakeaway()
                        }
                      }}
                      placeholder="e.g. 30-Day execution roadmap, customized review checklist..."
                      className="w-full rounded-xl border border-[#E8E2D8] bg-white px-3.5 py-2 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#637084] mb-1">
                      {isAr ? 'النقطة بالعربية' : 'Point (Arabic)'}
                    </span>
                    <input
                      type="text"
                      dir="rtl"
                      value={newTakeawayAr}
                      onChange={(e) => setNewTakeawayAr(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTakeaway()
                        }
                      }}
                      placeholder="مثال: خطة عمل تنفيذية لـ 30 يوماً، قائمة تدقيق مخصصة..."
                      className="w-full rounded-xl border border-[#E8E2D8] bg-white px-3.5 py-2 text-xs outline-none focus:border-[#2855C5]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addTakeaway}
                    disabled={!newTakeawayEn.trim() && !newTakeawayAr.trim()}
                    className="rounded-xl bg-[#2855C5] px-4 py-2 text-xs font-bold text-white hover:bg-[#101F49] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isAr ? '+ إضافة نقطة' : '+ Add Point'}
                  </button>
                </div>

                {whatYouWillGet.length > 0 && (
                  <ul className="space-y-2 pt-1">
                    {whatYouWillGet.map((item, idx) => (
                      <li
                        key={idx}
                        draggable
                        onDragStart={() => handleDragStartTakeaway(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropTakeaway(idx)}
                        className={`flex items-center justify-between gap-2.5 rounded-xl border border-[#E8E2D8] bg-white px-3 py-2.5 text-xs text-[#101F49] shadow-2xs transition ${
                          draggedTakeawayIndex === idx ? 'opacity-40 border-dashed border-[#2855C5]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className="text-[#8b94a1] hover:text-[#101F49] cursor-grab active:cursor-grabbing shrink-0"
                            title={isAr ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
                          >
                            <GripVertical size={14} />
                          </span>
                          <span className="flex size-5 items-center justify-center rounded-full bg-[#E8EFFF] text-[10px] font-bold text-[#2855C5] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-start gap-1.5">
                              <span className="text-[9px] uppercase font-bold text-[#2855C5] bg-[#E8EFFF] px-1 py-0.2 rounded shrink-0 mt-0.5">
                                EN
                              </span>
                              <span className="break-words font-medium text-[#101F49]">{item.en || item.ar}</span>
                            </div>
                            <div className="flex items-start gap-1.5" dir="rtl">
                              <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded shrink-0 mt-0.5">
                                AR
                              </span>
                              <span className="break-words font-medium text-[#3b4554]">{item.ar || item.en}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveTakeaway(idx, 'up')}
                            className="size-6 rounded-lg border border-[#E8E2D8] bg-[#faf8f5] flex items-center justify-center text-[#101F49] hover:bg-[#E8E2D8] disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title={isAr ? 'تحريك للأعلى' : 'Move up'}
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === whatYouWillGet.length - 1}
                            onClick={() => moveTakeaway(idx, 'down')}
                            className="size-6 rounded-lg border border-[#E8E2D8] bg-[#faf8f5] flex items-center justify-center text-[#101F49] hover:bg-[#E8E2D8] disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title={isAr ? 'تحريك للأسفل' : 'Move down'}
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhatYouWillGet(whatYouWillGet.filter((_, i) => i !== idx))}
                            className="size-6 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-xs font-bold ms-1 transition"
                            title={isAr ? 'حذف النقطة' : 'Remove item'}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* CONDITIONAL: Appointment vs Workshop/Webinar Fields */}
              {offeringType === 'CONSULTATION' ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-[#101F49]">
                      Consultation Duration (Minutes)
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

                  {/* Minimum Booking Notice Condition */}
                  <div className="rounded-2xl border border-[#E8E2D8] bg-[#FFFDF9] p-4 space-y-2.5">
                    <label className="block text-xs font-bold text-[#101F49]">
                      {isAr ? 'مهلة الحجز المسبق المطلوبة *' : 'Minimum Booking Notice *'}
                    </label>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-950 space-y-1.5 leading-relaxed">
                      {isAr ? (
                        <>
                          <p>
                            <strong>🔒 إيقاف الحجز التلقائي:</strong> سيتم قفل وإخفاء أي مواعيد تقع ضمن هذه المهلة الزمنية من جدول الحجز؛ فلن يتمكن أي عميل من طلب موعد يبدأ خلال هذه المدة (مثال: عند اختيار 24 ساعة، لا يمكن للعميل حجز موعد يبدأ قبل مرور 24 ساعة من الآن).
                          </p>
                          <p>
                            <strong>💡 الاستخدام الموصى به:</strong> يفضل وموصى به بشدة عند حاجتك لوقت مسبق لدراسة ملفات العميل، أو مراجعة أعماله ومواده، أو إرسال استبيان/أسئلة يحتاج العميل وقتاً للإجابة عليها قبل موعد الجلسة.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            <strong>🔒 Automatic Slot Locking:</strong> Any time slots falling within this advance notice window will be automatically locked and hidden on the booking calendar; clients cannot book any slot starting sooner than this timeframe (e.g. if set to 24 hours, clients cannot book any slot starting less than 24 hours from now).
                          </p>
                          <p>
                            <strong>💡 Recommended Use:</strong> Strongly preferred when you require advance preparation time to study client files, review their materials/portfolio, or have the client complete an intake survey before the call.
                          </p>
                        </>
                      )}
                    </div>
                    <select
                      value={minNoticeHours}
                      onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E8E2D8] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#101F49] outline-none focus:border-[#2855C5]"
                    >
                      {isAr ? (
                        <>
                          <option value={0}>نفس اليوم (حجز فوري متاح)</option>
                          <option value={24}>اليوم السابق (قبل 24 ساعة) — الافتراضي (موصى به)</option>
                          <option value={48}>قبل يومين (48 ساعة)</option>
                          <option value={72}>قبل 3 أيام (72 ساعة)</option>
                          <option value={96}>قبل 4 أيام (96 ساعة)</option>
                          <option value={120}>قبل 5 أيام (120 ساعة)</option>
                          <option value={144}>قبل 6 أيام (144 ساعة)</option>
                          <option value={168}>قبل 7 أيام (أسبوع كامل)</option>
                          <option value={192}>قبل 8 أيام (192 ساعة)</option>
                          <option value={216}>قبل 9 أيام (216 ساعة)</option>
                          <option value={240}>قبل 10 أيام (240 ساعة)</option>
                          <option value={336}>قبل 14 يوماً (أسبوعان / 336 ساعة)</option>
                          <option value={504}>قبل 21 يوماً (3 أسابيع / 504 ساعات)</option>
                          <option value={720}>قبل 30 يوماً (شهر كامل / 720 ساعة)</option>
                        </>
                      ) : (
                        <>
                          <option value={0}>Same day (Immediate booking allowed)</option>
                          <option value={24}>The day before (24 hours in advance) — Default (Recommended)</option>
                          <option value={48}>2 days before (48 hours)</option>
                          <option value={72}>3 days before (72 hours)</option>
                          <option value={96}>4 days before (96 hours)</option>
                          <option value={120}>5 days before (120 hours)</option>
                          <option value={144}>6 days before (144 hours)</option>
                          <option value={168}>7 days before (1 week)</option>
                          <option value={192}>8 days before (192 hours)</option>
                          <option value={216}>9 days before (216 hours)</option>
                          <option value={240}>10 days before (240 hours)</option>
                          <option value={336}>14 days before (2 weeks / 336 hours)</option>
                          <option value={504}>21 days before (3 weeks / 504 hours)</option>
                          <option value={720}>30 days before (1 month / 720 hours)</option>
                        </>
                      )}
                    </select>
                  </div>
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
                      {isAr ? 'رابط الانضمام عبر الإنترنت' : 'Online Joining URL'} {offeringType === 'WEBINAR' && deliveryMode === 'ONLINE' && '*'}
                      <input
                        type="url"
                        required={offeringType === 'WEBINAR' && deliveryMode === 'ONLINE'}
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
                  placeholder="e.g. strategy, seo, branding, portfolio"
                  className="mt-1.5 w-full rounded-xl border border-[#E8E2D8] px-3.5 py-2.5 text-xs outline-none focus:border-[#2855C5]"
                />
              </label>

              {/* Additional Client Questions / Intake Form */}
              <div className="rounded-2xl border border-[#E8E2D8] bg-[#FFFDF9] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#101F49]">
                      Client Intake Form &amp; Questions (أسئلة ونماذج إضافية من الخبير للعميل)
                    </label>
                    <p className="text-[11px] text-[#637084] mt-0.5">
                      Ask clients for specific details or files upon booking. Answers can be text (string), PDF document, or image.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIntakeQuestions([
                        ...intakeQuestions,
                        {
                          id: `q_${Date.now()}_${intakeQuestions.length}`,
                          question: '',
                          type: 'string',
                          required: false,
                        },
                      ])
                    }}
                    className="self-start sm:self-auto rounded-xl border border-[#2855C5] bg-[#E8EFFF] px-3 py-1.5 text-xs font-bold text-[#2855C5] hover:bg-[#2855C5] hover:text-white transition shrink-0"
                  >
                    + Add Question
                  </button>
                </div>

                {intakeQuestions.length === 0 ? (
                  <p className="text-[11px] text-[#8b94a1] italic">
                    No intake questions added yet. Click &ldquo;+ Add Question&rdquo; if you need information, a PDF, or an image from the client before the session.
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {intakeQuestions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="rounded-xl border border-[#E8E2D8] bg-white p-3 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#101F49]">
                              {isAr ? `السؤال رقم ${idx + 1}` : `Question #${idx + 1}`}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveIntakeQuestion(idx, 'up')}
                                className="size-5 rounded border border-[#E8E2D8] bg-[#faf8f5] flex items-center justify-center text-[#101F49] hover:bg-[#E8E2D8] disabled:opacity-30 disabled:cursor-not-allowed transition"
                                title={isAr ? 'تحريك للأعلى' : 'Move up'}
                              >
                                <ChevronUp size={11} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === intakeQuestions.length - 1}
                                onClick={() => moveIntakeQuestion(idx, 'down')}
                                className="size-5 rounded border border-[#E8E2D8] bg-[#faf8f5] flex items-center justify-center text-[#101F49] hover:bg-[#E8E2D8] disabled:opacity-30 disabled:cursor-not-allowed transition"
                                title={isAr ? 'تحريك للأسفل' : 'Move down'}
                              >
                                <ChevronDown size={11} />
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setIntakeQuestions(intakeQuestions.filter((_, i) => i !== idx))
                            }
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                          >
                            {isAr ? 'حذف ✕' : 'Remove ✕'}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...intakeQuestions]
                            updated[idx].question = e.target.value
                            setIntakeQuestions(updated)
                          }}
                          placeholder="e.g. Describe your current challenge, or upload your pitch deck (PDF) / design files (Image)"
                          className="w-full rounded-xl border border-[#E8E2D8] px-3 py-1.5 text-xs outline-none focus:border-[#2855C5]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-[#637084]">
                              Answer Format:
                            </span>
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const updated = [...intakeQuestions]
                                updated[idx].type = e.target.value as 'string' | 'pdf' | 'image'
                                setIntakeQuestions(updated)
                              }}
                              className="rounded-lg border border-[#E8E2D8] bg-white px-2.5 py-1 text-xs font-semibold text-[#101F49] outline-none"
                            >
                              <option value="string">Text Answer (String) — إجابة نصية</option>
                              <option value="pdf">PDF Document Upload — مستند PDF</option>
                              <option value="image">Image File Upload — ملف صورة</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#101F49] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(q.required)}
                              onChange={(e) => {
                                const updated = [...intakeQuestions]
                                updated[idx].required = e.target.checked
                                setIntakeQuestions(updated)
                              }}
                              className="size-3.5 rounded accent-[#2855C5]"
                            />
                            Required (إلزامي)
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compliance Controls & Toggles */}
              <div className="rounded-2xl border border-[#E8E2D8] bg-[#FFF9EE] p-4 space-y-3">
                <label className="flex items-start gap-2.5 text-xs font-bold text-[#101F49] cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={adultsOnly}
                    onChange={(e) => setAdultsOnly(e.target.checked)}
                    className="mt-0.5 size-4 rounded accent-[#2855C5]"
                  />
                  <span>
                    I confirm this offer does not include any excluded services and does not make unverified &ldquo;accredited&rdquo; or &ldquo;officially recognized&rdquo; claims. *
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-[#E8E2D8]">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#101F49] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="size-4 rounded accent-[#2855C5]"
                    />
                    Active (Publish once approved by Admin)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-[#101F49] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMostBooked}
                      onChange={(e) => setIsMostBooked(e.target.checked)}
                      className="size-4 rounded accent-[#2855C5]"
                    />
                    Mark as &ldquo;Most Booked&rdquo; badge
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#E8E2D8] pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-[#E8E2D8] px-5 py-2 text-xs font-bold text-[#637084] hover:border-[#101F49]"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#2855C5] px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#101F49] disabled:opacity-50"
                >
                  {saving
                    ? isAr ? 'جاري الحفظ...' : 'Submitting...'
                    : editingService
                      ? isAr ? 'حفظ وإرسال للمراجعة' : 'Save & Submit for Review'
                      : isAr ? 'إرسال العرض للمراجعة' : 'Submit Offer for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
