'use client'

import React, { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/data/categories'
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Check,
  Star,
  Users,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import type { DayAvailability, TimeSlot } from '@/lib/data/availability'
import { formatDateLabel, formatSlotLabel } from '@/lib/data/availability'
import { CloudinaryUploadWidget } from '@/components/ui/cloudinary-upload-widget'
import { useLanguage } from '@/lib/i18n/language-context'

interface ServiceDetailPageProps {
  params: Promise<{ slug: string }> | { slug: string }
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { isAr, t, localeHref } = useLanguage()
  const unwrappedParams =
    typeof (params as any)?.then === 'function'
      ? use(params as Promise<{ slug: string }>)
      : (params as { slug: string })
  const serviceSlug = unwrappedParams.slug

  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Booking states
  const [days, setDays] = useState<DayAvailability[]>([])
  const [loadingDays, setLoadingDays] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')

  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string>('')

  // Client Details & InstaPay
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const [bookingLoading, setBookingLoading] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookingReference, setBookingReference] = useState('')
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('')

  useEffect(() => {
    fetch(`/api/services/${serviceSlug}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setService(json.data)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [serviceSlug])

  const isEvent = service?.bookingType === 'WORKSHOP' || service?.bookingType === 'WEBINAR'
  const expertId = service?.expertId

  // Load calendar days if it's an appointment service
  useEffect(() => {
    if (!expertId || isEvent) return
    setLoadingDays(true)
    fetch(`/api/availability?expertId=${expertId}&action=days&count=14&duration=${service.durationMinutes || 45}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.days)) {
          setDays(data.days)
          const firstOpen = data.days.find((d: DayAvailability) => d.hasSlots)
          if (firstOpen) setSelectedDate(firstOpen.date)
        }
      })
      .finally(() => setLoadingDays(false))
  }, [expertId, isEvent, service?.durationMinutes])

  // Load slots when date changes
  useEffect(() => {
    if (!selectedDate || !expertId || isEvent) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSelectedTime('')
    fetch(
      `/api/availability?expertId=${expertId}&action=slots&date=${selectedDate}&duration=${service.durationMinutes || 45}&breakAfter=${service.breakAfterMinutes || 0}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.slots)) {
          setSlots(data.slots)
          const firstAvailable = data.slots.find((s: TimeSlot) => s.available)
          if (firstAvailable) setSelectedTime(firstAvailable.time)
        }
      })
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, expertId, isEvent, service?.durationMinutes, service?.breakAfterMinutes])

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const canonicalSlug = service?.slug || serviceSlug
      const url = `${window.location.origin}/services/${canonicalSlug}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleBook = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert(isAr ? 'يرجى إدخال الاسم والبريد الإلكتروني' : 'Please enter your full name and email address')
      return
    }
    if (!isEvent && (!selectedDate || !selectedTime)) {
      alert(isAr ? 'يرجى اختيار التاريخ والوقت المناسب' : 'Please select a date and time slot')
      return
    }

    setBookingLoading(true)
    try {
      const payload: any = {
        expertId,
        expertSlug: service.expert?.slug,
        serviceId: service._id,
        serviceTitle: service.title,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        adultsOnlyConfirmed: true,
        paymentReceiptUrl: receiptUrl || undefined,
      }

      if (!isEvent) {
        payload.date = selectedDate
        payload.time = selectedTime
      }

      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setBooked(true)
        setBookingReference(data.reference || data.booking?.reference || 'BK-PROCESSED')
        const titleText = isAr ? (service.title?.ar || service.title?.en) : (service.title?.en || service.title?.ar)
        setBookingSuccessMsg(
          isEvent
            ? isAr
              ? `تم حجز مقعدك في "${titleText}" بنجاح!`
              : `Your seat for "${titleText}" has been reserved!`
            : isAr
              ? `تم تقديم طلب الحجز بنجاح لتاريخ ${formatDateLabel(selectedDate)} في تمام ${formatSlotLabel(selectedTime)}.`
              : `Your booking request has been submitted for ${formatDateLabel(selectedDate)} at ${formatSlotLabel(selectedTime)}.`
        )
      } else {
        alert(data.error || (isAr ? 'تعذر إتمام الحجز' : 'Failed to complete booking'))
      }
    } catch {
      alert(isAr ? 'حدث خطأ أثناء إجراء الحجز' : 'An error occurred while booking.')
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-sm font-bold text-muted-foreground">
          {isAr ? 'جاري تحميل تفاصيل الجلسة...' : 'Loading offer details...'}
        </p>
      </main>
    )
  }

  if (!service) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold text-primary">
          {isAr ? 'العرض غير متوفر' : 'Offer Not Found'}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          {isAr
            ? 'هذا العرض غير متاح حالياً أو قيد مراجعة الإدارة.'
            : 'This offer may be inactive, outside the approved MVP taxonomy, or pending administrator review.'}
        </p>
        <Link href="/explore" className="mt-6 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white">
          {isAr ? '← استكشف العروض المعتمدة' : '← Explore Approved Offerings'}
        </Link>
      </main>
    )
  }

  const baseCurrency = isAr ? 'ج.م' : (service.pricing?.baseCurrency || 'EGP')
  const price = service.pricing?.prices?.EGP ?? service.pricing?.prices?.[service.pricing?.baseCurrency || 'EGP'] ?? 0
  const catLabel = getCategoryLabel(service.categorySlug, isAr ? 'ar' : 'en')
  const subLabel = getSubcategoryLabel(service.categorySlug, service.subcategorySlug, isAr ? 'ar' : 'en')
  const displayTitle = isAr ? (service.title?.ar || service.title?.en) : (service.title?.en || service.title?.ar)
  const displayDescription = isAr ? (service.description?.ar || service.description?.en) : (service.description?.en || service.description?.ar)
  const displayAudience = isAr ? (service.intendedAudience?.ar || service.intendedAudience?.en) : (service.intendedAudience?.en || service.intendedAudience?.ar)

  const typeLabel = isAr
    ? service.bookingType === 'WORKSHOP'
      ? 'ورشة عمل'
      : service.bookingType === 'WEBINAR'
        ? 'ندوة مباشرة'
        : 'استشارة فردية'
    : service.bookingType === 'WORKSHOP'
      ? 'Workshop'
      : service.bookingType === 'WEBINAR'
        ? 'Webinar'
        : '1-on-1 Consultation'

  const deliveryLabel = isAr
    ? service.deliveryMode === 'ONLINE'
      ? '🌐 عبر الإنترنت'
      : service.deliveryMode === 'IN_PERSON'
        ? '📍 حضوري'
        : '🔄 مرن / هجين'
    : service.deliveryMode === 'ONLINE'
      ? '🌐 Online Remote'
      : service.deliveryMode === 'IN_PERSON'
        ? '📍 In-Person'
        : '🔄 Hybrid'

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto max-w-[1140px] px-4 sm:px-8 pb-20 w-full min-w-0">
        {/* Action / Breadcrumb Bar */}
        <div className="flex py-5 flex-wrap items-center justify-between gap-4 border-b border-border min-w-0">
          <Link
            href={localeHref(
              isEvent
                ? service.bookingType === 'WORKSHOP'
                  ? '/workshops'
                  : '/webinars'
                : '/consultations'
            )}
            className="text-xs font-bold text-primary hover:underline"
          >
            {isAr ? '← العودة للمتجر' : '← Back to Catalog'}
          </Link>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-primary hover:border-primary transition"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Share2 size={13} />}
            {copied
              ? isAr ? 'تم نسخ الرابط!' : 'Link Copied!'
              : isAr ? 'مشاركة الجلسة' : 'Share Offer'}
          </button>
        </div>

        <div className="mt-8 sm:mt-10 grid gap-8 lg:gap-12 lg:grid-cols-[1.3fr_1fr] items-start w-full min-w-0">
          {/* Left Column: Offering details & Provider Card */}
          <div className="space-y-8 min-w-0 w-full">
            <div>
              {/* Type & Delivery Mode & Taxonomy Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary border border-accent/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
                  {typeLabel}
                </span>
                <span className="rounded-full bg-surface border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {deliveryLabel}
                </span>
                {catLabel && (
                  <span className="rounded-full bg-surface border border-border px-3 py-1 text-xs font-semibold text-primary">
                    {catLabel}
                  </span>
                )}
                {subLabel && (
                  <span className="rounded-full bg-secondary border border-accent/40 px-3 py-1 text-xs font-bold text-primary">
                    {subLabel}
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-primary leading-tight break-words">
                {displayTitle}
              </h1>

              {service.thumbnailUrl && (
                <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-xs aspect-[16/9] max-h-80 w-full">
                  <img
                    src={service.thumbnailUrl}
                    alt={displayTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground border-y border-border py-4 min-w-0">
                {isEvent ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-primary shrink-0" />
                      <span>
                        {service.event?.date} · {service.event?.startTime} - {service.event?.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-primary shrink-0" />
                      <span>
                        {isAr
                          ? `السعة: ${service.event?.capacity || 20} مقعد (${service.event?.registeredCount || 0} مسجل)`
                          : `Capacity: ${service.event?.capacity || 20} seats (${service.event?.registeredCount || 0} enrolled)`}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-primary shrink-0" />
                      <span>
                        {isAr
                          ? `${service.durationMinutes} دقيقة جلسة`
                          : `${service.durationMinutes} minutes session`}
                      </span>
                    </div>
                    {service.breakAfterMinutes > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {isAr
                          ? `(${service.breakAfterMinutes} دقيقة فترة راحة)`
                          : `(${service.breakAfterMinutes}m break buffer)`}
                      </span>
                    )}
                  </>
                )}

                {service.deliveryMode !== 'ONLINE' && service.location?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary shrink-0" />
                    <span>
                      {service.location.address}
                      {service.location.city ? `, ${service.location.city}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Activity Description */}
              <div className="mt-6 space-y-4 min-w-0">
                <h2 className="text-base font-bold text-primary">
                  {isAr ? 'تفاصيل ونطاق الجلسة' : 'Actual Activity & Scope'}
                </h2>
                {displayDescription && (
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                    {displayDescription}
                  </p>
                )}
              </div>

              {/* Intended Audience Box */}
              <div className="mt-6 rounded-2xl border border-border bg-surface p-4 space-y-1.5">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Users size={14} className="text-primary" />
                  {isAr ? 'الفئة المستهدفة' : 'Intended Audience'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {displayAudience || (isAr ? 'المتخصصون ورواد الأعمال والمهتمون بالتطوير.' : 'Professionals, founders, and learners.')}
                </p>
              </div>

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {service.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-surface border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Provider Info Card */}
            {service.expert && (
              <div className="rounded-3xl border border-border bg-surface p-5 sm:p-7 shadow-xs min-w-0 w-full">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  {isAr ? 'يقدمها الخبير' : 'Offered By'}
                </p>
                <div className="flex items-start gap-4 min-w-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                    <Image
                      src={service.expert.image || '/experts/layla.png'}
                      alt={service.expert.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <h3 className="text-lg font-bold text-primary truncate">{service.expert.name}</h3>
                      {Number(service.expert.reviews) > 0 && Number(service.expert.rating) > 0 && (
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-primary">
                          <Star size={12} fill="currentColor" className="text-accent" /> {service.expert.rating}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.expert.role}</p>
                    <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{service.expert.location}</p>
                    {service.expert.bio && (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-3 leading-relaxed break-words">
                        {service.expert.bio}
                      </p>
                    )}
                    {service.expert.slug && (
                      <div className="mt-4">
                        <Link
                          href={localeHref(`/experts/${service.expert.slug}`)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          {isAr ? 'عرض الملف الكامل للخبير ←' : 'View Full Expert Profile →'}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Booking & Payment Card */}
          <aside className="sticky top-10 rounded-[32px] bg-primary p-5 sm:p-7 text-white shadow-xl min-w-0 w-full max-w-full">
            <div className="flex items-baseline justify-between border-b border-white/10 pb-5 min-w-0">
              <div className="min-w-0">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {price} {baseCurrency}
                </span>
                <span className="ms-2 text-xs text-white/70">
                  {isEvent
                    ? isAr ? '/ تذكرة حضور' : '/ attendee ticket'
                    : isAr ? `/ جلسة ${service.durationMinutes} دقيقة` : `/ ${service.durationMinutes} min session`}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-accent">
                {isAr ? 'دفع مؤكد إنستاباي' : 'InstaPay Verified'}
              </span>
            </div>

            {booked ? (
              <div className="mt-6 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 p-5 text-center space-y-3">
                <span className="text-2xl">✓</span>
                <h3 className="text-base font-bold text-emerald-300">
                  {isAr ? 'تم استلام طلب التسجيل' : 'Registration Complete'}
                </h3>
                <p className="text-xs text-white/90 leading-relaxed">{bookingSuccessMsg}</p>
                <div className="rounded-xl bg-black/40 p-2.5 font-mono text-xs font-bold text-emerald-200">
                  {isAr ? 'رقم الحجز:' : 'Reference:'} {bookingReference}
                </div>
                <p className="text-[11px] text-white/70">
                  {isAr
                    ? 'سيقوم فريقنا بالتحقق من تحويل إنستاباي وستصلك كافة التعليمات ورابط الجلسة عبر البريد الإلكتروني.'
                    : 'Our team will verify the InstaPay transfer and you will receive full instructions and calendar invite by email.'}
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5 min-w-0 w-full">
                {/* Step 1: Schedule (if appointment) */}
                {!isEvent && (
                  <>
                    <div className="min-w-0 w-full">
                      <label className="block text-xs font-bold uppercase tracking-wider text-accent mb-2">
                        {isAr ? '١. اختر التاريخ' : '1. Select Date'}
                      </label>
                      {loadingDays ? (
                        <p className="text-xs text-white/60">
                          {isAr ? 'جاري فحص المواعيد...' : 'Loading available dates...'}
                        </p>
                      ) : days.length === 0 ? (
                        <p className="text-xs text-white/60">
                          {isAr ? 'لا توجد مواعيد متاحة لهذه المدة.' : 'No available dates found for this duration.'}
                        </p>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full min-w-0 max-w-full">
                          {days.map((d) => {
                            const localeCode = isAr ? 'ar-EG' : 'en-US'
                            return (
                              <button
                                key={d.date}
                                type="button"
                                disabled={!d.hasSlots}
                                onClick={() => setSelectedDate(d.date)}
                                className={`shrink-0 rounded-2xl p-2.5 text-center transition min-w-[64px] ${selectedDate === d.date
                                  ? 'bg-accent text-primary font-bold shadow-xs'
                                  : d.hasSlots
                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                                  }`}
                              >
                                <span className="block text-[10px] font-bold uppercase">
                                  {new Intl.DateTimeFormat(localeCode, { weekday: 'short' }).format(
                                    new Date(d.date + 'T00:00:00')
                                  )}
                                </span>
                                <span className="block text-base font-black mt-0.5">
                                  {d.date.slice(8)}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {selectedDate && (
                      <div className="min-w-0 w-full">
                        <label className="block text-xs font-bold uppercase tracking-wider text-accent mb-2">
                          {isAr ? `٢. اختر التوقيت (${formatDateLabel(selectedDate)})` : `2. Select Time Slot (${formatDateLabel(selectedDate)})`}
                        </label>
                        {loadingSlots ? (
                          <p className="text-xs text-white/60">
                            {isAr ? 'جاري تحميل المواعيد...' : 'Loading available slots...'}
                          </p>
                        ) : slots.length === 0 ? (
                          <p className="text-xs text-rose-300">
                            {isAr ? 'لا توجد مواعيد شاغرة في هذا اليوم.' : 'No open slots on this day.'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 min-w-0">
                            {slots.map((s) => (
                              <button
                                key={s.time}
                                type="button"
                                disabled={!s.available}
                                onClick={() => setSelectedTime(s.time)}
                                className={`rounded-xl py-2 px-2 text-xs font-bold transition ${selectedTime === s.time
                                  ? 'bg-accent text-primary font-bold shadow-xs'
                                  : s.available
                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                    : 'bg-white/5 text-white/20 line-through cursor-not-allowed'
                                  }`}
                              >
                                {formatSlotLabel(s.time)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Step 2: Client Info */}
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-accent">
                    {isEvent
                      ? isAr ? '١. بيانات التسجيل' : '1. Your Information'
                      : isAr ? '٣. بيانات التواصل' : '3. Your Information'}
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={isAr ? 'الاسم بالكامل *' : 'Full Name *'}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-accent"
                  />
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder={isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-accent"
                  />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder={isAr ? 'رقم الهاتف / واتساب' : 'Phone Number (e.g. +20 10...)'}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-accent"
                  />
                </div>

                {/* Step 3: InstaPay Transfer Instructions */}
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs space-y-1">
                    <p className="font-bold text-accent">
                      {isAr ? 'بيانات الدفع عبر إنستاباي' : 'InstaPay Payment Details'}
                    </p>
                    <p className="text-white/80 font-mono text-[11px]">IPA: bokbok@instapay</p>
                    <p className="text-white/80 font-mono text-[11px]">
                      {isAr ? 'المبلغ المطلوب:' : 'Amount:'} {price} {baseCurrency}
                    </p>
                    <p className="text-[10px] text-white/60">
                      {isAr
                        ? 'حول المبلغ عبر تطبيق إنستاباي أو بنكك ثم ارفع إيصال التحويل أدناه.'
                        : 'Transfer via your banking app or InstaPay, then upload the confirmation receipt below.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-2">
                      {isAr ? 'رفع إيصال تحويل إنستاباي:' : 'Upload InstaPay Transfer Receipt:'}
                    </label>
                    {receiptUrl ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={receiptUrl}
                            alt="Receipt Preview"
                            className="size-12 rounded-lg object-cover border border-emerald-400/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-300 truncate">
                              {isAr ? '✓ تم إرفاق الإيصال' : '✓ Receipt attached'}
                            </p>
                            <p className="text-[10px] text-emerald-400/70 truncate">
                              {isAr ? 'تم التحقق والرفع بنجاح' : 'Auto-compressed & verified'}
                            </p>
                          </div>
                        </div>
                        <CloudinaryUploadWidget
                          folder="bokbok/receipts"
                          fallbackType="receipt"
                          onSuccess={(result) => setReceiptUrl(result.url)}
                        >
                          <button
                            type="button"
                            className="text-[11px] font-bold text-emerald-300 hover:text-white underline shrink-0 px-2 py-1"
                          >
                            {isAr ? 'استبدال' : 'Replace'}
                          </button>
                        </CloudinaryUploadWidget>
                      </div>
                    ) : (
                      <CloudinaryUploadWidget
                        folder="bokbok/receipts"
                        fallbackType="receipt"
                        onSuccess={(result) => setReceiptUrl(result.url)}
                        className="w-full"
                      >
                        <div className="group cursor-pointer rounded-xl border border-dashed border-white/25 bg-white/5 p-4 text-center transition hover:border-accent hover:bg-white/10">
                          <p className="text-xs font-bold text-white group-hover:text-accent">
                            {isAr ? '+ رفع إيصال التحويل' : '+ Upload Transfer Receipt'}
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/50">
                            {isAr ? 'رفع آمن ومباشر عبر كلاوديناري' : 'Click to open Cloudinary uploader (Automatic high compression)'}
                          </p>
                        </div>
                      </CloudinaryUploadWidget>
                    )}
                  </div>
                </div>

                {/* Submit Booking */}
                <button
                  type="button"
                  disabled={bookingLoading || (!isEvent && (!selectedDate || !selectedTime))}
                  onClick={handleBook}
                  className="w-full rounded-full bg-accent hover:bg-accent-hover py-3.5 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading
                    ? (isAr ? 'جاري معالجة الطلب...' : 'Processing Booking...')
                    : isEvent
                      ? (isAr ? 'تأكيد التسجيل في الجلسة' : 'Confirm Registration')
                      : (isAr ? 'تأكيد وحجز الموعد' : 'Confirm & Request Session')}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-white/50 pt-1">
                  <ShieldCheck size={14} className="text-accent" />
                  <span>{isAr ? 'عرض معتمد ومراجع من الإدارة' : 'Admin-reviewed offer'}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
