'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import type { DayAvailability, TimeSlot } from '@/lib/data/availability'
import { formatDateLabel, formatSlotLabel } from '@/lib/data/availability'
import { CloudinaryUploadWidget } from '@/components/ui/cloudinary-upload-widget'
import { useLanguage } from '@/lib/i18n/language-context'
import { formatRefundPolicyDetails } from '@/lib/services/refund-policies'

export function ServiceDetailView({
  slug: serviceSlug,
  initialService,
}: {
  slug: string
  initialService?: any
}) {
  const { isAr, localeHref } = useLanguage()

  const [service, setService] = useState<any>(initialService || null)
  const [loading, setLoading] = useState(!initialService)
  const [copied, setCopied] = useState(false)

  // Booking states
  const [days, setDays] = useState<DayAvailability[]>([])
  const [loadingDays, setLoadingDays] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>()
    const localeCode = isAr ? 'ar-EG' : 'en-US'
    for (const d of days) {
      const ym = d.date.slice(0, 7)
      if (!monthsMap.has(ym)) {
        const label = new Intl.DateTimeFormat(localeCode, { month: 'short', year: 'numeric' }).format(
          new Date(d.date + 'T00:00:00')
        )
        monthsMap.set(ym, label)
      }
    }
    return Array.from(monthsMap.entries()).map(([key, label]) => ({ key, label }))
  }, [days, isAr])

  const visibleDays = useMemo(() => {
    if (selectedMonth === 'all') return days
    return days.filter((d) => d.date.startsWith(selectedMonth))
  }, [days, selectedMonth])

  const datesScrollRef = React.useRef<HTMLDivElement>(null)

  const scrollDates = (direction: 'prev' | 'next') => {
    if (datesScrollRef.current) {
      const forward = direction === 'next'
      const offset = 280
      if (isAr) {
        datesScrollRef.current.scrollBy({ left: forward ? -offset : offset, behavior: 'smooth' })
      } else {
        datesScrollRef.current.scrollBy({ left: forward ? offset : -offset, behavior: 'smooth' })
      }
    }
  }

  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string>('')

  // Client Details & InstaPay
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({})
  const [uploadingIntake, setUploadingIntake] = useState<Record<string, boolean>>({})
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const [bookingLoading, setBookingLoading] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookingReference, setBookingReference] = useState('')
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('')
  const [bookingResultType, setBookingResultType] = useState<'seat' | 'waitlist' | 'interest'>('seat')
  const [bookingResultStatus, setBookingResultStatus] = useState<string>('pending')
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [serviceReviews, setServiceReviews] = useState<any[]>(
    Array.isArray(initialService?.reviews) ? initialService.reviews : []
  )
  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => {
    if (initialService && (initialService.slug === serviceSlug || initialService._id === serviceSlug)) {
      if (Array.isArray(initialService.reviews)) {
        setServiceReviews(initialService.reviews)
      }
      return
    }
    fetch(`/api/services/${serviceSlug}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setService(json.data)
          if (Array.isArray(json.data.reviews)) {
            setServiceReviews(json.data.reviews)
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [serviceSlug, initialService])

  useEffect(() => {
    if (!service?._id) return
    if (Array.isArray(service.reviews)) {
      setServiceReviews(service.reviews)
      return
    }
    setLoadingReviews(true)
    fetch(`/api/reviews?serviceId=${service._id}&limit=30`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setServiceReviews(json.data)
        }
      })
      .catch((err) => console.error('Failed to fetch service reviews:', err))
      .finally(() => setLoadingReviews(false))
  }, [service?._id, service?.reviews])

  const isEvent = service?.bookingType === 'WORKSHOP' || service?.bookingType === 'WEBINAR'
  const expertId = service?.expertId

  // Load calendar days if it's an appointment service
  useEffect(() => {
    if (!expertId || isEvent) return
    setLoadingDays(true)
    const noticeDays = Math.ceil((service.minNoticeHours !== undefined ? Number(service.minNoticeHours) : 24) / 24)
    const dayCount = Math.max(90, noticeDays + 90)
    fetch(`/api/availability?expertId=${expertId}&action=days&count=${dayCount}&duration=${service.durationMinutes || 45}&serviceId=${service._id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.days)) {
          setDays(data.days)
          const firstOpen = data.days.find((d: DayAvailability) => d.hasSlots)
          if (firstOpen) setSelectedDate(firstOpen.date)
        }
      })
      .finally(() => setLoadingDays(false))
  }, [expertId, isEvent, service?.durationMinutes, service?._id, service?.minNoticeHours])

  // Load slots when date changes
  useEffect(() => {
    if (!selectedDate || !expertId || isEvent) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSelectedTime('')
    fetch(
      `/api/availability?expertId=${expertId}&action=slots&date=${selectedDate}&duration=${service.durationMinutes || 45}&breakAfter=${service.breakAfterMinutes || 0}&serviceId=${service._id}`
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
  }, [selectedDate, expertId, isEvent, service?.durationMinutes, service?.breakAfterMinutes, service?._id])

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const canonicalSlug = service?.slug || serviceSlug
      const url = `${window.location.origin}/services/${canonicalSlug}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2505)
    }
  }

  const handleBook = async () => {
    const computedPrice =
      service?.pricing?.prices?.EGP ??
      service?.pricing?.prices?.[service?.pricing?.baseCurrency || 'EGP'] ??
      0
    const isFreeOffer = Number(computedPrice) <= 0
    const evStatus = service?.event?.eventStatus || 'open'
    const spotsLeft = service?.event
      ? Math.max(0, (service.event.capacity || 0) - (service.event.registeredCount || 0))
      : 1
    const isWaitlistFlow = isEvent && (evStatus === 'coming_soon' || spotsLeft <= 0)
    const needsReceipt = !isFreeOffer && !isWaitlistFlow

    if (!clientName.trim() || !clientEmail.trim()) {
      alert(isAr ? 'يرجى إدخال الاسم والبريد الإلكتروني' : 'Please enter your full name and email address')
      return
    }
    if (!isEvent && (!selectedDate || !selectedTime)) {
      alert(isAr ? 'يرجى اختيار التاريخ والوقت المناسب' : 'Please select a date and time slot')
      return
    }
    if (needsReceipt && !receiptUrl) {
      alert(isAr ? 'يرجى رفع إيصال تحويل إنستاباي لإتمام الحجز' : 'Please upload your InstaPay transfer receipt to complete the booking')
      return
    }

    if (Array.isArray(service.intakeQuestions)) {
      for (const q of service.intakeQuestions) {
        if (q.required && !intakeAnswers[q.id]?.trim()) {
          const qName = q.question || (isAr ? 'السؤال الإلزامي' : 'the required intake question')
          alert(
            isAr
              ? `يرجى الإجابة أو رفع الملف المطلوب لـ: "${qName}"`
              : `Please provide an answer or file for required question: "${qName}"`
          )
          return
        }
      }
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

      if (Array.isArray(service.intakeQuestions) && service.intakeQuestions.length > 0) {
        payload.intakeAnswers = service.intakeQuestions.map((q: any) => ({
          questionId: q.id,
          question: q.question,
          type: q.type,
          answer: intakeAnswers[q.id]?.trim() || '',
        }))
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
        const regType: 'seat' | 'waitlist' | 'interest' = data.registrationType || 'seat'
        setBookingResultType(regType)
        setBookingResultStatus(data.status || data.booking?.status || 'pending')
        const titleText = isAr ? (service.title?.ar || service.title?.en) : (service.title?.en || service.title?.ar)
        setBookingSuccessMsg(
          regType === 'interest'
            ? isAr
              ? `تم تسجيل اهتمامك في "${titleText}" بنجاح! سنبلغك فور فتح التسجيل.`
              : `You're on the early-notification list for "${titleText}"! We'll email you when registration opens.`
            : regType === 'waitlist'
              ? isAr
                ? `تمت إضافتك لقائمة الانتظار في "${titleText}". سنراسلك فوراً عند توفر مقعد.`
                : `You've been added to the waitlist for "${titleText}". We'll notify you if a spot opens up.`
              : isEvent
                ? isAr
                  ? `تم تقديم طلب تسجيل مقعدك في "${titleText}" بنجاح!`
                  : `Your seat request for "${titleText}" has been submitted!`
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
            : 'This offer may be inactive, outside approved platform categories, or pending administrator review.'}
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
  const thumbnailSrc =
    service.thumbnailUrl ||
    (service.categorySlug ? `/categories/${service.categorySlug}.png` : null)

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
    ? service.deliveryMode === 'IN_PERSON'
      ? 'حضوري'
      : 'عبر الإنترنت'
    : service.deliveryMode === 'IN_PERSON'
      ? 'In-Person'
      : 'Online Remote'

  const minNoticeHours = service.minNoticeHours !== undefined ? Number(service.minNoticeHours) : 24
  const noticeLabel = isAr
    ? minNoticeHours === 0
      ? 'حجز فوري في نفس اليوم'
      : minNoticeHours === 24
        ? 'حجز مسبق (اليوم السابق)'
        : `حجز مسبق قبل ${Math.round(minNoticeHours / 24)} أيام`
    : minNoticeHours === 0
      ? 'Same-day booking available'
      : minNoticeHours === 24
        ? '24h advance notice (Day before)'
        : `${Math.round(minNoticeHours / 24)} days advance notice`

  const serviceReviewsCount =
    serviceReviews.length > 0 ? serviceReviews.length : Number(service.reviewsCount || 0)
  const serviceRatingValue =
    serviceReviews.length > 0
      ? Number(
        (
          serviceReviews.reduce(
            (sum, r) => sum + Number(r.serviceRating || r.expertRating || 5),
            0
          ) / serviceReviews.length
        ).toFixed(1)
      )
      : Number(service.rating || 0)

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
                <span className="rounded-full bg-surface border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {noticeLabel}
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
                {serviceReviewsCount > 0 && serviceRatingValue > 0 && (
                  <a
                    href="#service-feedback"
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300/80 px-3 py-1 text-xs font-bold text-primary hover:border-amber-400 transition"
                  >
                    <Star size={13} fill="currentColor" className="text-amber-500" />
                    <span>{serviceRatingValue.toFixed(1)}</span>
                    <span className="text-muted-foreground font-medium">
                      ({serviceReviewsCount} {isAr ? 'تقييم' : serviceReviewsCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </a>
                )}
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-primary leading-tight break-words">
                {displayTitle}
              </h1>

              {/* Service Thumbnail Banner */}
              <div className="mt-6 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#101F49] via-[#1c3575] to-[#2855C5] shadow-xs aspect-[16/9] max-h-80 w-full">
                {/* Fallback category placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white/90">
                  <div className="mb-2.5 flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xs">
                    <Sparkles size={26} className="text-[#F8C15C]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white/85">
                    {catLabel || typeLabel}
                  </span>
                </div>

                {thumbnailSrc && (
                  <img
                    src={thumbnailSrc}
                    alt={displayTitle}
                    className="relative z-10 h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget
                      if (
                        service.categorySlug &&
                        !target.src.includes(`/categories/${service.categorySlug}.png`)
                      ) {
                        target.src = `/categories/${service.categorySlug}.png`
                      } else {
                        target.style.display = 'none'
                      }
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>

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
                  </>
                )}

                {service.deliveryMode !== 'ONLINE' && (service.location?.address || service.location?.city) && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary shrink-0" />
                    <span>
                      {service.location.address || service.location.city}
                      {service.location.address && service.location.city ? `, ${service.location.city}` : ''}
                    </span>
                    {service.location.googleMapsUrl && (
                      <a
                        href={service.location.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-primary underline hover:text-primary/80 ms-1"
                      >
                        {isAr ? 'الخريطة ↗' : 'Map ↗'}
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Star
                    size={16}
                    fill={serviceReviewsCount > 0 && serviceRatingValue > 0 ? 'currentColor' : 'none'}
                    className={
                      serviceReviewsCount > 0 && serviceRatingValue > 0
                        ? 'text-amber-500 shrink-0'
                        : 'text-muted-foreground shrink-0'
                    }
                  />
                  {serviceReviewsCount > 0 && serviceRatingValue > 0 ? (
                    <a href="#service-feedback" className="font-bold text-primary hover:underline">
                      {serviceRatingValue.toFixed(1)}{' '}
                      <span className="font-normal text-muted-foreground">
                        ({serviceReviewsCount} {isAr ? 'تقييم للخدمة' : serviceReviewsCount === 1 ? 'service review' : 'service reviews'})
                      </span>
                    </a>
                  ) : (
                    <span>{isAr ? 'لا توجد تقييمات بعد' : 'No ratings yet'}</span>
                  )}
                </div>
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

              {/* What You Will Get / Key Outcomes */}
              {Array.isArray(service.whatYouWillGet) && service.whatYouWillGet.length > 0 && (
                <div className="mt-6 rounded-3xl border border-primary/15 bg-secondary/30 p-5 sm:p-6 space-y-3 shadow-2xs">
                  <h2 className="text-base font-bold text-primary flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">✓</span>
                    <span>{isAr ? 'ماذا ستستفيد / تجد في هذه الجلسة' : 'What you will get from this session'}</span>
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2 pt-1">
                    {service.whatYouWillGet.map((item: any, idx: number) => {
                      const text =
                        typeof item === 'string'
                          ? item
                          : isAr
                            ? item?.ar || item?.en || ''
                            : item?.en || item?.ar || ''
                      if (!text) return null
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-2xl bg-surface border border-border p-3 text-xs text-foreground shadow-2xs"
                        >
                          <span className="mt-1 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="leading-relaxed font-semibold">{text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Multi-Session Workshop Schedule & Syllabus Accordion */}
              {isEvent && Array.isArray(service.event?.sessions) && service.event.sessions.length > 0 && (
                <div className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-primary flex items-center gap-2">
                      <Calendar size={16} className="text-accent" />
                      <span>
                        {isAr
                          ? `جدول الجلسات (${service.event.sessions.length} جلسات)`
                          : `Workshop Schedule (${service.event.sessions.length} Sessions)`}
                      </span>
                    </h2>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {service.event.timezone || 'Africa/Cairo'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {service.event.sessions.map((sess: any, idx: number) => {
                      const sId = sess.id || `sess_${idx}`
                      const isOpen = openSessionId === sId || (openSessionId === null && idx === 0)
                      const sTitle = isAr
                        ? sess.title?.ar || sess.title?.en || `الجلسة ${idx + 1}`
                        : sess.title?.en || sess.title?.ar || `Session ${idx + 1}`
                      const sDesc = isAr
                        ? sess.description?.ar || sess.description?.en || ''
                        : sess.description?.en || sess.description?.ar || ''
                      return (
                        <div key={sId} className="rounded-2xl border border-border bg-background overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenSessionId(isOpen ? '' : sId)}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start hover:bg-secondary/30 transition"
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                                {isAr ? `الجلسة ${idx + 1}` : `Session ${idx + 1}`} · {sess.date} · {sess.startTime} – {sess.endTime}
                              </span>
                              <p className="text-xs sm:text-sm font-bold text-primary truncate mt-0.5">{sTitle}</p>
                            </div>
                            <ChevronRight
                              size={16}
                              className={`text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                            />
                          </button>
                          {isOpen && (sDesc || (Array.isArray(sess.includes) && sess.includes.length > 0)) && (
                            <div className="px-4 pb-4 pt-1 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
                              {sDesc && <p className="leading-relaxed whitespace-pre-line">{sDesc}</p>}
                              {Array.isArray(sess.includes) && sess.includes.length > 0 && (
                                <ul className="space-y-1 pt-1">
                                  {sess.includes.map((inc: any, iIdx: number) => {
                                    const incText = typeof inc === 'string' ? inc : isAr ? inc?.ar || inc?.en : inc?.en || inc?.ar
                                    if (!incText) return null
                                    return (
                                      <li key={iIdx} className="flex items-start gap-2 text-foreground">
                                        <span className="mt-1.5 size-1.5 rounded-full bg-accent shrink-0" />
                                        <span>{incText}</span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Workshop / Event Photo Gallery with Lightbox */}
              {isEvent && Array.isArray(service.event?.galleryUrls) && service.event.galleryUrls.length > 0 && (
                <div className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-3 shadow-2xs">
                  <h2 className="text-base font-bold text-primary">
                    {isAr ? 'معرض الصور' : 'Workshop Gallery'}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {service.event.galleryUrls.map((imgUrl: string, idx: number) => (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => setLightboxImage(imgUrl)}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-secondary group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`${displayTitle} gallery ${idx + 1}`}
                          className="size-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Webinar Post-Event Resources Notice */}
              {isEvent && (service.event?.hasRecording || (service.event?.materialsCount || 0) > 0) && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {isAr ? 'محتوى إضافي متاح للمسجلين المؤكدين' : 'Included for Confirmed Attendees'}
                    </p>
                    <p className="text-emerald-800/90 mt-0.5">
                      {service.event?.hasRecording && (service.event?.materialsCount || 0) > 0
                        ? isAr
                          ? 'يشمل هذا الحدث تسجيلاً للجلسة ومواد تدريبية قابلة للتحميل عبر حسابك بعد انتهاء الجلسة.'
                          : 'Includes session recording and downloadable materials in your Bok Bok account after the session.'
                        : service.event?.hasRecording
                          ? isAr
                            ? 'يشمل تسجيلاً للجلسة متاحاً للمسجلين المؤكدين عبر حسابك بعد انتهاء الجلسة.'
                            : 'Includes session recording accessible in your Bok Bok account after the session.'
                          : isAr
                            ? `يشمل ${service.event.materialsCount} ملفات/مواد تعليمية متاحة للمسجلين المؤكدين.`
                            : `Includes ${service.event.materialsCount} downloadable resource(s) for confirmed attendees.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Event Organizer Attendance Notes (Optional) */}
              {isEvent && service.event?.cancellationPolicy && (
                <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-xs space-y-1">
                  <p className="font-bold text-primary">
                    {isAr ? 'تعليمات إضافية من منظم الفعالية' : 'Organizer Attendance Notes'}
                  </p>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {isAr
                      ? service.event.cancellationPolicy.ar || service.event.cancellationPolicy.en
                      : service.event.cancellationPolicy.en || service.event.cancellationPolicy.ar}
                  </p>
                </div>
              )}

              {/* In-Person Venue & Directions Card */}
              {service.deliveryMode !== 'ONLINE' && service.location && (
                <div className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary border border-border shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-primary">
                          {isAr ? 'مقر وموقع الحضور' : 'In-Person Venue & Location'}
                        </h3>
                        <p className="text-xs text-foreground mt-0.5 font-medium">
                          {service.location.address || service.location.city}
                          {service.location.address && service.location.city ? `, ${service.location.city}` : ''}
                        </p>
                      </div>
                    </div>

                    {service.location.googleMapsUrl && (
                      <a
                        href={service.location.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 transition shadow-2xs shrink-0 self-start sm:self-auto"
                      >
                        <MapPin size={13} />
                        <span>{isAr ? 'فتح في خرائط جوجل ↗' : 'Open in Google Maps ↗'}</span>
                      </a>
                    )}
                  </div>

                  {service.location.addressDescription && (
                    <div className="rounded-2xl border border-border bg-background p-3.5 text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground block mb-0.5">
                        {isAr ? 'تفاصيل وإرشادات الوصول للمكان:' : 'Venue Directions & Access Notes:'}
                      </strong>
                      <p className="whitespace-pre-line">{service.location.addressDescription}</p>
                    </div>
                  )}
                </div>
              )}

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

            {/* Service Feedback & Reviews Section */}
            <div
              id="service-feedback"
              className="rounded-3xl border border-border bg-surface p-5 sm:p-7 shadow-xs min-w-0 w-full space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="text-lg font-bold text-primary">
                    {isAr ? 'تقييمات وآراء العملاء حول الخدمة' : 'Service Rating & Client Feedback'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr
                      ? 'تقييمات موثقة من عملاء حضروا هذه الجلسة بالفعل'
                      : 'Verified feedback from clients who completed this session'}
                  </p>
                </div>

                {serviceReviewsCount > 0 && serviceRatingValue > 0 && (
                  <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/70 border border-accent/40 px-4 py-2">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star size={18} fill="currentColor" />
                      <span className="text-xl font-black text-primary">
                        {serviceRatingValue.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      <span className="font-bold text-primary block">
                        {isAr ? 'تقييم الخدمة' : 'Service Rate'}
                      </span>
                      <span>
                        {serviceReviewsCount} {isAr ? 'تقييم موثق' : serviceReviewsCount === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {loadingReviews ? (
                <p className="text-xs text-muted-foreground py-4">
                  {isAr ? 'جاري تحميل التقييمات...' : 'Loading service feedback...'}
                </p>
              ) : serviceReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center space-y-1.5">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Star size={18} />
                  </div>
                  <p className="text-xs font-bold text-primary">
                    {isAr ? 'لا توجد تقييمات لهذه الخدمة حتى الآن' : 'No feedback for this service yet'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr
                      ? 'ستظهر تقييمات وآراء المستفيدين هنا فور إتمام الجلسات.'
                      : 'Client ratings and reviews will appear here after sessions are completed.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {serviceReviews.map((rev: any) => {
                    const ratingNum = Math.min(5, Math.max(1, Number(rev.serviceRating || rev.expertRating || 5)))
                    const feedbackText = rev.serviceReviewText || rev.expertReviewText || ''
                    const reviewerName = rev.clientName || (isAr ? 'عميل موثق' : 'Verified Client')
                    const initial = reviewerName.trim().charAt(0).toUpperCase() || 'C'
                    const dateStr = rev.createdAt
                      ? new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(rev.createdAt))
                      : ''

                    return (
                      <div
                        key={rev._id}
                        className="rounded-2xl border border-border bg-background p-4 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-primary truncate">{reviewerName}</p>
                              {dateStr && (
                                <p className="text-[11px] text-muted-foreground">{dateStr}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={13}
                                fill={i < ratingNum ? 'currentColor' : 'none'}
                                className={i < ratingNum ? 'text-amber-500' : 'text-border'}
                              />
                            ))}
                            <span className="ms-1 text-xs font-bold text-primary">
                              {ratingNum}.0
                            </span>
                          </div>
                        </div>

                        {feedbackText ? (
                          <p className="text-xs leading-relaxed text-foreground whitespace-pre-line break-words">
                            {feedbackText}
                          </p>
                        ) : (
                          <p className="text-[11px] italic text-muted-foreground">
                            {isAr ? 'تقييم بدون تعليق نصي' : 'Rated without written comment'}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Booking & Payment Card */}
          {(() => {
            const isFree = Number(price) <= 0
            const evStatus = service.event?.eventStatus || 'open'
            const evCapacity = service.event?.capacity || 0
            const evRegistered = service.event?.registeredCount || 0
            const evSpotsLeft = isEvent ? Math.max(0, evCapacity - evRegistered) : 1
            const evAllowWaitlist = service.event?.allowWaitlist !== false
            const isComingSoon = isEvent && evStatus === 'coming_soon'
            const isEventClosed = isEvent && evStatus === 'closed'
            const minNoticeHours = service.minNoticeHours !== undefined ? Number(service.minNoticeHours) : 0
            const eventStartMs = service.event?.date
              ? new Date(`${service.event.date}T${service.event.startTime || '23:59'}:00`).getTime()
              : 0
            const isEventCutoffPassed = Boolean(
              isEvent &&
              !isComingSoon &&
              eventStartMs > 0 &&
              minNoticeHours > 0 &&
              Date.now() > (eventStartMs - minNoticeHours * 3600000)
            )
            const isEventPast = Boolean(
              isEvent &&
              !isComingSoon &&
              eventStartMs > 0 &&
              eventStartMs < Date.now()
            )
            const isEventFull = isEvent && !isComingSoon && evCapacity > 0 && evSpotsLeft <= 0
            const isWaitlistMode = isEvent && (isComingSoon || (isEventFull && evAllowWaitlist))
            const isBlockedEvent = isEvent && (isEventClosed || isEventPast || isEventCutoffPassed || (isEventFull && !evAllowWaitlist))
            const showInstaPay = !isFree && !isWaitlistMode && !isBlockedEvent

            return (
              <aside className="sticky top-10 rounded-[32px] bg-primary p-5 sm:p-7 text-white shadow-xl min-w-0 w-full max-w-full">
                <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-5 min-w-0">
                  <div className="min-w-0">
                    {isFree ? (
                      <span className="inline-flex items-center gap-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-300">
                        {isAr ? 'مجاني' : 'Free'}
                      </span>
                    ) : (
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {price} {baseCurrency}
                      </span>
                    )}
                    <span className="ms-2 text-xs text-white/70">
                      {isEvent
                        ? isAr ? '/ مقعد حضور' : '/ attendee seat'
                        : isAr ? `/ جلسة ${service.durationMinutes} دقيقة` : `/ ${service.durationMinutes} min session`}
                    </span>
                  </div>
                  {isEvent && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${isComingSoon
                        ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                        : isBlockedEvent
                          ? 'bg-rose-400/20 text-rose-200 border border-rose-400/30'
                          : isEventFull
                            ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                            : 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                        }`}
                    >
                      {isComingSoon
                        ? isAr ? 'قريباً' : 'Coming Soon'
                        : isEventPast
                          ? isAr ? 'انتهى الحدث' : 'Ended'
                          : isEventCutoffPassed
                            ? isAr ? 'انتهت مهلة الحجز' : 'Cutoff Passed'
                            : isEventClosed
                              ? isAr ? 'مغلق' : 'Closed'
                              : isEventFull
                                ? isAr ? 'قائمة الانتظار' : 'Waitlist'
                                : isAr
                                  ? `${evSpotsLeft} مقاعد متبقية`
                                  : `${evSpotsLeft} spots left`}
                    </span>
                  )}
                </div>

                {/* Event Seat Progress Bar */}
                {isEvent && !isComingSoon && evCapacity > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-white/75">
                      <span>{isAr ? 'حالة المقاعد' : 'Seat Availability'}</span>
                      <span className="font-bold text-white">
                        {Math.min(evRegistered, evCapacity)} / {evCapacity} {isAr ? 'مسجل' : 'registered'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isEventFull ? 'bg-amber-400' : 'bg-accent'
                          }`}
                        style={{ width: `${Math.min(100, Math.round((evRegistered / evCapacity) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {booked ? (
                  <div className="mt-6 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 p-5 text-center space-y-3">
                    <span className="text-2xl">✓</span>
                    <h3 className="text-base font-bold text-emerald-300">
                      {bookingResultType === 'interest'
                        ? isAr ? 'تم تسجيل اهتمامك' : 'Added to Notification List'
                        : bookingResultType === 'waitlist'
                          ? isAr ? 'تمت إضافتك لقائمة الانتظار' : 'Added to Waitlist'
                          : bookingResultStatus === 'confirmed'
                            ? isAr ? 'تم تأكيد مقعدك!' : 'Seat Confirmed!'
                            : isAr ? 'تم استلام طلب التسجيل' : 'Registration Request Received'}
                    </h3>
                    <p className="text-xs text-white/90 leading-relaxed">{bookingSuccessMsg}</p>
                    <div className="rounded-xl bg-black/40 p-2.5 font-mono text-xs font-bold text-emerald-200">
                      {isAr ? 'رقم الحجز:' : 'Reference:'} {bookingReference}
                    </div>

                    {/* Confirmed Booking Refund Policy Snapshot */}
                    {(() => {
                      const policyDetails = formatRefundPolicyDetails(service.refundPolicy, isAr ? 'ar' : 'en')
                      return (
                        <div className="rounded-xl border border-white/20 bg-white/10 p-3.5 text-start space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            <ShieldCheck size={14} className="text-accent shrink-0" />
                            <span>{isAr ? 'سياسة الإلغاء والاسترداد للحجز' : 'Refund Policy Snapshot'}</span>
                          </div>
                          <p className="text-[11px] text-white/80 leading-relaxed">
                            {policyDetails.description}
                          </p>
                          <div className="pt-2 border-t border-white/15 space-y-1 text-[11px] text-white/85">
                            <p className="font-medium">• {policyDetails.fullRefundDeadline}</p>
                            <p className="font-medium">• {policyDetails.partialRefundDeadline}</p>
                            <p className="font-medium text-white/65">• {policyDetails.zeroRefundCondition}</p>
                          </div>
                          <p className="text-[10px] text-white/55 pt-1 italic">
                            {isAr
                              ? 'تم حفظ هذه النسخة من السياسة وتثبيتها مع حجزك ولن تتأثر بأي تعديلات مستقبلية للخدمة.'
                              : 'This exact policy snapshot is locked to your booking and remains unaffected by future service updates.'}
                          </p>
                        </div>
                      )
                    })()}
                    <p className="text-[11px] text-white/70">
                      {bookingResultType !== 'seat'
                        ? isAr
                          ? 'سنراسلك عبر البريد الإلكتروني فور توفر مقعد أو فتح باب التسجيل.'
                          : 'We will email you as soon as a spot opens up or registration begins.'
                        : isFree
                          ? bookingResultStatus === 'confirmed'
                            ? isAr
                              ? 'تم إرسال تفاصيل الجلسة ورابط الانضمام إلى بريدك الإلكتروني وحسابك.'
                              : 'Confirmation and session details have been sent to your email and account.'
                            : isAr
                              ? 'سيقوم الخبير أو الإدارة بمراجعة طلبك وإرسال تأكيد الحضور ورابط الجلسة عبر البريد الإلكتروني.'
                              : 'The host or admin team will review your request and email your confirmation and session link.'
                          : isAr
                            ? 'سيقوم فريقنا بالتحقق من تحويل إنستاباي وستصلك كافة التعليمات ورابط الجلسة عبر البريد الإلكتروني.'
                            : 'Our team will verify the InstaPay transfer and you will receive full instructions and calendar invite by email.'}
                    </p>
                  </div>
                ) : isBlockedEvent ? (
                  <div className="mt-6 rounded-2xl bg-white/5 border border-white/15 p-5 text-center space-y-2">
                    <p className="text-sm font-bold text-white">
                      {isEventPast
                        ? isAr ? 'انتهى موعد هذا الحدث' : 'This Event Has Ended'
                        : isEventCutoffPassed
                          ? isAr ? 'انتهت مهلة التسجيل المسبق في هذا الحدث' : 'Advance Registration Has Closed'
                          : isEventClosed
                            ? isAr ? 'التسجيل مغلق حالياً' : 'Registration Is Closed'
                            : isAr ? 'اكتمل العدد بالكامل' : 'Event Is Full'}
                    </p>
                    <p className="text-xs text-white/70">
                      {isAr
                        ? 'يمكنك تصفح ورش العمل والندوات القادمة المتاحة الآن.'
                        : 'Browse other upcoming workshops and webinars currently open for registration.'}
                    </p>
                    <Link
                      href={localeHref(service.bookingType === 'WORKSHOP' ? '/workshops' : '/webinars')}
                      className="inline-block mt-2 rounded-full bg-accent px-5 py-2 text-xs font-bold text-primary hover:bg-accent-hover transition"
                    >
                      {isAr ? 'تصفح الفعاليات القادمة' : 'Browse Upcoming Events'}
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5 min-w-0 w-full">
                    {/* Step 1: Schedule (if appointment) */}
                    {!isEvent && (
                      <>
                        <div className="min-w-0 w-full">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-accent">
                              {isAr ? '١. اختر التاريخ' : '1. Select Date'}
                            </label>
                            <div className="hidden sm:flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => scrollDates('prev')}
                                className="size-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/10 active:scale-95"
                                title={isAr ? 'السابق' : 'Previous dates'}
                                aria-label={isAr ? 'السابق' : 'Previous dates'}
                              >
                                {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollDates('next')}
                                className="size-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/10 active:scale-95"
                                title={isAr ? 'التالي' : 'Next dates'}
                                aria-label={isAr ? 'التالي' : 'Next dates'}
                              >
                                {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </div>
                          </div>
                          {loadingDays ? (
                            <p className="text-xs text-white/60">
                              {isAr ? 'جاري فحص المواعيد...' : 'Loading available dates...'}
                            </p>
                          ) : days.length === 0 ? (
                            <p className="text-xs text-white/60">
                              {isAr ? 'لا توجد مواعيد متاحة لهذه المدة.' : 'No available dates found for this duration.'}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {availableMonths.length > 1 && (
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMonth('all')}
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${selectedMonth === 'all'
                                      ? 'bg-accent text-primary shadow-2xs'
                                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                                      }`}
                                  >
                                    {isAr ? 'كل الشهور' : 'All'}
                                  </button>
                                  {availableMonths.map((m) => (
                                    <button
                                      key={m.key}
                                      type="button"
                                      onClick={() => setSelectedMonth(m.key)}
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${selectedMonth === m.key
                                        ? 'bg-accent text-primary shadow-2xs'
                                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                                        }`}
                                    >
                                      {m.label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div ref={datesScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full min-w-0 max-w-full scroll-smooth">
                                {visibleDays.map((d) => {
                                  const localeCode = isAr ? 'ar-EG' : 'en-US'
                                  const dateObj = new Date(d.date + 'T00:00:00')
                                  return (
                                    <button
                                      key={d.date}
                                      type="button"
                                      disabled={!d.hasSlots}
                                      onClick={() => setSelectedDate(d.date)}
                                      className={`shrink-0 rounded-2xl p-2.5 text-center transition min-w-[68px] ${selectedDate === d.date
                                        ? 'bg-accent text-primary font-bold shadow-xs'
                                        : d.hasSlots
                                          ? 'bg-white/10 text-white hover:bg-white/20'
                                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                                        }`}
                                    >
                                      <span className="block text-[10px] font-bold uppercase">
                                        {new Intl.DateTimeFormat(localeCode, { weekday: 'short' }).format(dateObj)}
                                      </span>
                                      <span className="block text-base font-black my-0.5">
                                        {dateObj.getDate()}
                                      </span>
                                      <span className="block text-[10px] font-semibold uppercase opacity-90">
                                        {new Intl.DateTimeFormat(localeCode, { month: 'short' }).format(dateObj)}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
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

                    {/* Additional Intake Questions from Expert */}
                    {Array.isArray(service.intakeQuestions) && service.intakeQuestions.length > 0 && (
                      <div className="border-t border-white/10 pt-4 space-y-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-accent">
                          {isEvent
                            ? isAr ? '٣. متطلبات وأسئلة إضافية من الخبير' : '3. Intake Questions from Expert'
                            : isAr ? '٤. متطلبات وأسئلة إضافية من الخبير' : '4. Intake Questions from Expert'}
                        </label>
                        <p className="text-[11px] text-white/70 leading-relaxed">
                          {isAr
                            ? 'يرجى تقديم الإجابات أو رفع الملفات المطلوبة أدناه للتحضير للجلسة:'
                            : 'Please provide answers or upload requested files to help the expert prepare for your session:'}
                        </p>

                        <div className="space-y-3 pt-1">
                          {service.intakeQuestions.map((q: any, idx: number) => {
                            const answerValue = intakeAnswers[q.id] || ''
                            const isUp = Boolean(uploadingIntake[q.id])

                            return (
                              <div
                                key={q.id || idx}
                                className="rounded-2xl border border-white/15 bg-white/5 p-3.5 space-y-2"
                              >
                                <label className="block text-xs font-bold text-white">
                                  {q.question} {q.required && <span className="text-amber-400">*</span>}
                                </label>

                                {q.type === 'string' ? (
                                  <textarea
                                    rows={2}
                                    value={answerValue}
                                    onChange={(e) =>
                                      setIntakeAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                                    }
                                    placeholder={isAr ? 'اكتب إجابتك هنا...' : 'Type your answer here...'}
                                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-accent"
                                  />
                                ) : q.type === 'pdf' ? (
                                  <div>
                                    {answerValue ? (
                                      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5">
                                        <a
                                          href={answerValue}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-bold text-emerald-300 hover:underline flex items-center gap-1.5 truncate"
                                        >
                                          <span className="truncate">{isAr ? 'عرض مستند PDF المرفق' : 'Attached PDF Document'} ↗</span>
                                        </a>
                                        <CloudinaryUploadWidget
                                          folder="bokbok/intake_docs"
                                          fallbackType="certificate"
                                          allowPdf={true}
                                          accept="application/pdf"
                                          onUploadStart={() =>
                                            setUploadingIntake((prev) => ({ ...prev, [q.id]: true }))
                                          }
                                          onSuccess={(res) => {
                                            setIntakeAnswers((prev) => ({
                                              ...prev,
                                              [q.id]: res.secureUrl || res.url,
                                            }))
                                            setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                          }}
                                          onError={() =>
                                            setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                          }
                                        >
                                          <button
                                            type="button"
                                            className="text-[11px] font-bold text-emerald-300 hover:text-white underline shrink-0 px-1"
                                          >
                                            {isAr ? 'تغيير' : 'Change'}
                                          </button>
                                        </CloudinaryUploadWidget>
                                      </div>
                                    ) : isUp ? (
                                      <div className="rounded-xl border border-dashed border-accent/60 bg-accent/10 p-3 text-center text-xs text-accent">
                                        {isAr ? 'جاري رفع ملف PDF...' : 'Uploading PDF...'}
                                      </div>
                                    ) : (
                                      <CloudinaryUploadWidget
                                        folder="bokbok/intake_docs"
                                        fallbackType="certificate"
                                        allowPdf={true}
                                        accept="application/pdf"
                                        onUploadStart={() =>
                                          setUploadingIntake((prev) => ({ ...prev, [q.id]: true }))
                                        }
                                        onSuccess={(res) => {
                                          setIntakeAnswers((prev) => ({
                                            ...prev,
                                            [q.id]: res.secureUrl || res.url,
                                          }))
                                          setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                        }}
                                        onError={() =>
                                          setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                        }
                                        className="w-full"
                                      >
                                        <div className="cursor-pointer rounded-xl border border-dashed border-white/25 bg-white/5 p-3 text-center transition hover:border-accent hover:bg-white/10">
                                          <p className="text-xs font-bold text-white hover:text-accent">
                                            {isAr ? '+ رفع مستند PDF' : '+ Upload PDF Document'}
                                          </p>
                                        </div>
                                      </CloudinaryUploadWidget>
                                    )}
                                  </div>
                                ) : (
                                  /* image */
                                  <div>
                                    {answerValue ? (
                                      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={answerValue}
                                            alt="Uploaded preview"
                                            className="size-10 rounded-lg object-cover border border-emerald-400/40 shrink-0"
                                          />
                                          <span className="text-xs font-bold text-emerald-300 truncate">
                                            {isAr ? '✓ تم إرفاق الصورة' : '✓ Image attached'}
                                          </span>
                                        </div>
                                        <CloudinaryUploadWidget
                                          folder="bokbok/intake_images"
                                          fallbackType="general"
                                          accept="image/*"
                                          onUploadStart={() =>
                                            setUploadingIntake((prev) => ({ ...prev, [q.id]: true }))
                                          }
                                          onSuccess={(res) => {
                                            setIntakeAnswers((prev) => ({
                                              ...prev,
                                              [q.id]: res.secureUrl || res.url,
                                            }))
                                            setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                          }}
                                          onError={() =>
                                            setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                          }
                                        >
                                          <button
                                            type="button"
                                            className="text-[11px] font-bold text-emerald-300 hover:text-white underline shrink-0 px-1"
                                          >
                                            {isAr ? 'تغيير' : 'Change'}
                                          </button>
                                        </CloudinaryUploadWidget>
                                      </div>
                                    ) : isUp ? (
                                      <div className="rounded-xl border border-dashed border-accent/60 bg-accent/10 p-3 text-center text-xs text-accent">
                                        {isAr ? 'جاري رفع ملف الصورة...' : 'Uploading image...'}
                                      </div>
                                    ) : (
                                      <CloudinaryUploadWidget
                                        folder="bokbok/intake_images"
                                        fallbackType="general"
                                        accept="image/*"
                                        onUploadStart={() =>
                                          setUploadingIntake((prev) => ({ ...prev, [q.id]: true }))
                                        }
                                        onSuccess={(res) => {
                                          setIntakeAnswers((prev) => ({
                                            ...prev,
                                            [q.id]: res.secureUrl || res.url,
                                          }))
                                          setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                        }}
                                        onError={() =>
                                          setUploadingIntake((prev) => ({ ...prev, [q.id]: false }))
                                        }
                                        className="w-full"
                                      >
                                        <div className="cursor-pointer rounded-xl border border-dashed border-white/25 bg-white/5 p-3 text-center transition hover:border-accent hover:bg-white/10">
                                          <p className="text-xs font-bold text-white hover:text-accent">
                                            {isAr ? '+ رفع ملف صورة' : '+ Upload Image File'}
                                          </p>
                                        </div>
                                      </CloudinaryUploadWidget>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 3: InstaPay Transfer Instructions (Paid seats only; Free & Waitlist skip payment) */}
                    {showInstaPay ? (
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
                                onUploadStart={() => setUploadingReceipt(true)}
                                onSuccess={(result) => {
                                  setReceiptUrl(result.url)
                                  setUploadingReceipt(false)
                                }}
                                onError={() => setUploadingReceipt(false)}
                              >
                                <button
                                  type="button"
                                  className="text-[11px] font-bold text-emerald-300 hover:text-white underline shrink-0 px-2 py-1"
                                >
                                  {isAr ? 'استبدال' : 'Replace'}
                                </button>
                              </CloudinaryUploadWidget>
                            </div>
                          ) : uploadingReceipt ? (
                            <div className="rounded-xl border border-dashed border-accent/60 bg-accent/10 p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                                <p className="text-xs font-bold text-accent">
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
                    ) : isWaitlistMode ? (
                      <div className="rounded-2xl bg-amber-500/15 border border-amber-400/30 p-3.5 text-xs text-amber-100 leading-relaxed">
                        {isComingSoon
                          ? isAr
                            ? 'هذا الحدث قادم قريباً! سجّل بياناتك بدون دفع وسنبلغك فور فتح باب التسجيل.'
                            : 'This event is Coming Soon! Leave your details (no payment required) and we will notify you as soon as registration opens.'
                          : isAr
                            ? 'اكتملت المقاعد حالياً — انضم لقائمة الانتظار مجاناً وسنبلغك فور توفر مقعد.'
                            : 'All seats are currently taken — join the waitlist (no payment needed) and we will notify you if a spot opens up.'}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/30 p-3.5 text-xs text-emerald-100 leading-relaxed">
                        {isAr
                          ? 'هذا الحدث مجاني بالكامل! لا حاجة لتحويل أو إيصال دفع — قدّم طلبك وسيتم مراجعته واعتماده عبر الخبير أو الإدارة.'
                          : 'This event is completely free! No payment or receipt is required — submit your registration request for host/admin approval.'}
                      </div>
                    )}

                    {/* Pre-Payment Cancellation & Refund Policy Clarity */}
                    {(() => {
                      const policyDetails = formatRefundPolicyDetails(service.refundPolicy, isAr ? 'ar' : 'en')
                      return (
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-3.5 text-start space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <ShieldCheck size={14} className="text-accent shrink-0" />
                            <span>{isAr ? 'شروط الإلغاء والاسترداد قبل الدفع' : 'Cancellation & Refund Terms'}</span>
                          </div>
                          <p className="text-[11px] text-white/80 leading-relaxed">
                            {policyDetails.description}
                          </p>
                          <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/15 text-[10px] text-center font-bold">
                            <div className="rounded-xl bg-white/10 p-1.5 text-white">
                              <div className="text-white">100%</div>
                              <div className="text-[9px] font-normal text-white/75">
                                {policyDetails.rules[0]?.minimumHoursBefore}h+
                              </div>
                            </div>
                            <div className="rounded-xl bg-white/10 p-1.5 text-white">
                              <div>50%</div>
                              <div className="text-[9px] font-normal text-white/75">
                                {policyDetails.rules[1]?.minimumHoursBefore}–{policyDetails.rules[0]?.minimumHoursBefore}h
                              </div>
                            </div>
                            <div className="rounded-xl bg-white/10 p-1.5 text-white/75">
                              <div>0%</div>
                              <div className="text-[9px] font-normal text-white/60">
                                &lt;{policyDetails.rules[1]?.minimumHoursBefore}h
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Submit Booking */}
                    <button
                      type="button"
                      disabled={
                        bookingLoading ||
                        uploadingReceipt ||
                        Object.values(uploadingIntake).some(Boolean) ||
                        (showInstaPay && !receiptUrl) ||
                        (!isEvent && (!selectedDate || !selectedTime))
                      }
                      onClick={handleBook}
                      className="w-full rounded-full bg-accent hover:bg-accent-hover py-3.5 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingLoading
                        ? (isAr ? 'جاري معالجة الطلب...' : 'Processing...')
                        : uploadingReceipt
                          ? (isAr ? 'جاري رفع إيصال الدفع...' : 'Uploading Receipt...')
                          : Object.values(uploadingIntake).some(Boolean)
                            ? (isAr ? 'جاري رفع الملفات المرفقة...' : 'Uploading files...')
                            : showInstaPay && !receiptUrl
                              ? (isAr ? 'يرجى إرفاق إيصال التحويل أولاً' : 'Upload Receipt to Proceed')
                              : isComingSoon
                                ? (isAr ? 'أبلغني عند فتح التسجيل' : 'Notify Me When Open')
                                : isEventFull
                                  ? (isAr ? 'انضم لقائمة الانتظار' : 'Join Waitlist')
                                  : isEvent && isFree
                                    ? (isAr ? 'تقديم طلب تسجيل مجاني' : 'Request Free Seat')
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
            )
          })()}
        </div>
      </div>

      {/* Lightbox Modal for Workshop Gallery */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Gallery preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 size-9 rounded-full bg-white text-primary font-bold shadow-lg hover:bg-secondary transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
