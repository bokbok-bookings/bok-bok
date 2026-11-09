'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar,
  Clock,
  Video,
  Star,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Hourglass,
  XCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  MessageSquare,
  Sparkles,
  Info,
  X,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import { formatSlotLabel, formatDateLabel, formatFullDate, type DayAvailability, type TimeSlot } from '@/lib/data/availability'

export interface ClientBooking {
  _id: string
  reference: string
  status: string
  paymentStatus?: string
  attendanceStatus?: string
  date: string
  time: string
  durationMinutes: number
  amount?: number
  currency?: string
  googleMeetLink?: string
  rescheduleToken?: string
  createdAt: string
  isPast: boolean
  isJoinable: boolean
  canReschedule: boolean
  canReview: boolean
  canComplain: boolean
  deadlineHours: number
  rescheduleDeadlineAt?: string
  expert: {
    id: string
    name: string
    slug: string
    avatarUrl: string
    role: string
  }
  service: {
    id: string
    title: { en: string; ar: string }
    slug: string
  }
  review?: {
    _id: string
    expertRating: number
    expertReviewText?: string
    serviceRating: number
    serviceReviewText?: string
    createdAt: string
  } | null
  complaint?: {
    _id: string
    category: string
    subject: string
    description: string
    status: string
    createdAt: string
    resolution?: string
  } | null
}

interface ClientAccountManagerProps {
  user: {
    userId: string
    email: string
    displayName: string
    role: string
  }
}

export function ClientAccountManager({ user }: ClientAccountManagerProps) {
  const { isAr, localeHref } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingCount: 0,
    completedCount: 0,
    pendingVerificationCount: 0,
    issuesCount: 0,
  })
  const [bookings, setBookings] = useState<ClientBooking[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed' | 'issues'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [reviewModalBooking, setReviewModalBooking] = useState<ClientBooking | null>(null)
  const [complaintModalBooking, setComplaintModalBooking] = useState<ClientBooking | null>(null)
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<ClientBooking | null>(null)

  // Review Form state
  const [expertRating, setExpertRating] = useState(5)
  const [expertReviewText, setExpertReviewText] = useState('')
  const [serviceRating, setServiceRating] = useState(5)
  const [serviceReviewText, setServiceReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Complaint Form state
  const [complaintCategory, setComplaintCategory] = useState<string>('no_show')
  const [complaintSubject, setComplaintSubject] = useState('')
  const [complaintDescription, setComplaintDescription] = useState('')
  const [submittingComplaint, setSubmittingComplaint] = useState(false)
  const [complaintError, setComplaintError] = useState<string | null>(null)

  // Reschedule Form state
  const [rescheduleDays, setRescheduleDays] = useState<DayAvailability[]>([])
  const [loadingDays, setLoadingDays] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [submittingReschedule, setSubmittingReschedule] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)

  // Load Bookings & Stats
  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/account/bookings')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setBookings(data.bookings)
      } else {
        setError(data.error || 'Failed to load bookings')
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchExpert = b.expert.name.toLowerCase().includes(q)
      const matchRef = b.reference.toLowerCase().includes(q)
      const matchSrv =
        b.service.title.en.toLowerCase().includes(q) ||
        b.service.title.ar.toLowerCase().includes(q)
      if (!matchExpert && !matchRef && !matchSrv) return false
    }

    if (activeTab === 'upcoming') {
      return !b.isPast && b.status !== 'cancelled' && b.status !== 'rejected'
    }
    if (activeTab === 'completed') {
      return b.isPast || b.attendanceStatus === 'completed'
    }
    if (activeTab === 'issues') {
      return (
        b.attendanceStatus === 'disputed' ||
        b.attendanceStatus === 'client_absent' ||
        b.attendanceStatus === 'expert_absent' ||
        Boolean(b.complaint) ||
        b.status === 'awaiting_verification' ||
        b.status === 'rejected'
      )
    }
    return true
  })

  // Open Review Modal
  const openReviewModal = (booking: ClientBooking) => {
    setReviewModalBooking(booking)
    setExpertRating(5)
    setExpertReviewText('')
    setServiceRating(5)
    setServiceReviewText('')
    setReviewError(null)
  }

  // Handle Review Submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewModalBooking) return

    setSubmittingReview(true)
    setReviewError(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewModalBooking._id,
          expertRating,
          expertReviewText,
          serviceRating,
          serviceReviewText,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setReviewModalBooking(null)
        await fetchBookings()
      } else {
        setReviewError(data.error || 'Failed to submit review')
      }
    } catch (err: any) {
      setReviewError(err.message || 'Error submitting review')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Open Complaint Modal
  const openComplaintModal = (booking: ClientBooking) => {
    setComplaintModalBooking(booking)
    setComplaintCategory('no_show')
    setComplaintSubject(
      isAr
        ? `مشكلة في جلسة ${booking.reference}`
        : `Issue with Booking ${booking.reference}`
    )
    setComplaintDescription('')
    setComplaintError(null)
  }

  // Handle Complaint Submit
  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complaintModalBooking) return

    setSubmittingComplaint(true)
    setComplaintError(null)

    try {
      const res = await fetch('/api/account/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: complaintModalBooking._id,
          category: complaintCategory,
          subject: complaintSubject,
          description: complaintDescription,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setComplaintModalBooking(null)
        await fetchBookings()
      } else {
        setComplaintError(data.error || 'Failed to submit complaint')
      }
    } catch (err: any) {
      setComplaintError(err.message || 'Error submitting complaint')
    } finally {
      setSubmittingComplaint(false)
    }
  }

  // Open Reschedule Modal
  const openRescheduleModal = (booking: ClientBooking) => {
    setRescheduleModalBooking(booking)
    setSelectedDate('')
    setSelectedTime('')
    setRescheduleReason('')
    setRescheduleError(null)
    setRescheduleSlots([])

    setLoadingDays(true)
    fetch(
      `/api/availability?expertId=${booking.expert.id}&action=days&count=14&duration=${booking.durationMinutes || 45}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.days)) {
          setRescheduleDays(data.days)
          const firstOpen = data.days.find((d: DayAvailability) => d.hasSlots)
          if (firstOpen) {
            setSelectedDate(firstOpen.date)
          }
        }
      })
      .finally(() => setLoadingDays(false))
  }

  // Load Slots on date change in Reschedule Modal
  useEffect(() => {
    if (!selectedDate || !rescheduleModalBooking) {
      setRescheduleSlots([])
      return
    }

    setLoadingSlots(true)
    setSelectedTime('')
    fetch(
      `/api/availability?expertId=${rescheduleModalBooking.expert.id}&action=slots&date=${selectedDate}&duration=${rescheduleModalBooking.durationMinutes || 45}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.slots)) {
          setRescheduleSlots(data.slots)
          const firstOpen = data.slots.find((s: TimeSlot) => s.available)
          if (firstOpen) setSelectedTime(firstOpen.time)
        }
      })
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, rescheduleModalBooking])

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleModalBooking || !selectedDate || !selectedTime) return

    setSubmittingReschedule(true)
    setRescheduleError(null)

    try {
      const url = `/api/bookings/${rescheduleModalBooking._id}/reschedule`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: selectedDate,
          newTime: selectedTime,
          reason: rescheduleReason,
          token: rescheduleModalBooking.rescheduleToken,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setRescheduleModalBooking(null)
        await fetchBookings()
      } else {
        setRescheduleError(data.error || 'Failed to reschedule session')
      }
    } catch (err: any) {
      setRescheduleError(err.message || 'Error rescheduling session')
    } finally {
      setSubmittingReschedule(false)
    }
  }

  const renderStatusBadge = (b: ClientBooking) => {
    if (b.complaint || b.attendanceStatus === 'disputed') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
          <AlertTriangle size={13} />
          {isAr ? 'تم الإبلاغ عن مشكلة' : 'Issue Reported'}
        </span>
      )
    }
    if (b.status === 'confirmed') {
      if (b.isPast || b.attendanceStatus === 'completed') {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            <CheckCircle2 size={13} />
            {isAr ? 'مكتملة' : 'Completed'}
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} />
          {isAr ? 'مؤكدة' : 'Confirmed'}
        </span>
      )
    }
    if (['awaiting_verification', 'pending', 'awaiting_payment'].includes(b.status)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
          <Hourglass size={13} />
          {isAr ? 'قيد المراجعة / الدفع' : 'Pending Verification'}
        </span>
      )
    }
    if (b.status === 'cancelled' || b.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
          <XCircle size={13} />
          {isAr ? 'ملغية' : 'Cancelled'}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 border border-gray-200">
        {b.status}
      </span>
    )
  }

  return (
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-12 text-foreground">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
          <div>
            {/* <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-primary mb-2">
              <Sparkles size={13} className="text-primary" />
              <span>{isAr ? 'حساب المستفيد' : 'Client Account Portal'}</span>
            </div> */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {isAr ? `مرحباً، ${user.displayName}` : `Welcome, ${user.displayName}`}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {isAr
                ? 'إدارة حجوزاتك، مواعيد الجلسات، التقييمات، وبلاغات المساعدة في مكان واحد.'
                : 'Manage your sessions, reschedule upcoming consultations, review experts, and track requests.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={localeHref('/experts')}
              className="rounded-full bg-accent hover:bg-accent-hover px-5 py-2.5 text-xs font-bold text-primary shadow-xs transition"
            >
              {isAr ? 'استكشف الخبراء' : 'Book New Session'}
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {isAr ? 'إجمالي الحجوزات' : 'Total Bookings'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-primary mt-1">
                {stats.totalBookings}
              </p>
            </div>
            <div className="size-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
              <Calendar size={22} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                {isAr ? 'جلسات قادمة' : 'Upcoming'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                {stats.upcomingCount}
              </p>
            </div>
            <div className="size-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-100">
              <Clock size={22} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                {isAr ? 'جلسات مكتملة' : 'Completed'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                {stats.completedCount}
              </p>
            </div>
            <div className="size-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-100">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                {isAr ? 'قيد المتابعة / تنبيهات' : 'Issues & Pending'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                {stats.issuesCount + stats.pendingVerificationCount}
              </p>
            </div>
            <div className="size-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-100">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          {/* Tabs */}
          <div className="inline-flex rounded-2xl border border-border bg-surface p-1 shadow-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${activeTab === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted-foreground hover:text-primary'
                }`}
            >
              {isAr ? `كل الحجوزات (${bookings.length})` : `All Bookings (${bookings.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${activeTab === 'upcoming'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted-foreground hover:text-primary'
                }`}
            >
              {isAr ? `القادمة (${stats.upcomingCount})` : `Upcoming (${stats.upcomingCount})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${activeTab === 'completed'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted-foreground hover:text-primary'
                }`}
            >
              {isAr ? `المكتملة (${stats.completedCount})` : `Completed (${stats.completedCount})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('issues')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${activeTab === 'issues'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted-foreground hover:text-primary'
                }`}
            >
              {isAr ? `المشكلات والمعلقة (${stats.issuesCount + stats.pendingVerificationCount})` : `Issues & Pending (${stats.issuesCount + stats.pendingVerificationCount})`}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالخبير أو رقم الحجز...' : 'Search expert or ref...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface pl-9 pr-4 py-2 text-xs text-foreground outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="rounded-3xl border border-border bg-surface p-12 text-center">
            <p className="text-sm font-bold text-muted-foreground">
              {isAr ? 'جاري تحميل الحجوزات...' : 'Loading your bookings...'}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-semibold text-rose-800">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredBookings.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface p-12 text-center space-y-4">
            <Calendar size={42} className="mx-auto text-muted-foreground/60" />
            <h3 className="text-base font-bold text-primary">
              {isAr ? 'لا توجد حجوزات في هذا القسم' : 'No bookings found in this view'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {isAr
                ? 'عند قيامك بحجز جلسات استشارية مع خبرائنا ستظهر جميع التفاصيل وخيارات المتابعة هنا.'
                : 'When you book consultations or workshops with our experts, they will appear here.'}
            </p>
            <Link
              href={localeHref('/experts')}
              className="inline-block rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-primary hover:bg-accent-hover transition shadow-xs"
            >
              {isAr ? 'تصفح الخبراء الآن' : 'Browse Experts'}
            </Link>
          </div>
        )}

        {/* Bookings List */}
        {!loading && !error && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const serviceTitle = isAr ? b.service.title.ar : b.service.title.en

              return (
                <div
                  key={b._id}
                  className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xs hover:border-accent/60 transition flex flex-col gap-5"
                >
                  {/* Top Bar: Reference, Date/Time & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black tracking-wider text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                        {b.reference}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                        <Calendar size={14} />
                        <span>{formatFullDate(b.date, isAr ? 'ar' : 'en')}</span>
                        <span>·</span>
                        <Clock size={14} />
                        <span>{formatSlotLabel(b.time, isAr ? 'ar' : 'en')}</span>
                        <span className="text-[11px] text-muted-foreground/80">({b.durationMinutes}m)</span>
                      </div>
                    </div>
                    <div>{renderStatusBadge(b)}</div>
                  </div>

                  {/* Middle Section: Service & Expert info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Expert Avatar */}
                      <div className="relative size-14 shrink-0 rounded-2xl overflow-hidden bg-primary/5 border border-border">
                        {b.expert.avatarUrl ? (
                          <Image
                            src={b.expert.avatarUrl}
                            alt={b.expert.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center font-bold text-primary text-base">
                            {b.expert.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Titles & Roles */}
                      <div>
                        <h3 className="text-base font-bold text-primary">
                          {serviceTitle}
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                          {isAr ? 'مع الخبير:' : 'With Expert:'}{' '}
                          <Link
                            href={localeHref(`/experts/${b.expert.slug}`)}
                            className="text-primary hover:underline font-bold"
                          >
                            {b.expert.name}
                          </Link>
                          {b.expert.role ? ` · ${b.expert.role}` : ''}
                        </p>
                        {b.amount ? (
                          <p className="text-[11px] font-bold text-primary mt-1">
                            {b.amount} {b.currency}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Join Google Meet Button if active */}
                    <div className="flex items-center gap-2">
                      {b.status === 'confirmed' && b.googleMeetLink ? (
                        <a
                          href={b.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition shadow-xs ${b.isJoinable
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse'
                              : 'bg-primary text-white hover:bg-primary/90'
                            }`}
                        >
                          <Video size={16} />
                          <span>
                            {b.isJoinable
                              ? isAr
                                ? 'انضم للجلسة الآن'
                                : 'Join Google Meet Now'
                              : isAr
                                ? 'رابط جوجل ميت'
                                : 'Google Meet Link'}
                          </span>
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* Review / Complaint info if already submitted */}
                  {b.review && (
                    <div className="rounded-2xl border border-border bg-background p-4 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-primary">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>{isAr ? 'تقييمك للجلسة والخبير:' : 'Your Submitted Review:'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          {isAr ? 'الخبير:' : 'Expert:'}
                          <span className="inline-flex text-amber-500 font-bold">
                            {'★'.repeat(b.review.expertRating)}
                          </span>
                          ({b.review.expertRating}/5)
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          {isAr ? 'الخدمة:' : 'Service:'}
                          <span className="inline-flex text-amber-500 font-bold">
                            {'★'.repeat(b.review.serviceRating)}
                          </span>
                          ({b.review.serviceRating}/5)
                        </span>
                      </div>
                      {b.review.expertReviewText && (
                        <p className="text-xs text-muted-foreground italic">
                          &ldquo;{b.review.expertReviewText}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {b.complaint && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-rose-900">
                          <AlertTriangle size={14} className="text-rose-600" />
                          <span>{isAr ? 'بلاغ المشكلة المقدم:' : 'Complaint Filed:'}</span>
                          <span className="font-semibold text-rose-800">
                            {b.complaint.subject}
                          </span>
                        </div>
                        <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-black uppercase text-rose-900">
                          {b.complaint.status}
                        </span>
                      </div>
                      <p className="text-rose-900 text-[11px]">{b.complaint.description}</p>
                      {b.complaint.resolution && (
                        <div className="pt-2 border-t border-rose-200 font-bold text-emerald-800">
                          {isAr ? 'قرار الإدارة:' : 'Resolution:'} {b.complaint.resolution}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Reschedule Button */}
                      {b.canReschedule ? (
                        <button
                          type="button"
                          onClick={() => openRescheduleModal(b)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 font-bold text-primary hover:bg-surface transition"
                        >
                          <RotateCcw size={13} />
                          <span>{isAr ? 'إعادة جدولة' : 'Reschedule'}</span>
                        </button>
                      ) : !b.isPast && b.status === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Info size={12} />
                          {isAr
                            ? `انتهت مهلة التعديل (أقل من ${b.deadlineHours} ساعة)`
                            : `Rescheduling deadline passed (${b.deadlineHours}h rule)`}
                        </span>
                      ) : null}

                      {/* Review & Rate Button */}
                      {b.canReview ? (
                        <button
                          type="button"
                          onClick={() => openReviewModal(b)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent hover:bg-accent-hover px-4 py-2 font-bold text-primary transition shadow-xs"
                        >
                          <Star size={13} className="fill-primary" />
                          <span>{isAr ? 'تقييم الخبير والخدمة' : 'Rate & Review'}</span>
                        </button>
                      ) : null}

                      {/* Complain / Report Problem Button */}
                      {b.canComplain ? (
                        <button
                          type="button"
                          onClick={() => openComplaintModal(b)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 font-bold text-rose-700 hover:bg-rose-50 transition"
                        >
                          <AlertTriangle size={13} />
                          <span>{isAr ? 'الإبلاغ عن مشكلة' : 'Report an Issue'}</span>
                        </button>
                      ) : null}
                    </div>

                    {/* View Booking Details link */}
                    <Link
                      href={`/bookings/${b._id}${b.rescheduleToken ? `?token=${b.rescheduleToken}` : ''}`}
                      className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-primary transition"
                    >
                      <span>{isAr ? 'تفاصيل الجلسة والإيصال' : 'View session details'}</span>
                      <ChevronRight size={14} className={isAr ? 'rotate-180' : ''} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. DUAL REVIEW MODAL (Expert & Service)                    */}
      {/* ========================================================= */}
      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <h2 className="text-lg font-bold text-primary">
                  {isAr ? 'تقييم الجلسة' : 'Rate & Review Session'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalBooking(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-background transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-6">
              {reviewError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                  {reviewError}
                </div>
              )}

              {/* 1. Expert Rating Section */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-10 rounded-xl overflow-hidden bg-primary/5">
                    {reviewModalBooking.expert.avatarUrl ? (
                      <Image
                        src={reviewModalBooking.expert.avatarUrl}
                        alt={reviewModalBooking.expert.name}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {isAr ? 'تقييم الخبير' : 'Rate the Expert'}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {reviewModalBooking.expert.name}
                    </p>
                  </div>
                </div>

                {/* Stars selector */}
                <div className="flex items-center gap-2 pt-1">
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
                            : 'text-border stroke-muted-foreground'
                        }
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-primary ml-2">
                    {expertRating === 5 && (isAr ? 'ممتاز جداً (5/5)' : 'Excellent (5/5)')}
                    {expertRating === 4 && (isAr ? 'جيد جداً (4/5)' : 'Very Good (4/5)')}
                    {expertRating === 3 && (isAr ? 'جيد (3/5)' : 'Good (3/5)')}
                    {expertRating === 2 && (isAr ? 'مقبول (2/5)' : 'Fair (2/5)')}
                    {expertRating === 1 && (isAr ? 'ضعيف (1/5)' : 'Poor (1/5)')}
                  </span>
                </div>

                <label className="block text-xs font-bold text-primary mt-2">
                  {isAr ? 'رأيك وملاحظاتك عن الخبير (اختياري)' : 'Expert Feedback (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'ما الذي ميز الخبير في الجلسة؟ هل كان متفاعلاً ومساعداً؟'
                      : 'How was the expert communication, depth, and helpfulness?'
                  }
                  value={expertReviewText}
                  onChange={(e) => setExpertReviewText(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* 2. Service Rating Section */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isAr ? 'تقييم محتوى الخدمة' : 'Rate the Service Offering'}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {isAr
                      ? reviewModalBooking.service.title.ar
                      : reviewModalBooking.service.title.en}
                  </p>
                </div>

                {/* Stars selector */}
                <div className="flex items-center gap-2 pt-1">
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
                            : 'text-border stroke-muted-foreground'
                        }
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-primary ml-2">
                    {serviceRating === 5 && (isAr ? 'ممتاز جداً (5/5)' : 'Excellent (5/5)')}
                    {serviceRating === 4 && (isAr ? 'جيد جداً (4/5)' : 'Very Good (4/5)')}
                    {serviceRating === 3 && (isAr ? 'جيد (3/5)' : 'Good (3/5)')}
                    {serviceRating === 2 && (isAr ? 'مقبول (2/5)' : 'Fair (2/5)')}
                    {serviceRating === 1 && (isAr ? 'ضعيف (1/5)' : 'Poor (1/5)')}
                  </span>
                </div>

                <label className="block text-xs font-bold text-primary mt-2">
                  {isAr ? 'ملاحظاتك عن محتوى الخدمة وتأثيرها (اختياري)' : 'Service Feedback (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'هل حققت الخدمة توقعاتك؟ هل كانت القيمة مناسبة؟'
                      : 'Did the service meet your goals and expectations?'
                  }
                  value={serviceReviewText}
                  onChange={(e) => setServiceReviewText(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalBooking(null)}
                  className="rounded-full px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-background transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="rounded-full bg-accent hover:bg-accent-hover px-6 py-2.5 text-xs font-bold text-primary transition disabled:opacity-50 shadow-xs"
                >
                  {submittingReview
                    ? isAr
                      ? 'جاري الإرسال...'
                      : 'Submitting...'
                    : isAr
                      ? 'إرسال التقييم'
                      : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. COMPLAINT / REPORT PROBLEM MODAL                       */}
      {/* ========================================================= */}
      {complaintModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <h2 className="text-lg font-bold text-primary">
                  {isAr ? 'الإبلاغ عن مشكلة في الجلسة' : 'Report an Issue'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setComplaintModalBooking(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-background transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleComplaintSubmit} className="mt-5 space-y-4">
              {complaintError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                  {complaintError}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {isAr
                  ? 'نحن هنا لضمان حقوقك وتجربة موثوقة. سيقوم فريق الدعم بمراجعة بلاغك والتواصل معك فوراً.'
                  : 'We are here to help. Our operations and dispute team will review this report and take appropriate action.'}
              </p>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  {isAr ? 'نوع المشكلة' : 'Issue Category'}
                </label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-accent"
                >
                  <option value="no_show">
                    {isAr ? 'الخبير لم يحضر الجلسة (غياب)' : 'Expert did not attend (No-Show)'}
                  </option>
                  <option value="technical_issue">
                    {isAr ? 'مشاكل تقنية في رابط الاجتماع أو الصوت' : 'Technical / Audio-Video issue'}
                  </option>
                  <option value="session_shortened">
                    {isAr ? 'الجلسة انتهت قبل وقتها المحدد' : 'Session ended prematurely'}
                  </option>
                  <option value="service_quality">
                    {isAr ? 'محتوى الجلسة لم يطابق الوصف' : 'Service quality discrepancy'}
                  </option>
                  <option value="billing_payment">
                    {isAr ? 'مشكلة في الدفع أو الإيصال' : 'Payment or receipt dispute'}
                  </option>
                  <option value="other">{isAr ? 'مشكلة أخرى' : 'Other problem'}</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  {isAr ? 'عنوان المشكلة' : 'Subject'}
                </label>
                <input
                  type="text"
                  required
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  {isAr ? 'تفاصيل ما حدث' : 'Detailed Description'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={
                    isAr
                      ? 'يرجى توضيح ما حدث بدقة لمساعدتنا على معالجة المشكلة والتحقق من السجلات...'
                      : 'Please explain what happened in detail so we can investigate with meeting telemetry and resolve this promptly...'
                  }
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setComplaintModalBooking(null)}
                  className="rounded-full px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-background transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingComplaint}
                  className="rounded-full bg-rose-600 hover:bg-rose-700 px-6 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 shadow-xs"
                >
                  {submittingComplaint
                    ? isAr
                      ? 'جاري الإرسال...'
                      : 'Submitting...'
                    : isAr
                      ? 'إرسال البلاغ'
                      : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. RESCHEDULE MODAL                                        */}
      {/* ========================================================= */}
      {rescheduleModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <RotateCcw size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-primary">
                  {isAr ? 'إعادة جدولة الجلسة' : 'Reschedule Consultation'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalBooking(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-background transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-5 space-y-4">
              {rescheduleError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                  {rescheduleError}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {isAr
                  ? `اختر موعداً جديداً مناسباً من الأيام المتاحة لدى الخبير ${rescheduleModalBooking.expert.name}:`
                  : `Select a new available date and time slot with ${rescheduleModalBooking.expert.name}:`}
              </p>

              {/* Days List */}
              <div>
                <label className="block text-xs font-bold text-primary mb-2">
                  {isAr ? '١. اختر التاريخ الجديد' : '1. Select New Date'}
                </label>
                {loadingDays ? (
                  <p className="text-xs text-muted-foreground">
                    {isAr ? 'جاري تحميل الأيام المتاحة...' : 'Loading available dates...'}
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {rescheduleDays.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        disabled={!d.hasSlots}
                        onClick={() => setSelectedDate(d.date)}
                        className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-center text-xs font-bold transition ${selectedDate === d.date
                            ? 'border-accent bg-accent text-primary shadow-xs'
                            : d.hasSlots
                              ? 'border-border bg-background text-primary hover:border-accent'
                              : 'border-border/40 bg-surface/50 text-muted-foreground/40 cursor-not-allowed'
                          }`}
                      >
                        {formatDateLabel(d.date, isAr ? 'ar' : 'en')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Slots List */}
              {selectedDate && (
                <div>
                  <label className="block text-xs font-bold text-primary mb-2">
                    {isAr ? '٢. اختر الوقت المناسب' : '2. Select Time Slot'}
                  </label>
                  {loadingSlots ? (
                    <p className="text-xs text-muted-foreground">
                      {isAr ? 'جاري تحميل الأوقات...' : 'Loading slots...'}
                    </p>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {isAr ? 'لا توجد أوقات شاغرة في هذا اليوم' : 'No available slots on this date'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {rescheduleSlots.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          disabled={!s.available}
                          onClick={() => setSelectedTime(s.time)}
                          className={`rounded-xl border py-2 text-center text-xs font-bold transition ${selectedTime === s.time
                              ? 'border-primary bg-primary text-white shadow-xs'
                              : s.available
                                ? 'border-border bg-background text-primary hover:border-primary'
                                : 'border-border/40 bg-surface/50 text-muted-foreground/40 cursor-not-allowed'
                            }`}
                        >
                          {formatSlotLabel(s.time, isAr ? 'ar' : 'en')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Optional Reason */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  {isAr ? 'سبب إعادة الجدولة (اختياري)' : 'Reason for rescheduling (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'ملاحظة موجزة للخبير...'
                      : 'Brief note for the expert regarding this schedule change...'
                  }
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRescheduleModalBooking(null)}
                  className="rounded-full px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-background transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingReschedule || !selectedDate || !selectedTime}
                  className="rounded-full bg-accent hover:bg-accent-hover px-6 py-2.5 text-xs font-bold text-primary transition disabled:opacity-50 shadow-xs"
                >
                  {submittingReschedule
                    ? isAr
                      ? 'جاري التأكيد...'
                      : 'Updating...'
                    : isAr
                      ? 'تأكيد الموعد الجديد'
                      : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
