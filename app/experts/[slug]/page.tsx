'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect, use } from 'react'
import { getExpertBySlug } from '@/lib/data/experts'
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/data/categories'
import type { DayAvailability, TimeSlot } from '@/lib/data/availability'
import { formatDateLabel, formatSlotLabel } from '@/lib/data/availability'
import { CloudinaryUploadWidget } from '@/components/ui/cloudinary-upload-widget'
import { useLanguage } from '@/lib/i18n/language-context'

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string }
}

interface ServiceItem {
  _id: string
  slug?: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  thumbnailUrl?: string
  intendedAudience?: { en: string; ar: string }
  categorySlug?: string
  subcategorySlug?: string
  durationMinutes: number
  breakAfterMinutes: number
  bookingType?: string
  serviceKind?: string
  pricing: {
    baseCurrency: string
    prices: Record<string, number>
  }
  isMostBooked?: boolean
}

export default function ExpertProfile({ params }: PageProps) {
  const { isAr, t, localeHref } = useLanguage()
  const unwrappedParams =
    typeof (params as any)?.then === 'function'
      ? use(params as Promise<{ slug: string }>)
      : (params as { slug: string })
  const slug = unwrappedParams.slug

  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Services
  const [services, setServices] = useState<ServiceItem[]>([])
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [loadingServices, setLoadingServices] = useState(true)

  // Booking states
  const [days, setDays] = useState<DayAvailability[]>([])
  const [loadingDays, setLoadingDays] = useState(true)
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

  // 0. Fetch expert profile dynamically by slug
  useEffect(() => {
    let ignore = false
    setLoadingProfile(true)
    setNotFound(false)

    fetch(`/api/experts/${slug}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success && json.data) {
            setProfile(json.data)
          } else {
            const staticMatch = getExpertBySlug(slug)
            if (staticMatch && staticMatch.slug === slug) {
              setProfile(staticMatch)
            } else {
              setNotFound(true)
            }
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          const staticMatch = getExpertBySlug(slug)
          if (staticMatch && staticMatch.slug === slug) {
            setProfile(staticMatch)
          } else {
            setNotFound(true)
          }
        }
      })
      .finally(() => {
        if (!ignore) setLoadingProfile(false)
      })

    return () => {
      ignore = true
    }
  }, [slug])

  const profileId = profile?._id || profile?.id

  // 1. Fetch expert's approved MVP services
  useEffect(() => {
    if (!profileId) return
    setLoadingServices(true)

    fetch(`/api/services?expertId=${profileId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setServices(data.data)
          const mostBooked = data.data.find((s: ServiceItem) => s.isMostBooked) || data.data[0]
          setSelectedService(mostBooked)
        } else {
          setServices([])
          setSelectedService(null)
        }
      })
      .catch(() => {
        setServices([])
        setSelectedService(null)
      })
      .finally(() => setLoadingServices(false))
  }, [profileId])

  // 2. Fetch upcoming days for this expert
  const duration = selectedService?.durationMinutes || profile?.durationMinutes || 45

  useEffect(() => {
    if (!profileId) return
    let ignore = false
    setLoadingDays(true)
    fetch(`/api/availability?expertId=${profileId}&action=days&count=14`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.days)) {
          setDays(data.days)
          const firstOpen = data.days.find((d: DayAvailability) => d.hasSlots)
          if (firstOpen) {
            setSelectedDate(firstOpen.date)
          }
        }
      })
      .catch((err) => console.error('Error fetching expert days:', err))
      .finally(() => {
        if (!ignore) setLoadingDays(false)
      })

    return () => {
      ignore = true
    }
  }, [profileId])

  // 3. Fetch slots whenever selectedDate or duration changes
  useEffect(() => {
    if (!selectedDate || !profileId) {
      setSlots([])
      return
    }

    let ignore = false
    setLoadingSlots(true)
    setSelectedTime('')

    fetch(
      `/api/availability?expertId=${profileId}&action=slots&date=${selectedDate}&duration=${duration}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.slots)) {
          setSlots(data.slots)
          const firstAvailable = data.slots.find((s: TimeSlot) => s.available)
          if (firstAvailable) {
            setSelectedTime(firstAvailable.time)
          }
        }
      })
      .catch((err) => console.error('Error fetching expert slots:', err))
      .finally(() => {
        if (!ignore) setLoadingSlots(false)
      })

    return () => {
      ignore = true
    }
  }, [selectedDate, profileId, duration])

  // Handle booking submission
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !profile) return
    if (!clientName.trim() || !clientEmail.trim()) {
      alert(isAr ? 'يرجى إدخال الاسم بالكامل والبريد الإلكتروني' : 'Please enter your full name and email address')
      return
    }
    if (!receiptUrl) {
      alert(isAr ? 'يرجى رفع إيصال تحويل إنستاباي لإتمام الحجز' : 'Please upload your InstaPay transfer receipt to complete the booking')
      return
    }

    setBookingLoading(true)

    try {
      const priceEGP = selectedService?.pricing?.prices?.EGP ?? profile.priceNumber ?? 500

      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId: profileId,
          expertSlug: slug,
          serviceId: selectedService?._id !== 'default' ? selectedService?._id : undefined,
          serviceTitle: selectedService?.title,
          date: selectedDate,
          time: selectedTime,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          adultsOnlyConfirmed: true,
          durationMinutes: duration,
          amount: priceEGP,
          currency: 'EGP',
          paymentReceiptUrl: receiptUrl || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setBooked(true)
        setBookingReference(data.reference || data.booking?.reference || 'BK-PROCESSED')
        setBookingSuccessMsg(
          isAr
            ? `تم تقديم طلب الحجز بنجاح لتاريخ ${formatDateLabel(selectedDate)} في تمام ${formatSlotLabel(selectedTime)}.`
            : `Your appointment request has been submitted for ${formatDateLabel(selectedDate)} at ${formatSlotLabel(selectedTime)}.`
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

  if (loadingProfile) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8 py-24 text-center">
          <p className="text-sm font-bold text-muted-foreground">
            {isAr ? 'جاري تحميل ملف الخبير...' : 'Loading expert profile...'}
          </p>
        </div>
      </main>
    )
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8 py-24 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {isAr ? 'الخبير غير متوفر' : 'Expert Not Found'}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {isAr
              ? 'الملف الشخصي المطلوب غير متوفر حالياً أو قيد المراجعة.'
              : `The expert profile for "${slug}" does not exist or may still be pending review.`}
          </p>
          <div className="mt-6">
            <Link
              href="/experts"
              className="rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-primary hover:bg-accent-hover transition shadow-xs"
            >
              {isAr ? '← العودة لجميع الخبراء' : '← Back to All Experts'}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const currentPriceEGP = selectedService?.pricing?.prices?.EGP ?? profile.priceNumber ?? 500

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto max-w-[1140px] px-4 sm:px-8 pb-20 w-full">
        <div className="py-8 w-full min-w-0">
          <Link
            href={localeHref('/experts')}
            className="inline-flex items-center text-xs font-bold text-primary hover:underline"
          >
            {isAr ? '← العودة لدليل الخبراء' : '← Back to directory'}
          </Link>

          <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] w-full min-w-0">
            {/* Left Column: Expert Details & Services */}
            <div className="min-w-0 w-full space-y-8">
              {/* Expert Hero Profile */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="relative size-28 sm:size-32 shrink-0 overflow-hidden rounded-[24px] bg-secondary border border-border">
                  <Image
                    src={profile.image || profile.avatarUrl || '/experts/layla.png'}
                    alt={`${profile.name} portrait`}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary border border-accent/40 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                      {isAr ? 'خبير معتمد • منصة موثوقة' : 'Vetted expert • Marketplace'}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">{profile.location}</span>
                  </div>
                  <h2 className="mt-2 font-body text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-primary break-words">
                    {profile.name}
                  </h2>
                  <p className="mt-1 text-base sm:text-lg font-medium text-muted-foreground break-words">
                    {profile.role}
                  </p>
                  {Number(profile.reviews) > 0 && Number(profile.rating) > 0 && (
                    <p className="mt-2 text-xs font-bold text-primary">
                      <span className="text-accent">★</span> {profile.rating}{' '}
                      <span className="font-normal text-muted-foreground">
                        ({profile.reviews} {isAr ? 'تقييم موثق' : 'verified reviews'})
                      </span>
                    </p>
                  )}

                  {/* About Description */}
                  {(profile.about || profile.bio) && (
                    <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground break-words max-w-2xl">
                      {profile.about || profile.bio}
                    </p>
                  )}

                  {/* Specialty Tags */}
                  {profile.tags && profile.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(profile.tags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Approved MVP Consultations, Workshops & Webinars Offered */}
              <div className="border-t border-border pt-8 min-w-0 w-full">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    {isAr ? 'الاستشارات وورش العمل والندوات المعتمدة' : 'Approved Consultations, Workshops & Webinars'}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {isAr ? 'جلسات موثقة' : 'Verified Sessions'}
                  </span>
                </div>

                {loadingServices ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {isAr ? 'جاري تحميل الجلسات...' : 'Loading offerings...'}
                  </p>
                ) : services.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-6 text-xs text-muted-foreground">
                    {isAr
                      ? 'لا توجد جلسات معتمدة منشورة حالياً لهذا الخبير.'
                      : 'No active approved offerings are currently published for this expert.'}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 min-w-0 w-full">
                    {services.map((s) => {
                      const isSelected = selectedService?._id === s._id
                      const bType = s.bookingType || 'APPOINTMENT'
                      const typeLabel = isAr
                        ? bType === 'WORKSHOP'
                          ? 'ورشة عمل'
                          : bType === 'WEBINAR'
                            ? 'ندوة مباشرة'
                            : 'استشارة فردية'
                        : bType === 'WORKSHOP'
                          ? 'Workshop'
                          : bType === 'WEBINAR'
                            ? 'Webinar'
                            : 'Consultation'

                      const subLabel = getSubcategoryLabel(s.categorySlug, s.subcategorySlug, isAr ? 'ar' : 'en')
                      const displayTitle = isAr ? (s.title?.ar || s.title?.en) : (s.title?.en || s.title?.ar)
                      const displayDesc = isAr ? (s.description?.ar || s.description?.en) : (s.description?.en || s.description?.ar)

                      return (
                        <div
                          key={s._id}
                          onClick={() => setSelectedService(s)}
                          className={`group cursor-pointer overflow-hidden rounded-2xl border transition min-w-0 w-full flex flex-col justify-between ${isSelected
                            ? 'border-primary bg-primary text-white shadow-md ring-2 ring-accent/60'
                            : 'border-border bg-surface text-foreground hover:border-primary'
                            }`}
                        >
                          <div>
                            {/* Service Thumbnail Header */}
                            <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-[#101F49] via-[#1c3575] to-[#2855C5]">
                              {s.thumbnailUrl ? (
                                <img
                                  src={s.thumbnailUrl}
                                  alt={displayTitle}
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                                  <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#F8C15C] backdrop-blur-xs">
                                    {typeLabel}
                                  </span>
                                </div>
                              )}
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                              {/* Floating Badges Top */}
                              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="inline-block rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary shadow-xs">
                                    {typeLabel}
                                  </span>
                                  {subLabel && (
                                    <span className="inline-block rounded-full bg-accent/95 px-2 py-0.5 text-[9px] font-bold text-primary shadow-xs">
                                      {subLabel}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Price Pill Bottom Right */}
                              <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-end justify-between gap-2">
                                <span className="rounded-full bg-black/55 backdrop-blur-xs border border-white/15 px-2 py-0.5 text-[10px] font-bold text-white">
                                  {isAr ? `${s.durationMinutes} دقيقة` : `${s.durationMinutes} min`}
                                </span>
                                <span className="rounded-xl bg-white/95 backdrop-blur-xs px-2.5 py-1 text-xs font-black text-primary whitespace-nowrap shadow-xs">
                                  {s.pricing?.prices?.EGP ?? profile.priceNumber} {isAr ? 'ج.م' : 'EGP'}
                                </span>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 pb-0">
                              <h3 className="text-sm font-bold leading-snug break-words">
                                {displayTitle}
                              </h3>
                              {displayDesc && (
                                <p
                                  className={`mt-1.5 text-xs line-clamp-2 leading-relaxed break-words ${isSelected ? 'text-white/80' : 'text-muted-foreground'
                                    }`}
                                >
                                  {displayDesc}
                                </p>
                              )}
                            </div>
                          </div>
                          <div
                            className={`p-4 pt-2.5 mt-3 border-t text-[10px] font-semibold flex items-center justify-between ${isSelected ? 'border-white/15 text-white/60' : 'border-border text-muted-foreground'
                              }`}
                          >
                            <span>
                              {isAr ? `المدة: ${s.durationMinutes} دقيقة` : `Duration: ${s.durationMinutes} min`}
                            </span>
                            <Link
                              href={localeHref(`/services/${s.slug || s._id}`)}
                              onClick={(e) => e.stopPropagation()}
                              className={`hover:underline font-bold ${isSelected ? 'text-accent' : 'text-primary'
                                }`}
                            >
                              {isAr ? 'التفاصيل ↗' : 'Details ↗'}
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Booking & InstaPay Widget */}
            <aside className="h-fit rounded-[32px] bg-primary p-5 sm:p-6 text-white shadow-xl min-w-0 w-full overflow-hidden">
              <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-3xl font-semibold tracking-tight">
                    {currentPriceEGP} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                  <span className="ms-2 text-xs text-white/70">
                    {isAr ? `/ جلسة ${duration} دقيقة` : `/ ${duration} min session`}
                  </span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-accent">
                  {isAr ? 'دفع مؤكد إنستاباي' : 'InstaPay Verified'}
                </span>
              </div>

              {booked ? (
                <div className="mt-6 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 p-5 text-center space-y-3">
                  <span className="text-2xl">✓</span>
                  <h3 className="text-base font-bold text-emerald-300">
                    {isAr ? 'تم استلام طلب الموعد' : 'Appointment Requested'}
                  </h3>
                  <p className="text-xs text-white/90 leading-5">{bookingSuccessMsg}</p>
                  <div className="rounded-xl bg-black/30 p-2.5 font-mono text-xs font-bold text-emerald-200">
                    {isAr ? 'رقم الحجز:' : 'Booking Reference:'} {bookingReference}
                  </div>
                  <p className="text-[11px] text-white/70">
                    {isAr
                      ? 'تم استلام إيصال إنستاباي بنجاح. سيقوم فريقنا بالتحقق من التحويل وتأكيد الموعد على تقويمك.'
                      : 'Your InstaPay receipt has been submitted. Our team will verify the transfer and confirm your calendar appointment.'}
                  </p>
                </div>
              ) : services.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-5 text-center text-xs text-white/75">
                  {isAr
                    ? 'يتم حالياً تحديث عروض هذا الخبير وستتاح فور اكتمال مراجعتها.'
                    : "This expert's offerings are currently being updated for the approved MVP taxonomy and will be available once admin review is complete."}
                </div>
              ) : (
                <>
                  {/* Step 1: Pick a Date */}
                  <div className="mt-5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-accent">
                      {isAr ? '١. اختر التاريخ' : '1. Select Date'}
                    </label>
                    {loadingDays ? (
                      <p className="mt-2 text-xs text-white/60">
                        {isAr ? 'جاري فحص المواعيد...' : 'Checking calendar...'}
                      </p>
                    ) : (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {days.map((d) => {
                          const isSelected = selectedDate === d.date
                          const isClosed = !d.hasSlots
                          const localeCode = isAr ? 'ar-EG' : 'en-US'

                          return (
                            <button
                              key={d.date}
                              disabled={isClosed}
                              onClick={() => setSelectedDate(d.date)}
                              className={`shrink-0 rounded-2xl border px-3 py-2 text-center transition ${isSelected
                                ? 'border-accent bg-accent text-primary shadow-xs font-bold'
                                : isClosed
                                  ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                                  : 'border-white/15 bg-white/10 text-white hover:border-white/40'
                                }`}
                            >
                              <span className="block text-[10px] font-bold uppercase">
                                {new Intl.DateTimeFormat(localeCode, { weekday: 'short' }).format(
                                  new Date(d.date + 'T00:00:00')
                                )}
                              </span>
                              <span className="block text-sm font-semibold">
                                {new Intl.DateTimeFormat(localeCode, { day: 'numeric', month: 'short' }).format(
                                  new Date(d.date + 'T00:00:00')
                                )}
                              </span>
                              {isClosed && (
                                <span className="mt-0.5 block text-[9px] text-white/40">
                                  {isAr ? 'مغلق' : 'Closed'}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Pick a Slot */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-accent">
                        {isAr ? '٢. اختر التوقيت' : '2. Select Time Slot'}
                      </label>
                      {selectedDate && (
                        <span className="text-[11px] text-white/70">
                          {formatDateLabel(selectedDate)}
                        </span>
                      )}
                    </div>

                    {loadingSlots ? (
                      <p className="mt-2 text-xs text-white/60">
                        {isAr ? 'جاري تحميل المواعيد...' : 'Loading available times...'}
                      </p>
                    ) : slots.length === 0 ? (
                      <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/60">
                        {isAr ? 'لا توجد فترات متاحة في هذا اليوم.' : 'No open consultation slots on this date.'}
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 max-h-48 overflow-y-auto pr-1">
                        {slots.map((s) => {
                          const isSelected = selectedTime === s.time
                          return (
                            <button
                              key={s.time}
                              disabled={!s.available}
                              onClick={() => setSelectedTime(s.time)}
                              className={`rounded-xl border py-2 px-1 text-center font-mono text-[11px] sm:text-xs font-semibold transition truncate ${isSelected
                                ? 'border-accent bg-accent text-primary shadow-xs font-bold'
                                : !s.available
                                  ? 'border-white/10 bg-white/5 text-white/25 cursor-not-allowed line-through'
                                  : 'border-white/15 bg-white/10 text-white hover:border-white/40'
                                }`}
                            >
                              {formatSlotLabel(s.time)}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Client Details */}
                  <div className="mt-4 space-y-2.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-accent">
                      {isAr ? '٣. بيانات التواصل' : '3. Your Contact Details'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'الاسم بالكامل *' : 'Full Name *'}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-accent"
                    />
                    <input
                      type="email"
                      required
                      placeholder={isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-accent"
                    />
                    <input
                      type="tel"
                      placeholder={isAr ? 'رقم الهاتف / واتساب' : 'WhatsApp / Phone Number'}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-accent"
                    />
                  </div>

                  {/* Step 4: InstaPay Payment Instructions & Receipt Upload */}
                  <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">
                      {isAr ? '٤. الدفع عبر إنستاباي' : '4. InstaPay Payment'}
                    </p>
                    <div className="text-xs leading-relaxed text-white/80 space-y-1">
                      <p>
                        {isAr ? (
                          <>حول مبلغ <strong>{currentPriceEGP} ج.م</strong> لعنوان إنستاباي التالي:</>
                        ) : (
                          <>Transfer <strong>{currentPriceEGP} EGP</strong> to InstaPay address:</>
                        )}
                      </p>
                      <p className="rounded-lg bg-black/40 px-2.5 py-1 font-mono text-[11px] font-bold text-white selection:bg-accent text-center">
                        bokbok@instapay
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-white/70 mb-2">
                        {isAr ? 'رفع إيصال التحويل:' : 'Upload Transfer Receipt:'}
                      </label>
                      {receiptUrl ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={receiptUrl}
                              alt="Receipt"
                              className="size-10 rounded-lg object-cover border border-emerald-400/40 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-emerald-300 truncate">
                                {isAr ? '✓ تم إرفاق الإيصال' : '✓ Receipt attached'}
                              </p>
                              <p className="text-[9px] text-emerald-400/70 truncate">
                                {isAr ? 'تم التحقق والرفع بنجاح' : 'Compressed & verified'}
                              </p>
                            </div>
                          </div>
                          <CloudinaryUploadWidget
                            folder="bokbok/receipts"
                            fallbackType="receipt"
                            onUploadStart={() => setUploadingReceipt(true)}
                            onSuccess={(result) => {
                              setReceiptUrl(result.url)
                              setUploadingReceipt(false)
                            }}
                            onError={() => setUploadingReceipt(false)}
                          >
                            <button
                              type="button"
                              className="text-[10px] font-bold text-emerald-300 hover:text-white underline shrink-0 px-1.5 py-0.5"
                            >
                              {isAr ? 'استبدال' : 'Replace'}
                            </button>
                          </CloudinaryUploadWidget>
                        </div>
                      ) : uploadingReceipt ? (
                        <div className="rounded-xl border border-dashed border-accent/60 bg-accent/10 p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="size-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                            <p className="text-[11px] font-bold text-accent">
                              {isAr ? 'جاري رفع إيصال الدفع...' : 'Uploading transfer receipt...'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <CloudinaryUploadWidget
                          folder="bokbok/receipts"
                          fallbackType="receipt"
                          onUploadStart={() => setUploadingReceipt(true)}
                          onSuccess={(result) => {
                            setReceiptUrl(result.url)
                            setUploadingReceipt(false)
                          }}
                          onError={() => setUploadingReceipt(false)}
                          className="w-full"
                        >
                          <div className="group cursor-pointer rounded-xl border border-dashed border-white/25 bg-white/5 p-3 text-center transition hover:border-accent hover:bg-white/10">
                            <p className="text-xs font-bold text-white group-hover:text-accent">
                              {isAr ? '+ رفع إيصال الدفع' : '+ Upload Receipt'}
                            </p>
                            <p className="mt-0.5 text-[10px] text-white/50">
                              {isAr ? 'رفع فوري مع ضغط وتأمين الملف' : 'Instant Cloudinary upload with compression'}
                            </p>
                          </div>
                        </CloudinaryUploadWidget>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={!selectedTime || bookingLoading || uploadingReceipt || !receiptUrl}
                    onClick={handleBooking}
                    className="mt-5 flex w-full items-center justify-center rounded-full bg-accent hover:bg-accent-hover px-5 py-3.5 text-sm font-bold text-primary shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {bookingLoading
                      ? (isAr ? 'جاري إرسال الموعد...' : 'Submitting appointment...')
                      : uploadingReceipt
                        ? (isAr ? 'جاري رفع إيصال الدفع...' : 'Uploading Receipt...')
                        : !selectedTime
                          ? (isAr ? 'اختر التاريخ والتوقيت' : 'Choose a date & time')
                          : !receiptUrl
                            ? (isAr ? 'يرجى إرفاق إيصال التحويل أولاً' : 'Upload Receipt to Book')
                            : (isAr ? 'حجز وتأكيد التحويل' : 'Book & Submit Receipt')}
                  </button>
                </>
              )}

              <p className="mt-4 text-center text-[11px] text-white/50">
                {isAr
                  ? 'يمكنك إعادة الجدولة أو الإلغاء حتى 12 ساعة قبل موعد الجلسة'
                  : 'Reschedule or cancel up to 12 hours before session'}
              </p>
            </aside>
          </section>
        </div>
      </div>
    </main>
  )
}
