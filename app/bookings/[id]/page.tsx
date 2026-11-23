'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BrandLogo } from '@/components/brand/logo'
import { Video, Calendar, Clock, AlertCircle, CheckCircle, ArrowRight, ShieldCheck, UserCheck, XCircle, ChevronLeft, ChevronRight, Star, X, AlertTriangle } from 'lucide-react'
import type { TimeSlot, DayAvailability } from '@/lib/data/availability'
import { formatDateLabel, formatSlotLabel } from '@/lib/data/availability'
import { useLanguage } from '@/lib/i18n/language-context'
import { formatRefundPolicyDetails, calculateEligibleRefund } from '@/lib/services/refund-policies'

interface BookingDetailPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { isAr } = useLanguage()
  const unwrappedParams =
    typeof (params as any)?.then === 'function'
      ? use(params as Promise<{ id: string }>)
      : (params as { id: string })
  const bookingId = unwrappedParams.id

  const [token, setToken] = useState('')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Rescheduling states
  const [showReschedulePanel, setShowReschedulePanel] = useState(false)
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0)
  const [days, setDays] = useState<DayAvailability[]>([])
  const [loadingDays, setLoadingDays] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleMessage, setRescheduleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Attendance states
  const [attendanceResponse, setAttendanceResponse] = useState<'attended' | 'absent' | null>(null)
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [attendanceFeedback, setAttendanceFeedback] = useState<string | null>(null)
  const [syncingMeet, setSyncingMeet] = useState(false)
  const [showManualReportOverride, setShowManualReportOverride] = useState(false)

  // Post-session review window & popup modal states
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewPopupDismissed, setReviewPopupDismissed] = useState(false)
  const [expertRating, setExpertRating] = useState(5)
  const [expertReviewText, setExpertReviewText] = useState('')
  const [serviceRating, setServiceRating] = useState(5)
  const [serviceReviewText, setServiceReviewText] = useState('')
  const [platformFeedback, setPlatformFeedback] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)

  // Post-session dispute / issue / refund reporting modal states
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeCategory, setDisputeCategory] = useState<
    'no_show' | 'session_shortened' | 'technical_issue' | 'service_quality' | 'billing_payment' | 'other'
  >('session_shortened')
  const [disputeSubject, setDisputeSubject] = useState('')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)
  const [disputeError, setDisputeError] = useState<string | null>(null)
  const [disputeSuccess, setDisputeSuccess] = useState<string | null>(null)

  // Real-time clock to evaluate the 15-minute meeting link access window
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now())

  const rescheduleScrollRef = React.useRef<HTMLDivElement>(null)

  const scrollRescheduleDates = (direction: 'prev' | 'next') => {
    if (rescheduleScrollRef.current) {
      const forward = direction === 'next'
      const offset = 280
      if (isAr) {
        rescheduleScrollRef.current.scrollBy({ left: forward ? -offset : offset, behavior: 'smooth' })
      } else {
        rescheduleScrollRef.current.scrollBy({ left: forward ? offset : -offset, behavior: 'smooth' })
      }
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlToken = new URLSearchParams(window.location.search).get('token') || ''
      setToken(urlToken)
      fetchBooking(urlToken)
    }
  }, [bookingId])

  // Auto-open the review popup when the refund/problem period is over, nothing is on hold, and client hasn't reviewed yet
  useEffect(() => {
    if (
      booking &&
      booking.userRoleInView === 'client' &&
      booking.reviewEligibility?.isOpen &&
      !booking.hasReview &&
      !reviewPopupDismissed
    ) {
      setShowReviewModal(true)
    }
  }, [booking, reviewPopupDismissed])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking?._id) return

    setSubmittingReview(true)
    setReviewError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking._id,
          token: token || undefined,
          expertRating,
          expertReviewText,
          serviceRating,
          serviceReviewText,
          platformFeedback,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowReviewModal(false)
        setReviewPopupDismissed(true)
        setReviewSuccess(
          isAr
            ? 'شكراً لك! تم إرسال تقييمك بنجاح.'
            : 'Thank you! Your review has been submitted successfully.'
        )
        fetchBooking(token, { silent: true })
      } else {
        setReviewError(json.error || (isAr ? 'تعذر إرسال التقييم' : 'Failed to submit review'))
      }
    } catch (err: any) {
      setReviewError(err.message || (isAr ? 'خطأ في إرسال التقييم' : 'Error submitting review'))
    } finally {
      setSubmittingReview(false)
    }
  }

  // Automatically sync Google Meet telemetry (join/leave/duration) when user returns to this tab
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && bookingId) {
        const urlToken = new URLSearchParams(window.location.search).get('token') || token
        fetchBooking(urlToken, { silent: true, syncMeet: true })
      }
    }
    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [bookingId, token])

  const fetchBooking = async (
    currentToken: string,
    options?: { silent?: boolean; syncMeet?: boolean }
  ) => {
    if (!options?.silent) {
      setLoading(true)
      setError(null)
    }
    if (options?.syncMeet) {
      setSyncingMeet(true)
    }
    try {
      const url = new URL(`/api/bookings/${bookingId}`, window.location.origin)
      if (currentToken) url.searchParams.set('token', currentToken)
      if (options?.syncMeet) url.searchParams.set('syncMeet', '1')

      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success && json.data) {
        setBooking(json.data)
      } else if (!options?.silent) {
        setError(json.error || (isAr ? 'تعذر تحميل تفاصيل الحجز' : 'Failed to load booking details'))
      }
    } catch (err: any) {
      if (!options?.silent) {
        setError(err.message || (isAr ? 'خطأ في تحميل الحجز' : 'Error loading booking'))
      }
    } finally {
      if (!options?.silent) setLoading(false)
      if (options?.syncMeet) setSyncingMeet(false)
    }
  }

  // Load calendar days for rescheduling ONLY when the panel is opened (synced with expert availability)
  useEffect(() => {
    if (!showReschedulePanel || !booking || !booking.isRescheduleAllowed) return

    let ignore = false
    setLoadingDays(true)
    setSelectedDate('')
    setSelectedTime('')
    setSlots([])

    const serviceIdParam = booking.serviceId
      ? `&serviceId=${encodeURIComponent(booking.serviceId)}`
      : ''
    fetch(
      `/api/availability?expertId=${booking.expertId}&action=days&count=90&duration=${booking.durationMinutes || 45}${serviceIdParam}`,
      { cache: 'no-store' }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.days)) {
          setDays(data.days)
          const firstOpen = data.days.find((d: DayAvailability) => d.hasSlots)
          if (firstOpen) setSelectedDate(firstOpen.date)
        }
      })
      .finally(() => {
        if (!ignore) setLoadingDays(false)
      })

    return () => {
      ignore = true
    }
  }, [
    showReschedulePanel,
    booking?.expertId,
    booking?.isRescheduleAllowed,
    booking?.durationMinutes,
    booking?.serviceId,
    availabilityRefreshKey,
  ])

  // Load slots for selected reschedule date ONLY when the panel is open
  useEffect(() => {
    if (!showReschedulePanel || !selectedDate || !booking?.expertId) {
      setSlots([])
      return
    }

    let ignore = false
    setLoadingSlots(true)
    setSelectedTime('')

    const serviceIdParam = booking.serviceId
      ? `&serviceId=${encodeURIComponent(booking.serviceId)}`
      : ''
    const breakAfter = booking.breakAfterMinutes || 0
    fetch(
      `/api/availability?expertId=${booking.expertId}&action=slots&date=${selectedDate}&duration=${booking.durationMinutes || 45}&breakAfter=${breakAfter}${serviceIdParam}`,
      { cache: 'no-store' }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.slots)) {
          setSlots(data.slots)
          const firstAvailable = data.slots.find((s: TimeSlot) => s.available)
          if (firstAvailable) setSelectedTime(firstAvailable.time)
        }
      })
      .finally(() => {
        if (!ignore) setLoadingSlots(false)
      })

    return () => {
      ignore = true
    }
  }, [
    showReschedulePanel,
    selectedDate,
    booking?.expertId,
    booking?.durationMinutes,
    booking?.breakAfterMinutes,
    booking?.serviceId,
    availabilityRefreshKey,
  ])

  const handleRescheduleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      setRescheduleMessage({
        type: 'error',
        text: isAr ? 'يرجى اختيار تاريخ وموعد جديد للجلسة.' : 'Please select both a new date and a time slot.',
      })
      return
    }

    setRescheduling(true)
    setRescheduleMessage(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: selectedDate,
          newTime: selectedTime,
          reason: rescheduleReason,
          token,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setShowReschedulePanel(false)
        setRescheduleReason('')
        setRescheduleMessage({
          type: 'success',
          text: isAr
            ? `تمت إعادة جدولة الجلسة بنجاح إلى ${selectedDate} في تمام ${selectedTime}! تم إخطار الطرفين عبر البريد الإلكتروني.`
            : `Session successfully rescheduled to ${selectedDate} at ${selectedTime}! Both parties have been notified by email.`,
        })
        fetchBooking(token)
      } else {
        setRescheduleMessage({
          type: 'error',
          text: json.error || (isAr ? 'فشلت إعادة جدولة الحجز' : 'Failed to reschedule booking'),
        })
      }
    } catch (err: any) {
      setRescheduleMessage({
        type: 'error',
        text: err.message || (isAr ? 'خطأ في إعادة الجدولة' : 'Error rescheduling session'),
      })
    } finally {
      setRescheduling(false)
    }
  }

  const handleAttendanceSubmit = async (response: 'attended' | 'absent') => {
    setSubmittingAttendance(true)
    setAttendanceFeedback(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/attendance?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response,
          notes: attendanceNotes,
          token,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setAttendanceFeedback(
          json.message ||
            (isAr ? 'تم تسجيل حضور الجلسة بنجاح. شكراً لك!' : 'Attendance response recorded. Thank you!')
        )
        // If client explicitly confirmed session completed with no problem, open review popup immediately!
        if (response === 'attended' && booking?.userRoleInView === 'client' && !booking?.hasReview) {
          setReviewPopupDismissed(false)
          setShowReviewModal(true)
        }
        fetchBooking(token)
      } else {
        alert(json.error || (isAr ? 'تعذر تسجيل الحضور' : 'Failed to submit attendance'))
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'خطأ أثناء تسجيل الحضور' : 'Error submitting attendance'))
    } finally {
      setSubmittingAttendance(false)
    }
  }

  const openDisputeModal = (
    defaultCat:
      | 'no_show'
      | 'session_shortened'
      | 'technical_issue'
      | 'service_quality'
      | 'billing_payment'
      | 'other' = 'session_shortened'
  ) => {
    setDisputeCategory(defaultCat)
    setDisputeSubject(
      isAr
        ? `بلاغ/نزاع بخصوص جلسة ${booking?.reference || ''}`
        : `Dispute / Issue Report for Booking ${booking?.reference || ''}`
    )
    setDisputeDescription('')
    setDisputeError(null)
    setShowDisputeModal(true)
  }

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking?._id) return

    setSubmittingDispute(true)
    setDisputeError(null)
    try {
      const res = await fetch('/api/account/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking._id,
          token: token || undefined,
          category: disputeCategory,
          subject: disputeSubject,
          description: disputeDescription,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowDisputeModal(false)
        setDisputeSuccess(
          isAr
            ? 'تم استلام بلاغك وطلب المراجعة بنجاح. تم تعليق الجلسة مؤقتاً لحين مراجعة الإدارة.'
            : 'Your dispute/issue report has been submitted. The booking is now on hold for admin review.'
        )
        fetchBooking(token, { silent: true })
      } else {
        setDisputeError(json.error || (isAr ? 'تعذر إرسال البلاغ' : 'Failed to submit dispute report'))
      }
    } catch (err: any) {
      setDisputeError(err.message || (isAr ? 'خطأ أثناء إرسال البلاغ' : 'Error submitting dispute report'))
    } finally {
      setSubmittingDispute(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-sm font-bold text-muted-foreground">
          {isAr ? 'جاري تحميل تفاصيل الحجز...' : 'Loading booking details...'}
        </p>
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-3xl border border-border bg-surface p-8 shadow-xs">
          <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-primary">{isAr ? 'تعذر الوصول' : 'Access Restricted'}</h1>
          <p className="mt-2 text-xs text-muted-foreground">{error || (isAr ? 'رابط الحجز غير صالح أو منتهي الصلاحية.' : 'This booking link is invalid or expired.')}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-primary hover:bg-accent-hover transition shadow-xs"
          >
            {isAr ? 'الذهاب للرئيسية' : 'Go to Bok Bok Home'}
          </Link>
        </div>
      </main>
    )
  }

  const isOnline = booking.deliveryMode !== 'IN_PERSON'
  const deadlinePassed = !booking.isRescheduleAllowed
  const sessionPassed = new Date(currentTime) >= new Date(booking.sessionEndAt || `${booking.date}T${booking.time}`)

  // 15-minute access calculation for Google Meet link
  const sessionStartTime = booking.sessionStartAt
    ? new Date(booking.sessionStartAt).getTime()
    : booking.date && booking.time
      ? new Date(`${booking.date}T${booking.time}`).getTime()
      : 0
  const sessionEndTime = booking.sessionEndAt
    ? new Date(booking.sessionEndAt).getTime()
    : sessionStartTime + (booking.durationMinutes || 45) * 60000

  const msUntilStart = sessionStartTime - currentTime
  const isSessionStarted = currentTime >= sessionStartTime
  const isWithin15Minutes = msUntilStart <= 15 * 60 * 1000
  const isSessionEnded = currentTime > sessionEndTime
  const isLinkAccessible =
    isWithin15Minutes && !isSessionEnded && Boolean(booking.hasMeetLink || booking.googleMeetLink)

  const serviceTitle = isAr
    ? booking.serviceTitle?.ar || booking.serviceTitle?.en || 'جلسة استشارية'
    : booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      {/* <header className="border-b border-border bg-surface sticky top-0 z-30 px-5 sm:px-8">
        <div className="mx-auto max-w-5xl h-16 flex items-center justify-between">
          <BrandLogo href="/" size="sm" subtitle={isAr ? 'إدارة المواعيد والجلسات' : 'Booking & Meeting Hub'} />
          <span className="font-mono text-xs font-bold text-primary bg-secondary px-3 py-1.5 rounded-full border border-accent/30">
            {isAr ? 'رقم الحجز: ' : 'Ref #'}
            {booking.reference || booking._id?.slice(-6).toUpperCase()}
          </span>
        </div>
      </header> */}

      <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        {/* Booking Card */}
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-primary bg-secondary px-3 py-1.5 rounded-full border border-accent/30">
              {isAr ? 'رقم الحجز: ' : 'Ref #'}
              {booking.reference || booking._id?.slice(-6).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                {booking.serviceImage || booking.expertImage ? (
                  <Image
                    src={booking.serviceImage || booking.expertImage}
                    alt={typeof serviceTitle === 'string' ? serviceTitle : 'Service image'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-xs font-bold text-primary">
                    {isOnline ? <Video size={20} /> : <Calendar size={20} />}
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {isOnline
                    ? isAr ? 'جلسة فيديو عبر جوجل ميت' : 'Online Google Meet Session'
                    : isAr ? 'استشارة حضورية' : 'In-Person Consultation'}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-primary mt-0.5">
                  {serviceTitle}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  {booking.expertImage && (
                    <span className="relative inline-block size-4 shrink-0 overflow-hidden rounded-full bg-secondary">
                      <Image src={booking.expertImage} alt={booking.expertName} fill className="object-cover" />
                    </span>
                  )}
                  <span>
                    {isAr ? 'مع الخبير ' : 'With '}
                    <strong className="text-foreground">{booking.expertName}</strong>
                    {booking.expertRole ? ` · ${booking.expertRole}` : ''}
                  </span>
                </p>
              </div>
            </div>

            <div className="text-start sm:text-end">
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${booking.status === 'confirmed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : booking.status === 'awaiting_verification'
                    ? 'bg-amber-100 text-amber-800'
                    : booking.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-neutral-100 text-neutral-800'
                  }`}
              >
                {booking.status === 'confirmed'
                  ? isAr ? 'مؤكد' : 'Confirmed'
                  : booking.status === 'awaiting_verification'
                    ? isAr ? 'قيد التحقق من التحويل' : 'Verification Pending'
                    : booking.status}
              </span>
              <p className="text-xs font-bold text-primary mt-1.5">
                {booking.amount} {isAr ? 'ج.م' : booking.currency}
              </p>
            </div>
          </div>

          {/* Session Overview Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isAr ? 'تاريخ الجلسة' : 'Session Date'}
              </span>
              <p className="text-base font-bold text-primary mt-1">{booking.date}</p>
              <p className="text-[11px] text-muted-foreground">{formatDateLabel(booking.date)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isAr ? 'توقيت الجلسة' : 'Session Time'}
              </span>
              <p className="text-base font-bold text-primary mt-1">{booking.time}</p>
              <p className="text-[11px] text-muted-foreground">
                {booking.durationMinutes} {isAr ? 'دقيقة · توقيت القاهرة' : `minutes · ${booking.timezone || 'Cairo'}`}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isAr ? 'بيانات المستفيد' : 'Client'}
              </span>
              <p className="text-base font-bold text-primary mt-1 truncate">{booking.clientName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {isAr ? 'حجز مؤكد عبر بوك بوك' : 'Verified Bok Bok Booking'}
              </p>
            </div>
          </div>

          {/* SECTION 1: Google Meet Access */}
          {isOnline && (
            <div className="mt-6 pt-6 border-t border-border">
              <div
                className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${isLinkAccessible
                  ? 'bg-teal-50 border-teal-200'
                  : isSessionEnded
                    ? 'bg-neutral-50 border-neutral-200 opacity-80'
                    : 'bg-secondary/20 border-accent/30'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isLinkAccessible
                      ? 'bg-teal-700 text-white'
                      : isSessionEnded
                        ? 'bg-neutral-400 text-white'
                        : 'bg-primary text-white'
                      }`}
                  >
                    <Video size={20} />
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-bold ${isLinkAccessible
                        ? 'text-teal-900'
                        : isSessionEnded
                          ? 'text-neutral-700'
                          : 'text-primary'
                        }`}
                    >
                      {isAr ? 'رابط مكالمة جوجل ميت' : 'Google Meet Room Access'}
                    </h3>
                    {isSessionEnded ? (
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {isAr ? 'انتهت هذه الجلسة.' : 'This session has concluded.'}
                      </p>
                    ) : isLinkAccessible ? (
                      <p className="text-xs text-teal-800 mt-0.5 font-medium">
                        {isAr
                          ? 'غرفة الاجتماع مفتوحة الآن! انقر للانضمام إلى المكالمة.'
                          : 'Your meeting room is open now! Click the button to join the call.'}
                      </p>
                    ) : booking.status !== 'confirmed' ? (
                      <p className="text-xs text-amber-800 mt-0.5">
                        {isAr
                          ? 'سيتم تفعيل رابط الاجتماع فور اعتماد الحجز وتأكيد الدفع.'
                          : 'The meeting link will be activated once the booking is verified and confirmed.'}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isAr
                          ? 'تم تجهيز رابط الغرفة، وسيكون متاحاً للانضمام قبل موعد الجلسة بـ 15 دقيقة.'
                          : 'Your meeting room is configured and will become accessible 15 minutes before the session starts.'}
                      </p>
                    )}
                  </div>
                </div>

                {isSessionEnded ? (
                  <span className="text-xs font-bold text-neutral-600 bg-neutral-200/70 px-3.5 py-1.5 rounded-full shrink-0 text-center select-none">
                    {isAr ? 'الجلسة منتهية' : 'Session Ended'}
                  </span>
                ) : isLinkAccessible ? (
                  <a
                    href={
                      booking.meetJoinUrl ||
                      `/api/bookings/${booking._id}/join${token ? `?token=${encodeURIComponent(token)}` : ''
                      }`
                    }
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setTimeout(() => fetchBooking(token), 1500)
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition shrink-0"
                  >
                    {isAr ? 'انضم للمكالمة الآن ↗' : 'Join Google Meet Now ↗'}
                  </a>
                ) : (
                  <div className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary/80 border border-accent/40 px-3.5 py-2 text-xs font-bold text-primary shrink-0 select-none">
                    <Clock size={13} className="text-accent" />
                    <span>{isAr ? 'يتاح قبل الجلسة بـ 15 دقيقة' : 'Available 15m Before Session'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Rescheduling System (1-on-1 Appointments only; collapsed until clicked) */}
        {booking.bookingType !== 'WORKSHOP' && booking.bookingType !== 'WEBINAR' && (
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-primary">
                  {isAr ? 'إعادة جدولة الجلسة' : 'Reschedule Session'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? (
                    <>سياسة إعادة الجدولة: يُسمح بالتغيير حتى <strong>{booking.rescheduleDeadlineHours || 24} ساعة</strong> قبل بدء الجلسة.</>
                  ) : (
                    <>Expert Rescheduling Policy: Changes allowed up to <strong>{booking.rescheduleDeadlineHours || 24} hours</strong> before session.</>
                  )}
                </p>
              </div>

              {!deadlinePassed && (
                <div className="flex items-center gap-2 shrink-0">
                  {showReschedulePanel ? (
                    <>
                      <button
                        type="button"
                        disabled={loadingDays || loadingSlots}
                        onClick={() => setAvailabilityRefreshKey((k) => k + 1)}
                        className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-primary hover:bg-secondary/60 transition disabled:opacity-50"
                      >
                        {loadingDays || loadingSlots
                          ? (isAr ? 'جاري التحديث...' : 'Syncing...')
                          : (isAr ? 'تحديث المواعيد' : 'Sync Availability')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReschedulePanel(false)}
                        className="rounded-full border border-border bg-secondary px-4 py-2 text-xs font-bold text-primary hover:bg-border transition"
                      >
                        {isAr ? 'إغلاق' : 'Close'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleMessage(null)
                        setShowReschedulePanel(true)
                      }}
                      className="rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-primary hover:bg-accent-hover transition shadow-xs"
                    >
                      {isAr ? 'إعادة جدولة الجلسة' : 'Reschedule Session'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {rescheduleMessage && (
              <div
                className={`rounded-2xl border p-4 text-xs font-semibold ${rescheduleMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
              >
                {rescheduleMessage.text}
              </div>
            )}

            {deadlinePassed ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3.5">
                <AlertCircle size={20} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    {isAr ? 'انتهت المهلة المسموحة لإعادة الجدولة' : 'Rescheduling Deadline Has Passed'}
                  </p>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {isAr
                      ? `وفقاً لسياسة الخبير، لا يمكن تقديم طلب إعادة جدولة قبل أقل من ${booking.rescheduleDeadlineHours || 24} ساعة من الموعد.`
                      : `Per the expert's configured policy, clients cannot submit new rescheduling requests less than ${booking.rescheduleDeadlineHours || 24} hours before the scheduled session start.`}
                  </p>
                </div>
              </div>
            ) : showReschedulePanel ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-primary">
                      {isAr ? '١. اختر التاريخ الجديد' : '1. Select New Date'}
                    </label>
                    <div className="hidden sm:flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollRescheduleDates('prev')}
                        className="size-7 rounded-xl bg-secondary hover:bg-border text-primary flex items-center justify-center transition border border-border active:scale-95"
                        title={isAr ? 'السابق' : 'Previous dates'}
                        aria-label={isAr ? 'السابق' : 'Previous dates'}
                      >
                        {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollRescheduleDates('next')}
                        className="size-7 rounded-xl bg-secondary hover:bg-border text-primary flex items-center justify-center transition border border-border active:scale-95"
                        title={isAr ? 'التالي' : 'Next dates'}
                        aria-label={isAr ? 'التالي' : 'Next dates'}
                      >
                        {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>
                  {loadingDays ? (
                    <p className="text-xs text-muted-foreground">{isAr ? 'جاري فحص المواعيد...' : 'Loading available dates...'}</p>
                  ) : days.filter((d) => d.hasSlots).length === 0 ? (
                    <p className="text-xs text-rose-600">
                      {isAr ? 'لا توجد تواريخ متاحة حالياً في جدول الخبير.' : 'No available dates currently open in the expert schedule.'}
                    </p>
                  ) : (
                    <div ref={rescheduleScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
                      {days.map((d) => {
                        const dateObj = new Date(d.date + 'T00:00:00')
                        return (
                          <button
                            key={d.date}
                            type="button"
                            disabled={!d.hasSlots}
                            onClick={() => setSelectedDate(d.date)}
                            className={`shrink-0 rounded-2xl p-2.5 text-center transition min-w-[68px] border ${selectedDate === d.date
                              ? 'bg-accent text-primary border-accent shadow-xs font-bold'
                              : d.hasSlots
                                ? 'bg-background text-primary border-border hover:border-primary'
                                : 'bg-neutral-100 text-neutral-400 border-transparent cursor-not-allowed'
                              }`}
                          >
                            <span className="block text-[10px] font-bold uppercase">
                              {new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' }).format(dateObj)}
                            </span>
                            <span className="block text-base font-black my-0.5">{dateObj.getDate()}</span>
                            <span className="block text-[10px] font-semibold uppercase opacity-80">
                              {new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { month: 'short' }).format(dateObj)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-xs font-bold text-primary mb-2">
                      {isAr ? `٢. اختر التوقيت الجديد (${formatDateLabel(selectedDate)})` : `2. Select New Time Slot (${formatDateLabel(selectedDate)})`}
                    </label>
                    {loadingSlots ? (
                      <p className="text-xs text-muted-foreground">{isAr ? 'جاري تحميل المواعيد...' : 'Loading available slots...'}</p>
                    ) : slots.length === 0 ? (
                      <p className="text-xs text-rose-600">{isAr ? 'لا توجد مواعيد شاغرة في هذا اليوم.' : 'No open slots on this day.'}</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                        {slots.map((s) => (
                          <button
                            key={s.time}
                            type="button"
                            disabled={!s.available}
                            onClick={() => setSelectedTime(s.time)}
                            className={`rounded-xl py-2 px-2 text-xs font-bold border transition ${selectedTime === s.time
                              ? 'bg-accent text-primary border-accent shadow-xs'
                              : s.available
                                ? 'bg-background text-primary border-border hover:border-accent hover:bg-secondary/30'
                                : 'bg-neutral-100 text-neutral-400 border-transparent line-through cursor-not-allowed'
                              }`}
                          >
                            {formatSlotLabel(s.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    {isAr ? 'سبب إعادة الجدولة (اختياري)' : 'Reason for Rescheduling (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مثال: ظرف طارئ، تعارض في المواعيد' : 'e.g. Schedule conflict, work emergency'}
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!selectedTime || rescheduling}
                    onClick={handleRescheduleSubmit}
                    className="rounded-full bg-accent px-6 py-3 text-xs font-bold text-primary hover:bg-accent-hover transition disabled:opacity-40 shadow-xs"
                  >
                    {rescheduling
                      ? (isAr ? 'جاري إعادة الجدولة...' : 'Rescheduling...')
                      : (isAr ? `تأكيد إعادة الجدولة إلى ${selectedDate || ''} في ${selectedTime || ''}` : `Confirm Reschedule to ${selectedDate || ''} at ${selectedTime || ''}`)}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Reschedule History */}
            {booking.rescheduleHistory && booking.rescheduleHistory.length > 0 && (
              <div className="pt-6 border-t border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                  {isAr ? 'سجل التعديلات السابقة' : 'Reschedule History'}
                </span>
                <div className="space-y-2">
                  {booking.rescheduleHistory.map((h: any, idx: number) => (
                    <div key={idx} className="rounded-xl bg-background border border-border p-3 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary">
                          {isAr ? 'تم التعديل من ' : 'Changed from '}
                          <del>{h.previousDate} {h.previousTime}</del>
                          {isAr ? ' إلى ' : ' to '}
                          <strong>{h.newDate} {h.newTime}</strong>
                        </p>
                        {h.reason && <p className="text-[11px] text-muted-foreground mt-0.5">{h.reason}</p>}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{h.changedByRole}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION: Cancellation & Refund Policy Snapshot */}
        {(() => {
          const snapshot = booking.refundPolicy
          const policyDetails = formatRefundPolicyDetails(snapshot, isAr ? 'ar' : 'en')
          const calculation = calculateEligibleRefund({
            policy: snapshot,
            sessionStartAt: booking.sessionStartAt || booking.date,
            totalAmount: booking.amount,
          })

          const isPastSession = booking.sessionEndAt ? new Date() > new Date(booking.sessionEndAt) : false
          const isCancelledBooking = booking.status === 'cancelled' || booking.status === 'rejected'

          return (
            <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary border border-border shrink-0">
                    <ShieldCheck size={22} className="text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-primary">
                    {isAr ? 'وثيقة سياسة الإلغاء والاسترداد المطبقة' : 'Booking Refund Policy Snapshot'}
                  </h2>
                </div>

                <div className="text-start sm:text-end">
                  <span className="inline-block rounded-full bg-secondary border border-border px-3 py-1 text-xs font-bold text-primary">
                    {isAr ? 'نسخة مثبتة ومحفوظة مع الحجز' : 'Immutable Snapshot'}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
                {policyDetails.description}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span className="size-2 rounded-full bg-accent shrink-0" />
                    <span>{isAr ? 'استرداد كامل 100%' : '100% Full Refund'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {policyDetails.fullRefundDeadline}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span className="size-2 rounded-full bg-primary/60 shrink-0" />
                    <span>{isAr ? 'استرداد جزئي 50%' : '50% Partial Refund'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {policyDetails.partialRefundDeadline}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span>{isAr ? 'لا يوجد استرداد 0%' : '0% No Refund'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {policyDetails.zeroRefundCondition}
                  </p>
                </div>
              </div>

              {/* Real-time Eligible Refund Calculation Box */}
              {!isCancelledBooking && !isPastSession && (
                <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-primary shrink-0" />
                      <span className="text-xs font-bold text-primary">
                        {isAr ? 'حالة الاسترداد اللحظية في حال الإلغاء الآن:' : 'Real-time cancellation refund estimate:'}
                      </span>
                    </div>
                    <span className="text-xs font-black text-primary">
                      {calculation.refundPercentage}% ({calculation.refundAmount} {booking.currency || 'EGP'})
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isAr ? calculation.summaryTextAr : calculation.summaryTextEn}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground italic">
                {isAr
                  ? 'ملاحظة هامة: يحتفظ هذا الحجز بالسياسة المحددة وقت إنشائه ودفع قيمته ولا يتأثر بأي تغيير يجريه الخبير لاحقاً على الخدمة.'
                  : 'Important notice: This booking preserves the exact refund policy active when the booking was created and paid for, completely protected from future edits by the expert.'}
              </p>
            </div>
          )
        })()}

        {/* SECTION 3: Post-Session Attendance Confirmation */}
        <div id="attendance" className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-primary">
                {isAr ? 'تأكيد حضور الجلسة' : 'Session Attendance Confirmation'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr
                  ? 'تتبع تلقائي لدخول ومغادرة الاجتماع ومدته عبر Google Meet API مع تأكيد الحضور.'
                  : 'Automatic Google Meet entry, leave time & duration telemetry with mutual confirmation.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isOnline && booking.googleMeetLink && isWithin15Minutes && (
                <button
                  type="button"
                  disabled={syncingMeet}
                  onClick={() => fetchBooking(token, { silent: true, syncMeet: true })}
                  className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold text-primary hover:bg-secondary/60 transition disabled:opacity-50"
                >
                  {syncingMeet
                    ? isAr
                      ? 'جاري مزامنة بيانات ميت...'
                      : 'Syncing Meet API...'
                    : isAr
                      ? 'تحديث بيانات الدخول والمغادرة ↻'
                      : 'Sync Meet Entry/Leave ↻'}
                </button>
              )}
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${booking.attendanceStatus === 'completed' ||
                  (booking.meetingJoins?.client?.firstJoinedAt &&
                    booking.meetingJoins?.expert?.firstJoinedAt)
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : booking.attendanceStatus === 'disputed'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-secondary text-primary border border-accent/30'
                  }`}
              >
                {booking.attendanceStatus === 'completed' ||
                  (booking.meetingJoins?.client?.firstJoinedAt &&
                    booking.meetingJoins?.expert?.firstJoinedAt)
                  ? isAr
                    ? 'مكتملة (حضر الطرفان)'
                    : 'Verified · Both Joined'
                  : booking.attendanceStatus || 'pending'}
              </span>
            </div>
          </div>

          {/* Real-Time Meeting Room Entry & Leave Telemetry */}
          {isOnline && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(['client', 'expert'] as const).map((roleKey) => {
                const isClientCard = roleKey === 'client'
                const joinInfo = isClientCard
                  ? booking.meetingJoins?.client
                  : booking.meetingJoins?.expert
                const reportInfo = isClientCard
                  ? booking.clientAttendanceReport
                  : booking.expertAttendanceReport
                const displayName = isClientCard ? booking.clientName : booking.expertName

                const allParticipants = booking.googleMeetTelemetry?.participants || []
                const roleParticipants = allParticipants.filter((p: any) => {
                  if (p.matchedRole) return p.matchedRole === roleKey
                  const targetName = isClientCard ? booking.clientName : booking.expertName
                  if (!targetName) return false
                  const pName = (p.displayName || '').toLowerCase().trim()
                  const tName = targetName.toLowerCase().trim()
                  return pName && (pName.includes(tName) || tName.includes(pName))
                })

                const totalJoins = Math.max(
                  joinInfo?.joinCount || 0,
                  roleParticipants.reduce(
                    (acc: number, p: any) => acc + (p.sessionsCount || 1),
                    0,
                  ),
                  roleParticipants.length,
                )

                const hasEntered =
                  Boolean(joinInfo?.firstJoinedAt) ||
                  roleParticipants.length > 0 ||
                  reportInfo?.response === 'attended'

                return (
                  <div
                    key={roleKey}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${hasEntered
                      ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20'
                      : 'border-border bg-background'
                      }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isClientCard
                              ? isAr
                                ? 'سجل حضور المستفيد (العميل)'
                                : 'Client Meeting Telemetry'
                              : isAr
                                ? 'سجل حضور الخبير'
                                : 'Expert Meeting Telemetry'}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-primary">{displayName}</p>
                            {totalJoins > 1 && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">
                                {isAr
                                  ? totalJoins === 2
                                    ? 'انضم مرتين'
                                    : `انضم ${totalJoins} مرات`
                                  : `Joined ${totalJoins} times`}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasEntered ? (
                          <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Clock size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                        )}
                      </div>

                      {hasEntered && (joinInfo?.firstJoinedAt || roleParticipants.length > 0) ? (
                        <div className="mt-2.5 space-y-1 text-[11px] text-muted-foreground">
                          <p>
                            <strong className="text-primary">
                              {totalJoins > 1
                                ? isAr
                                  ? 'وقت أول دخول:'
                                  : 'First entered:'
                                : isAr
                                  ? 'وقت الدخول:'
                                  : 'Entered:'}
                            </strong>{' '}
                            {new Date(
                              joinInfo?.firstJoinedAt || roleParticipants[0]?.joinedAt,
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p>
                            <strong className="text-primary">
                              {totalJoins > 1
                                ? isAr
                                  ? 'وقت آخر مغادرة:'
                                  : 'Last left:'
                                : isAr
                                  ? 'وقت المغادرة:'
                                  : 'Left:'}
                            </strong>{' '}
                            {joinInfo?.inMeetingNow ||
                            roleParticipants.some((p: any) => p.isActive) ? (
                              <span className="text-emerald-700 font-semibold">
                                {isAr ? 'متواجد في المكالمة الآن' : 'Active in call now'}
                              </span>
                            ) : joinInfo?.leftAt ? (
                              new Date(joinInfo.leftAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            ) : roleParticipants[roleParticipants.length - 1]?.leftAt ? (
                              new Date(
                                roleParticipants[roleParticipants.length - 1].leftAt,
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            ) : (
                              <span className="italic">
                                {isAr
                                  ? 'بانتظار انتهاء المكالمة / مزامنة Google Meet'
                                  : 'Pending call end / Meet API sync'}
                              </span>
                            )}
                          </p>
                          {(joinInfo?.durationMinutes !== undefined ||
                            roleParticipants.length > 0) && (
                            <p>
                              <strong className="text-primary">
                                {totalJoins > 1
                                  ? isAr
                                    ? 'إجمالي مدة التواجد:'
                                    : 'Total duration in call:'
                                  : isAr
                                    ? 'مدة التواجد:'
                                    : 'Duration in call:'}
                              </strong>{' '}
                              {joinInfo?.durationMinutes ??
                                Math.max(
                                  1,
                                  Math.round(
                                    roleParticipants.reduce(
                                      (acc: number, p: any) => acc + (p.durationSeconds || 0),
                                      0,
                                    ) / 60,
                                  ),
                                )}{' '}
                              {isAr ? 'دقيقة' : 'min'}
                            </p>
                          )}

                          {/* Individual sessions list if entered multiple times */}
                          {roleParticipants.length > 1 && (
                            <div className="mt-2.5 space-y-1.5 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {isAr
                                  ? `تفاصيل فترات الدخول (${roleParticipants.length} مرات):`
                                  : `Join Sessions (${roleParticipants.length} times):`}
                              </p>
                              <div className="space-y-1">
                                {roleParticipants.map((p: any, idx: number) => {
                                  const entryTime = new Date(p.joinedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                  const leaveTime = p.isActive
                                    ? isAr
                                      ? 'متواجد الآن'
                                      : 'Active now'
                                    : p.leftAt
                                      ? new Date(p.leftAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : isAr
                                        ? 'غادر'
                                        : 'Left'

                                  return (
                                    <div
                                      key={p.participantId || idx}
                                      className="flex items-center justify-between text-[11px] bg-background/90 rounded-lg px-2.5 py-1 border border-border/50 text-muted-foreground"
                                    >
                                      <span>
                                        <strong className="text-primary font-semibold">
                                          {isAr ? `دخول #${idx + 1}:` : `Join #${idx + 1}:`}
                                        </strong>{' '}
                                        {entryTime} - {leaveTime}
                                      </span>
                                      <span className="font-semibold text-primary/90">
                                        {p.durationMinutes} {isAr ? 'د' : 'min'}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : reportInfo?.response === 'attended' ? (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {isAr ? 'أكد الحضور يدوياً' : 'Confirmed attendance manually'}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {isAr ? 'لم يتم تسجيل الدخول بعد' : 'No room entry recorded yet'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {attendanceFeedback && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
              {attendanceFeedback}
            </div>
          )}

          {(() => {
            const isExpertViewer = booking.userRoleInView === 'expert'
            const myReport = isExpertViewer
              ? booking.expertAttendanceReport
              : booking.clientAttendanceReport
            const bothEnteredMeet = Boolean(
              booking.meetingJoins?.client?.firstJoinedAt &&
              booking.meetingJoins?.expert?.firstJoinedAt
            )

            if (myReport) {
              return (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-700" />
                    <p className="text-sm font-bold text-emerald-950">
                      {isAr ? 'تم تقديم تقرير الحضور بنجاح' : 'You Submitted Your Attendance Report'}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-900">
                    {isAr ? (
                      <>
                        أكدت أن الجلسة{' '}
                        <strong>
                          {myReport.response === 'attended' ? 'تمت بنجاح' : 'لم تتم (غياب)'}
                        </strong>{' '}
                        في {new Date(myReport.submittedAt).toLocaleDateString()}.
                      </>
                    ) : (
                      <>
                        You reported <strong>{myReport.response === 'attended' ? 'Attended' : 'Did Not Attend'}</strong> on{' '}
                        {new Date(myReport.submittedAt).toLocaleString()}.
                      </>
                    )}
                  </p>
                  <div className="border-t border-emerald-200/80 pt-2 flex items-center justify-between text-xs font-bold text-emerald-950">
                    <span>{isAr ? 'حالة الحضور المعتمدة:' : 'Verified Attendance Status:'}</span>
                    <span className="uppercase tracking-wider">{booking.attendanceStatus}</span>
                  </div>
                </div>
              )
            }

            if ((bothEnteredMeet || booking.attendanceStatus === 'completed') && !booking.isAttendanceReportingOpen) {
              return (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-700" />
                    <p className="text-sm font-bold text-emerald-950">
                      {isAr
                        ? 'تم تسجيل حضور الطرفين في غرفة الاجتماع تلقائياً'
                        : 'Both Client & Expert Attendance Verified Automatically'}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-900">
                    {isAr
                      ? 'تم رصد دخول كل من المستفيد والخبير إلى رابط جوجل ميت الخاص بالجلسة وانتهت مهلة الإبلاغ دون نزاعات.'
                      : 'Both the client and the expert entered the Google Meet session room via Bok Bok and the reporting window closed with no disputes.'}
                  </p>
                </div>
              )
            }

            if (!isSessionStarted) {
              return (
                <div className="rounded-2xl border border-border bg-background p-5 text-center text-xs text-muted-foreground">
                  <Clock size={20} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="font-bold text-primary">
                    {isAr ? 'الجلسة لم تبدأ بعد' : 'Session has not started yet'}
                  </p>
                  <p className="mt-0.5">
                    {isAr
                      ? 'ستتاح نافذة تأكيد إتمام الجلسة أو الإبلاغ الفوري عن أي مشكلة/نزاع فور بدء موعد الجلسة.'
                      : 'The session confirmation and dispute reporting window will open as soon as the session starts.'}
                  </p>
                </div>
              )
            }

            if (!booking.isAttendanceReportingOpen) {
              return (
                <div className="rounded-2xl border border-border bg-background p-5 text-center text-xs text-muted-foreground">
                  <p className="font-bold text-primary">
                    {isAr ? 'أغلقت نافذة تأكيد الحضور والإبلاغ عن نزاع' : 'Attendance & Dispute Reporting Window Closed'}
                  </p>
                  <p className="mt-0.5">
                    {isAr
                      ? 'انتهت فترة الـ 24 ساعة المخصصة لتأكيد حضور هذه الجلسة أو الإبلاغ عن مشكلة.'
                      : 'The 24-hour attendance confirmation and dispute reporting window for this appointment has expired.'}
                  </p>
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {(bothEnteredMeet || booking.attendanceStatus === 'completed') && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-2.5 text-xs text-emerald-900">
                    <CheckCircle size={17} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-950">
                        {isAr
                          ? 'تم رصد دخول الطرفين لغرفة Google Meet تلقائياً'
                          : 'Google Meet Entry Detected for Both Parties'}
                      </p>
                      <p className="mt-0.5">
                        {isAr
                          ? 'إذا تمت الجلسة بنجاح ودون مشاكل، أكد ذلك أدناه لفتح التقييم فوراً دون انتظار مهلة الـ 24 ساعة — أو أبلغ عن مشكلة/نزاع.'
                          : 'If the session completed with no issues, confirm below to unlock your review immediately without waiting 24 hours — or report a dispute/issue.'}
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-sm font-bold text-primary">
                  {isAr
                    ? 'هل تمت الجلسة بنجاح ودون أي مشكلة؟'
                    : 'Did your session complete with no issues?'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAr
                    ? 'عند تأكيدك أن الجلسة تمت بلا مشاكل، سيتم فتح نافذة التقييم لك فوراً دون انتظار انتهاء مهلة الـ 24 ساعة.'
                    : 'Confirming that the session completed with no problem opens your review window immediately without waiting for the 24-hour dispute period.'}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={submittingAttendance}
                    onClick={() => handleAttendanceSubmit('attended')}
                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-emerald-50 py-4 px-4 text-xs font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white transition disabled:opacity-50"
                  >
                    <UserCheck size={18} />
                    <span>
                      {isExpertViewer
                        ? isAr
                          ? 'نعم، تمت الجلسة بنجاح'
                          : 'Yes, Session Completed'
                        : isAr
                          ? 'نعم، تمت الجلسة بلا مشاكل (قيّم الآن)'
                          : 'Yes, Session Done With No Problem (Review Now)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={submittingAttendance}
                    onClick={() => handleAttendanceSubmit('absent')}
                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 py-4 px-4 text-xs font-bold text-rose-800 hover:bg-rose-600 hover:text-white transition disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    <span>
                      {isExpertViewer
                        ? isAr
                          ? 'لم يحضر المستفيد (غياب)'
                          : 'Client Did Not Attend (No-Show)'
                        : isAr
                          ? 'لم يحضر الخبير (غياب)'
                          : 'Expert Did Not Attend (No-Show)'}
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1">
                    {isAr ? 'ملاحظات أو تعليقات إضافية (اختياري)' : 'Optional Feedback or Notes'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={
                      isAr
                        ? 'شاركنا بأي تفاصيل واجهتها خلال الجلسة...'
                        : 'Share details if you faced technical difficulties or attendance issues...'
                    }
                    value={attendanceNotes}
                    onChange={(e) => setAttendanceNotes(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>
            )
          })()}

          {/* Dedicated Post-Session Dispute / Issue / Refund Window (Client) */}
          {booking.userRoleInView === 'client' && (
            <div id="dispute" className="border-t border-border pt-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                    <AlertTriangle size={16} className="text-rose-600" />
                    <span>
                      {isAr
                        ? 'نافذة الإبلاغ عن نزاع أو مشكلة / طلب استرداد'
                        : 'Dispute, Issue & Refund Reporting Window'}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr
                      ? 'متاحة ابتداءً من وقت بدء الجلسة ولمدة 24 ساعة بعد انتهائها للإبلاغ الفوري عن غياب الخبير، أو انقطاع الجلسة، أو طلب مراجعة واسترداد.'
                      : 'Open starting from session start and for 24 hours after completion to report an expert no-show, session issue, or refund request.'}
                  </p>
                </div>
                {booking.clientAttendanceReport?.response === 'attended' ? (
                  <span className="self-start sm:self-auto rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
                    {isAr ? 'مغلقة (تم تأكيد إتمام الجلسة)' : 'Closed · Confirmed Completed'}
                  </span>
                ) : booking.reportingDeadlineAt && isSessionStarted ? (
                  <span className="self-start sm:self-auto rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700">
                    {booking.isAttendanceReportingOpen
                      ? isAr
                        ? `متاح حتى ${new Date(booking.reportingDeadlineAt).toLocaleString()}`
                        : `Open until ${new Date(booking.reportingDeadlineAt).toLocaleString()}`
                      : isAr
                        ? 'انتهت مهلة الإبلاغ'
                        : 'Reporting Window Closed'}
                  </span>
                ) : null}
              </div>

              {disputeSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
                  {disputeSuccess}
                </div>
              )}

              {booking.complaint || booking.attendanceStatus === 'disputed' ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-1.5 text-xs text-rose-900">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">
                      {isAr
                        ? 'تم تسجيل بلاغ / نزاع لهذه الجلسة (قيد مراجعة الإدارة)'
                        : 'Dispute / Issue Report Submitted (On Hold for Admin Review)'}
                    </p>
                    <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                      {booking.complaint?.status || 'disputed'}
                    </span>
                  </div>
                  {booking.complaint?.subject && (
                    <p className="text-rose-800">
                      <strong>{isAr ? 'الموضوع:' : 'Subject:'}</strong> {booking.complaint.subject}
                    </p>
                  )}
                </div>
              ) : booking.clientAttendanceReport?.response === 'attended' ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle size={18} className="text-emerald-700 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-950">
                        {isAr
                          ? 'أُغلقت نافذة النزاع لتأكيدك إتمام الجلسة بنجاح وبلا مشاكل'
                          : 'Dispute Window Closed (You confirmed session completed with no issues)'}
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        {isAr
                          ? 'تم فتح نافذة التقييم لك مباشرة بالأسفل لمشاركة رأيك في الجلسة والخبير.'
                          : 'The review window is now open below to share your experience with the expert.'}
                      </p>
                    </div>
                  </div>
                  <a
                    href="#review"
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-accent hover:bg-accent-hover text-primary font-bold px-4 py-2 text-xs transition shadow-2xs"
                  >
                    <Star size={14} className="fill-current" />
                    <span>{isAr ? 'الانتقال لتقييم الجلسة' : 'Go to Review'}</span>
                  </a>
                </div>
              ) : isSessionStarted && booking.isAttendanceReportingOpen ? (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-rose-950 leading-relaxed">
                    {isAr
                      ? 'هل واجهت مشكلة في الجلسة أو غاب/تأخر الخبير أو ترغب في رفع نزاع وطلب استرداد فوراً؟'
                      : 'Experiencing an issue, expert no-show/delay, or need to file an immediate dispute / refund request?'}
                  </p>
                  <button
                    type="button"
                    onClick={() => openDisputeModal('session_shortened')}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-300 bg-white hover:bg-rose-600 hover:text-white px-4 py-2 text-xs font-bold text-rose-700 transition shadow-2xs"
                  >
                    <AlertTriangle size={14} />
                    <span>
                      {isAr ? 'الإبلاغ عن مشكلة / طلب استرداد' : 'Report a Dispute / Request Refund'}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* SECTION 4: Post-Session Review Window (Client Only) */}
        {booking.userRoleInView === 'client' && booking.status === 'confirmed' && (
          <div id="review" className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs space-y-5">
            <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                  {/* <Star size={20} className="text-amber-500 fill-amber-400" /> */}
                  <span>{isAr ? 'تقييم الجلسة والخبير' : 'Session & Expert Review'}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr
                    ? 'تُفتح نافذة التقييم تلقائياً بعد انتهاء مهلة الإبلاغ عن المشاكل أو طلب الاسترداد، بشرط عدم وجود طلب معلق.'
                    : 'The review window opens automatically once the post-session issue/refund period ends and nothing is on hold.'}
                </p>
              </div>
              <span
                className={`self-start sm:self-auto rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${booking.hasReview
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : booking.reviewEligibility?.isOpen
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : booking.reviewEligibility?.isOnHold
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
              >
                {booking.hasReview
                  ? isAr ? 'تم التقييم' : 'Reviewed'
                  : booking.reviewEligibility?.isOpen
                    ? isAr ? 'مفتوح الآن' : 'Window Open'
                    : booking.reviewEligibility?.isOnHold
                      ? isAr ? 'معلق للمراجعة' : 'On Hold'
                      : isAr ? 'قريباً' : 'Scheduled'}
              </span>
            </div>

            {reviewSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
                {reviewSuccess}
              </div>
            )}

            {booking.review ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isAr ? 'تقييم الخبير' : 'Expert Rating'}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        className={
                          s <= booking.review.expertRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    ))}
                    <span className="ms-1.5 text-xs font-bold text-primary">
                      {booking.review.expertRating}/5
                    </span>
                  </div>
                  {booking.review.expertReviewText && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {booking.review.expertReviewText}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isAr ? 'تقييم الخدمة' : 'Service Rating'}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        className={
                          s <= booking.review.serviceRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    ))}
                    <span className="ms-1.5 text-xs font-bold text-primary">
                      {booking.review.serviceRating}/5
                    </span>
                  </div>
                  {booking.review.serviceReviewText && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {booking.review.serviceReviewText}
                    </p>
                  )}
                </div>

                {booking.review.platformFeedback && (
                  <div className="sm:col-span-2 rounded-2xl border border-border bg-background p-4 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {isAr ? 'رأيك واقتراحاتك لمنصة بوك بوك' : 'Your Feedback for Bok Bok'}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {booking.review.platformFeedback}
                    </p>
                  </div>
                )}
              </div>
            ) : booking.reviewEligibility?.isOpen ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-primary">
                    {isAr
                      ? `كيف كانت تجربتك مع ${booking.expertName}؟`
                      : `How was your session with ${booking.expertName}?`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAr
                      ? 'شاركنا تقييمك للخبير ومحتوى الخدمة لمساعدة المستفيدين الآخرين.'
                      : 'Share your rating for both the expert and the service to help future learners.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReviewError(null)
                    setShowReviewModal(true)
                  }}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-accent hover:bg-accent-hover px-6 py-2.5 text-xs font-bold text-primary shadow-xs transition"
                >
                  <Star size={15} className="fill-current" />
                  <span>{isAr ? 'تقييم الجلسة الآن' : 'Rate & Review Session'}</span>
                </button>
              </div>
            ) : booking.reviewEligibility?.isOnHold ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3 text-xs text-rose-900">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {isAr ? 'نافذة التقييم متوقفة مؤقتاً' : 'Review Window Paused (On Hold)'}
                  </p>
                  <p className="leading-relaxed">
                    {isAr
                      ? 'يوجد حالياً بلاغ أو طلب استرداد أو نزاع حضور قيد المراجعة لهذه الجلسة. سيتم تفعيل التقييم فقط عند عدم وجود أي مشكلة معلقة.'
                      : 'There is currently an open issue report, refund request, or attendance dispute under review for this booking. Reviews only open when nothing is on hold.'}
                  </p>
                </div>
              </div>
            ) : booking.reviewEligibility?.reason === 'waiting_period' ? (
              <div className="rounded-2xl border border-border bg-background p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-primary">
                      {isAr
                        ? 'أكد إتمام الجلسة بلا مشاكل للتقييم فوراً، أو انتظر انتهاء مهلة الإبلاغ'
                        : 'Confirm Session Completed to Review Immediately — or Wait for the 24h Dispute Window'}
                    </p>
                    <p className="leading-relaxed">
                      {isAr
                        ? `يمكنك تأكيد أن الجلسة تمت بلا مشاكل لفتح التقييم الآن فوراً، أو ستُفتح نافذة التقييم تلقائياً بعد انتهاء فترة الـ ${booking.reviewEligibility.reportingWindowHours || 24} ساعة المخصصة للإبلاغ عن أي مشكلة${booking.reviewEligibility.opensAt
                          ? ` (${new Date(booking.reviewEligibility.opensAt).toLocaleString()})`
                          : ''
                        }.`
                        : `You can confirm the session completed with no problem to unlock and submit your review right now, or wait until the ${booking.reviewEligibility.reportingWindowHours || 24}-hour dispute/refund window ends${booking.reviewEligibility.opensAt
                          ? ` (${new Date(booking.reviewEligibility.opensAt).toLocaleString()})`
                          : ''
                        }.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submittingAttendance}
                  onClick={() => handleAttendanceSubmit('attended')}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  <CheckCircle size={15} />
                  <span>
                    {isAr
                      ? 'تمت الجلسة بلا مشاكل — قيّم الآن'
                      : 'Session Done With No Problem — Review Now'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-background p-5 text-center text-xs text-muted-foreground">
                <p className="font-bold text-primary">
                  {isAr ? 'التقييم يتاح بعد انتهاء الجلسة' : 'Reviews Unlock After Session Completion'}
                </p>
                <p className="mt-1">
                  {isAr
                    ? 'بعد انتهاء الجلسة وانقضاء مهلة الـ 24 ساعة للإبلاغ عن أي مشكلة، ستُفتح نافذة التقييم تلقائياً ويصلك بريد إلكتروني للتنبيه.'
                    : 'After your session concludes and the 24-hour issue/refund period passes with no holds, the review window will open and you will be notified by email.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Popup Modal */}
      {showReviewModal && booking.userRoleInView === 'client' && booking.reviewEligibility?.isOpen && !booking.hasReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Star size={20} className="text-amber-500 fill-amber-400" />
                <h2 className="text-lg font-bold text-primary">
                  {isAr ? 'شاركنا تقييمك للجلسة' : 'Rate & Review Your Session'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false)
                  setReviewPopupDismissed(true)
                }}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-background transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-5">
              {reviewError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                  {reviewError}
                </div>
              )}

              {/* 1. Expert Rating */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isAr ? 'تقييم الخبير' : 'Rate the Expert'}
                  </p>
                  <p className="text-sm font-bold text-primary">{booking.expertName}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setExpertRating(star)}
                      className="p-1 transition transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={
                          star <= expertRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="ms-2 text-xs font-bold text-primary">{expertRating}/5</span>
                </div>

                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'ما الذي أعجبك في تعامل وخبرة المحاضر؟ (اختياري)'
                      : 'How was the expert communication, depth, and helpfulness? (Optional)'
                  }
                  value={expertReviewText}
                  onChange={(e) => setExpertReviewText(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* 2. Service Rating */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isAr ? 'تقييم محتوى الخدمة' : 'Rate the Service'}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {isAr
                      ? booking.serviceTitle?.ar || booking.serviceTitle?.en
                      : booking.serviceTitle?.en || booking.serviceTitle?.ar}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setServiceRating(star)}
                      className="p-1 transition transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={
                          star <= serviceRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="ms-2 text-xs font-bold text-primary">{serviceRating}/5</span>
                </div>

                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'هل حققت الجلسة توقعاتك؟ (اختياري)'
                      : 'Did the session meet your goals and expectations? (Optional)'
                  }
                  value={serviceReviewText}
                  onChange={(e) => setServiceReviewText(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* 3. Optional Bok Bok Platform Feedback */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-2.5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isAr ? 'رأيك في منصة بوك بوك (اختياري)' : 'Your Opinion About Bok Bok (Optional)'}
                  </p>
                  <p className="text-xs font-medium text-primary mt-0.5 leading-relaxed">
                    {isAr
                      ? 'ما رأيك في منصة بوك بوك؟ وهل هناك شيء يمكننا إضافته لجعل خدماتنا أفضل؟'
                      : "What's your opinion about Bok Bok, and is there anything we can add to make our service better?"}
                  </p>
                </div>

                <textarea
                  rows={3}
                  placeholder={
                    isAr
                      ? 'شاركنا أفكارك أو أي ميزة أو تحسين تتمنى وجوده في بوك بوك...'
                      : "Share your thoughts, suggestions, or features you'd love to see on Bok Bok..."
                  }
                  value={platformFeedback}
                  onChange={(e) => setPlatformFeedback(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false)
                    setReviewPopupDismissed(true)
                  }}
                  className="rounded-full px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-background transition"
                >
                  {isAr ? 'لاحقاً' : 'Maybe Later'}
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="rounded-full bg-accent hover:bg-accent-hover px-6 py-2.5 text-xs font-bold text-primary shadow-xs transition disabled:opacity-50"
                >
                  {submittingReview
                    ? isAr ? 'جاري الإرسال...' : 'Submitting...'
                    : isAr ? 'إرسال التقييم' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute / Issue / Refund Reporting Popup Modal */}
      {showDisputeModal && booking.userRoleInView === 'client' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-rose-600" />
                <h2 className="text-lg font-bold text-primary">
                  {isAr
                    ? 'الإبلاغ عن نزاع أو مشكلة / طلب استرداد'
                    : 'Report a Dispute, Issue, or Refund Request'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-background transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="mt-5 space-y-4">
              {disputeError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                  {disputeError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  {isAr ? 'نوع المشكلة / سبب النزاع *' : 'Issue / Dispute Category *'}
                </label>
                <select
                  value={disputeCategory}
                  onChange={(e) =>
                    setDisputeCategory(
                      e.target.value as
                        | 'no_show'
                        | 'session_shortened'
                        | 'technical_issue'
                        | 'service_quality'
                        | 'billing_payment'
                        | 'other'
                    )
                  }
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-bold text-primary outline-none focus:border-accent"
                >
                  <option value="no_show">
                    {isAr
                      ? 'عدم حضور الخبير للجلسة (طلب استرداد كامل)'
                      : 'Expert Did Not Attend / No-Show (Full Refund Request)'}
                  </option>
                  <option value="session_shortened">
                    {isAr
                      ? 'انتهاء الجلسة مبكراً أو عدم اكتمال مدتها'
                      : 'Session Ended Early / Incomplete Duration'}
                  </option>
                  <option value="technical_issue">
                    {isAr
                      ? 'مشكلة تقنية منعت إتمام الجلسة'
                      : 'Technical Issue Prevented Session Completion'}
                  </option>
                  <option value="service_quality">
                    {isAr
                      ? 'المحتوى غير مطابق لوصف الخدمة / طلب استرداد'
                      : 'Service Quality Mismatch / Refund Request'}
                  </option>
                  <option value="billing_payment">
                    {isAr ? 'مشكلة في الدفع أو الرسوم' : 'Billing or Payment Issue'}
                  </option>
                  <option value="other">
                    {isAr ? 'سبب آخر' : 'Other Issue'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  {isAr ? 'عنوان البلاغ *' : 'Subject *'}
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={disputeSubject}
                  onChange={(e) => setDisputeSubject(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  {isAr ? 'تفاصيل المشكلة وطلبك *' : 'Detailed Description *'}
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  placeholder={
                    isAr
                      ? 'يرجى شرح ما حدث بالتفصيل ليتمكن فريق الإدارة من مراجعة سجلات الاجتماع واتخاذ الإجراء المناسب...'
                      : 'Please describe what happened in detail so our admin team can review the meeting telemetry and resolve your request...'
                  }
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="rounded-full px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-background transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="rounded-full bg-rose-600 hover:bg-rose-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {submittingDispute
                    ? isAr
                      ? 'جاري إرسال البلاغ...'
                      : 'Submitting...'
                    : isAr
                      ? 'إرسال البلاغ وتعليق الجلسة للمراجعة'
                      : 'Submit Dispute & Hold for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
