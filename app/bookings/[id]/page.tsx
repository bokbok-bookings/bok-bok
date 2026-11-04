'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BrandLogo } from '@/components/brand/logo'
import { Video, Calendar, Clock, AlertCircle, CheckCircle, ArrowRight, ShieldCheck, UserCheck, XCircle } from 'lucide-react'
import type { TimeSlot, DayAvailability } from '@/lib/data/availability'
import { formatDateLabel, formatSlotLabel } from '@/lib/data/availability'
import { useLanguage } from '@/lib/i18n/language-context'

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlToken = new URLSearchParams(window.location.search).get('token') || ''
      setToken(urlToken)
      fetchBooking(urlToken)
    }
  }, [bookingId])

  const fetchBooking = async (currentToken: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL(`/api/bookings/${bookingId}`, window.location.origin)
      if (currentToken) url.searchParams.set('token', currentToken)

      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success && json.data) {
        setBooking(json.data)
      } else {
        setError(json.error || (isAr ? 'تعذر تحميل تفاصيل الحجز' : 'Failed to load booking details'))
      }
    } catch (err: any) {
      setError(err.message || (isAr ? 'خطأ في تحميل الحجز' : 'Error loading booking'))
    } finally {
      setLoading(false)
    }
  }

  // Load calendar days for rescheduling if allowed
  useEffect(() => {
    if (!booking || !booking.isRescheduleAllowed) return

    setLoadingDays(true)
    fetch(`/api/availability?expertId=${booking.expertId}&action=days&count=14&duration=${booking.durationMinutes || 45}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.days)) {
          setDays(data.days)
          const firstOpen = data.days.find((d: DayAvailability) => d.hasSlots)
          if (firstOpen) setSelectedDate(firstOpen.date)
        }
      })
      .finally(() => setLoadingDays(false))
  }, [booking?.expertId, booking?.isRescheduleAllowed, booking?.durationMinutes])

  // Load slots for selected reschedule date
  useEffect(() => {
    if (!selectedDate || !booking?.expertId) {
      setSlots([])
      return
    }

    setLoadingSlots(true)
    setSelectedTime('')
    fetch(
      `/api/availability?expertId=${booking.expertId}&action=slots&date=${selectedDate}&duration=${booking.durationMinutes || 45}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.slots)) {
          setSlots(data.slots)
          const firstOpen = data.slots.find((s: TimeSlot) => s.available)
          if (firstOpen) setSelectedTime(firstOpen.time)
        }
      })
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, booking?.expertId, booking?.durationMinutes])

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
        setAttendanceFeedback(json.message || (isAr ? 'تم تسجيل حضور الجلسة بنجاح. شكراً لك!' : 'Attendance response recorded. Thank you!'))
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
  const sessionPassed = new Date() >= new Date(booking.sessionEndAt || `${booking.date}T${booking.time}`)
  const serviceTitle = isAr
    ? booking.serviceTitle?.ar || booking.serviceTitle?.en || 'جلسة استشارية'
    : booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-30 px-5 sm:px-8">
        <div className="mx-auto max-w-5xl h-16 flex items-center justify-between">
          <BrandLogo href="/" size="sm" subtitle={isAr ? 'إدارة المواعيد والجلسات' : 'Booking & Meeting Hub'} />
          <span className="font-mono text-xs font-bold text-primary bg-secondary px-3 py-1.5 rounded-full border border-accent/30">
            {isAr ? 'رقم الحجز: ' : 'Ref #'}
            {booking.reference || booking._id?.slice(-6).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        {/* Booking Card */}
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                {booking.expertImage ? (
                  <Image src={booking.expertImage} alt={booking.expertName} fill className="object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-xs font-bold text-primary">EXP</div>
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? 'مع الخبير ' : 'With '}
                  <strong>{booking.expertName}</strong> {booking.expertRole ? `· ${booking.expertRole}` : ''}
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
                {isAr ? 'بيانات المستفيد' : 'Client Contact'}
              </span>
              <p className="text-base font-bold text-primary mt-1 truncate">{booking.clientName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{booking.clientEmail}</p>
            </div>
          </div>

          {/* SECTION 1: Google Meet Access */}
          {isOnline && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="rounded-2xl bg-teal-50 border border-teal-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                    <Video size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-teal-900">
                      {isAr ? 'رابط مكالمة جوجل ميت' : 'Google Meet Room Access'}
                    </h3>
                    {booking.googleMeetLink ? (
                      <p className="text-xs text-teal-800 mt-0.5">
                        {isAr
                          ? 'تم تجهيز رابط الغرفة. انقر للانضمام في التوقيت المحدد.'
                          : 'Your meeting room is configured. Click the button to join the call at the scheduled time.'}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-800 mt-0.5">
                        {isAr
                          ? 'يقوم الخبير بإعداد رابط الغرفة. ستصلك رسالة فور توفره.'
                          : 'The expert is preparing the Google Meet room link. You will receive an email as soon as it is posted.'}
                      </p>
                    )}
                  </div>
                </div>

                {booking.googleMeetLink ? (
                  <a
                    href={booking.googleMeetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition shrink-0"
                  >
                    {isAr ? 'انضم للمكالمة ↗' : 'Join Google Meet ↗'}
                  </a>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200 shrink-0 text-center">
                    {isAr ? 'قيد التجهيز' : 'Link Pending'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Rescheduling System */}
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
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
          ) : (
            <div className="space-y-5">
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

              <div>
                <label className="block text-xs font-bold text-primary mb-2">
                  {isAr ? '١. اختر التاريخ الجديد' : '1. Select New Date'}
                </label>
                {loadingDays ? (
                  <p className="text-xs text-muted-foreground">{isAr ? 'جاري فحص المواعيد...' : 'Loading available dates...'}</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {days.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        disabled={!d.hasSlots}
                        onClick={() => setSelectedDate(d.date)}
                        className={`shrink-0 rounded-2xl p-2.5 text-center transition min-w-[64px] border ${selectedDate === d.date
                            ? 'bg-accent text-primary border-accent shadow-xs font-bold'
                            : d.hasSlots
                              ? 'bg-background text-primary border-border hover:border-primary'
                              : 'bg-neutral-100 text-neutral-400 border-transparent cursor-not-allowed'
                          }`}
                      >
                        <span className="block text-[10px] font-bold uppercase">
                          {new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' }).format(new Date(d.date + 'T00:00:00'))}
                        </span>
                        <span className="block text-base font-black mt-0.5">{d.date.slice(8)}</span>
                      </button>
                    ))}
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
          )}

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

        {/* SECTION 3: Post-Session Attendance Confirmation */}
        <div id="attendance" className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              {isAr ? 'تأكيد حضور الجلسة' : 'Session Attendance Confirmation'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr ? 'تتبع متبادل لحضور الجلسات المكتملة.' : 'Mutual presence tracking for completed appointments.'}
            </p>
          </div>

          {attendanceFeedback && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
              {attendanceFeedback}
            </div>
          )}

          {!sessionPassed ? (
            <div className="rounded-2xl border border-border bg-background p-5 text-center text-xs text-muted-foreground">
              <Clock size={20} className="mx-auto mb-2 text-muted-foreground" />
              <p className="font-bold text-primary">{isAr ? 'الجلسة لم تنته بعد' : 'Session has not concluded yet'}</p>
              <p className="mt-0.5">
                {isAr ? 'سيتاح تأكيد الحضور فور انتهاء موعد الجلسة المحدد.' : 'Attendance confirmation will unlock immediately after your scheduled session ends.'}
              </p>
            </div>
          ) : booking.clientAttendanceReport ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-700" />
                <p className="text-sm font-bold text-emerald-950">
                  {isAr ? 'تم تقديم تقرير الحضور بنجاح' : 'You Submitted Your Attendance Report'}
                </p>
              </div>
              <p className="text-xs text-emerald-900">
                {isAr ? (
                  <>أكدت أنك <strong>{booking.clientAttendanceReport.response === 'attended' ? 'حضرت' : 'لم تحضر'}</strong> هذه الجلسة في {new Date(booking.clientAttendanceReport.submittedAt).toLocaleDateString()}.</>
                ) : (
                  <>You reported that you <strong>{booking.clientAttendanceReport.response === 'attended' ? 'Attended' : 'Did Not Attend'}</strong> this session on {new Date(booking.clientAttendanceReport.submittedAt).toLocaleString()}.</>
                )}
              </p>
              <div className="border-t border-emerald-200/80 pt-2 flex items-center justify-between text-xs font-bold text-emerald-950">
                <span>{isAr ? 'حالة الحضور المعتمدة:' : 'Verified Attendance Status:'}</span>
                <span className="uppercase tracking-wider">{booking.attendanceStatus}</span>
              </div>
            </div>
          ) : !booking.isAttendanceReportingOpen ? (
            <div className="rounded-2xl border border-border bg-background p-5 text-center text-xs text-muted-foreground">
              <p className="font-bold text-primary">{isAr ? 'أغلقت نافذة تأكيد الحضور' : 'Reporting Window Closed'}</p>
              <p className="mt-0.5">
                {isAr ? 'انتهت فترة الـ 24 ساعة المخصصة لتأكيد حضور هذه الجلسة.' : 'The 24-hour attendance reporting window for this appointment has expired.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-bold text-primary">
                {isAr ? 'هل تمت الجلسة المحددة؟' : 'Did your scheduled session take place?'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAr ? 'يرجى تأكيد ما إذا كنت قد التقيت بالخبير عبر رابط جوجل ميت.' : 'Please confirm whether you and the expert attended the Google Meet session.'}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={submittingAttendance}
                  onClick={() => handleAttendanceSubmit('attended')}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-emerald-50 py-4 px-4 text-xs font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white transition disabled:opacity-50"
                >
                  <UserCheck size={18} />
                  <span>{isAr ? 'نعم، حضرت الجلسة' : 'Yes, I Attended Session'}</span>
                </button>

                <button
                  type="button"
                  disabled={submittingAttendance}
                  onClick={() => handleAttendanceSubmit('absent')}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 py-4 px-4 text-xs font-bold text-rose-800 hover:bg-rose-600 hover:text-white transition disabled:opacity-50"
                >
                  <XCircle size={18} />
                  <span>{isAr ? 'لم يحضر الخبير (غياب)' : 'Expert Did Not Attend (No-Show)'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  {isAr ? 'ملاحظات أو تعليقات إضافية (اختياري)' : 'Optional Feedback or Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'شاركنا بأي تفاصيل واجهتها خلال الجلسة...' : 'Share details if you faced technical difficulties or attendance issues...'}
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
