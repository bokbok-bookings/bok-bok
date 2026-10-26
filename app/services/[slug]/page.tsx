'use client'

import React, { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Share2,
  Check,
  Star,
  Users,
  Video,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import type { DayAvailability, TimeSlot } from '@/lib/data/availability'
import { formatDateLabel, formatSlotLabel } from '@/lib/data/availability'

interface ServiceDetailPageProps {
  params: Promise<{ slug: string }> | { slug: string }
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
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

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingReceipt(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload?type=receipt', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success && json.url) {
        setReceiptUrl(json.url)
      } else {
        alert(json.error || 'Failed to upload receipt')
      }
    } catch {
      alert('Error uploading receipt')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleBook = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert('Please enter your full name and email address')
      return
    }
    if (!isEvent && (!selectedDate || !selectedTime)) {
      alert('Please select a date and time slot')
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
        setBookingSuccessMsg(
          isEvent
            ? `Your seat for "${service.title.en}" has been reserved!`
            : `Your booking request has been submitted for ${formatDateLabel(selectedDate)} at ${formatSlotLabel(selectedTime)}.`
        )
      } else {
        alert(data.error || 'Failed to complete booking')
      }
    } catch {
      alert('An error occurred while booking.')
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] text-[#14243b] flex items-center justify-center p-6">
        <p className="text-sm font-bold text-[#8b94a1]">Loading service details...</p>
      </main>
    )
  }

  if (!service) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] text-[#14243b] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold">Service Not Found</h1>
        <p className="mt-2 text-xs text-[#637084]">This service offering may have been deleted or is inactive.</p>
        <Link href="/services" className="mt-6 rounded-full bg-[#14243b] px-6 py-2.5 text-xs font-bold text-white">
          ← Browse Services
        </Link>
      </main>
    )
  }

  const baseCurrency = service.pricing?.baseCurrency || 'EGP'
  const price = service.pricing?.prices?.[baseCurrency] ?? 0

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#14243b] overflow-x-hidden">
      <div className="mx-auto max-w-[1140px] px-4 sm:px-8 pb-20 w-full min-w-0">
        {/* Action / Breadcrumb Bar */}
        <div className="flex py-5 flex-wrap items-center justify-between gap-4 border-b border-[#e7e2da] min-w-0">
          <Link
            href={isEvent ? (service.bookingType === 'WORKSHOP' ? '/workshops' : '/webinars') : '/services'}
            className="text-xs font-bold text-[#ef5b4c] hover:underline"
          >
            ← Back to Catalog
          </Link>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd5] bg-white px-3.5 py-1.5 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Share2 size={13} />}
            {copied ? 'Link Copied!' : 'Share Service'}
          </button>
        </div>

        <div className="mt-8 sm:mt-10 grid gap-8 lg:gap-12 lg:grid-cols-[1.3fr_1fr] items-start w-full min-w-0">
          {/* Left Column: Offering details & Provider Card */}
          <div className="space-y-8 min-w-0 w-full">
            <div>
              {/* Type & Delivery Mode Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#ef5b4c]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#ef5b4c]">
                  {service.bookingType === 'WORKSHOP'
                    ? 'Workshop'
                    : service.bookingType === 'WEBINAR'
                      ? 'Webinar'
                      : service.serviceKind === 'GENERAL_SERVICE'
                        ? 'General Service'
                        : '1-on-1 Consultation'}
                </span>
                <span className="rounded-full bg-[#faf8f5] border border-[#dedbd5] px-3 py-1 text-xs font-semibold text-[#637084]">
                  {service.deliveryMode === 'ONLINE' ? '🌐 Online Remote' : service.deliveryMode === 'IN_PERSON' ? '📍 In-Person' : '🔄 Hybrid'}
                </span>
                {service.categorySlug && (
                  <span className="rounded-full bg-[#faf8f5] border border-[#dedbd5] px-3 py-1 text-xs font-semibold text-[#637084]">
                    {service.categorySlug}
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#14243b] leading-tight break-words">
                {service.title.en}
              </h1>
              <p className="mt-1 text-base font-semibold text-[#8b94a1] break-words" dir="rtl">
                {service.title.ar}
              </p>

              {/* Quick Info Grid */}
              <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#637084] border-y border-[#e7e2da] py-4 min-w-0">
                {isEvent ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#ef5b4c] shrink-0" />
                      <span>{service.event?.date} · {service.event?.startTime} to {service.event?.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#ef5b4c] shrink-0" />
                      <span>Capacity: {service.event?.capacity || 20} seats ({service.event?.registeredCount || 0} enrolled)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#ef5b4c] shrink-0" />
                      <span>{service.durationMinutes} minutes session</span>
                    </div>
                    {service.breakAfterMinutes > 0 && (
                      <span className="text-[11px] text-[#8b94a1]">({service.breakAfterMinutes}m break buffer)</span>
                    )}
                  </>
                )}

                {service.deliveryMode !== 'ONLINE' && service.location?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#ef5b4c] shrink-0" />
                    <span>{service.location.address}{service.location.city ? `, ${service.location.city}` : ''}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-6 space-y-4 min-w-0">
                <h2 className="text-base font-bold text-[#14243b]">About This Offering</h2>
                {service.description?.en && (
                  <p className="text-sm leading-relaxed text-[#4b5565] whitespace-pre-line break-words">
                    {service.description.en}
                  </p>
                )}
                {service.description?.ar && (
                  <p className="text-sm leading-relaxed text-[#4b5565] whitespace-pre-line text-right break-words" dir="rtl">
                    {service.description.ar}
                  </p>
                )}
              </div>

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {service.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-white border border-[#dedbd5] px-3 py-1 text-xs font-semibold text-[#637084]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Provider Info Card */}
            {service.expert && (
              <div className="rounded-3xl border border-[#e7e2da] bg-white p-5 sm:p-7 shadow-xs min-w-0 w-full">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b94a1] mb-4">Offered By</p>
                <div className="flex items-start gap-4 min-w-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-[#f5c3a8]">
                    <Image
                      src={service.expert.image || '/experts/layla.png'}
                      alt={service.expert.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <h3 className="text-lg font-bold text-[#14243b] truncate">{service.expert.name}</h3>
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-[#fff9e8] px-2 py-0.5 text-xs font-bold text-[#b17b17]">
                        <Star size={12} fill="currentColor" /> {service.expert.rating}
                      </span>
                    </div>
                    <p className="text-xs text-[#637084] mt-0.5 truncate">{service.expert.role}</p>
                    <p className="text-xs text-[#8b94a1] mt-0.5 truncate">{service.expert.location}</p>
                    {service.expert.bio && (
                      <p className="mt-3 text-xs text-[#637084] line-clamp-3 leading-relaxed break-words">
                        {service.expert.bio}
                      </p>
                    )}
                    {service.expert.slug && (
                      <div className="mt-4">
                        <Link
                          href={`/experts/${service.expert.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#ef5b4c] hover:underline"
                        >
                          View Full Expert Profile <ArrowRight size={13} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Booking & Payment Card */}
          <aside className="sticky top-10 rounded-[32px] bg-[#14243b] p-5 sm:p-7 text-white shadow-xl min-w-0 w-full max-w-full">
            <div className="flex items-baseline justify-between border-b border-white/10 pb-5 min-w-0">
              <div className="min-w-0">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {price} {baseCurrency}
                </span>
                <span className="ml-2 text-xs text-[#b9c2ce]">
                  {isEvent ? '/ attendee ticket' : `/ ${service.durationMinutes} min session`}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#f5c3a8]">
                InstaPay
              </span>
            </div>

            {booked ? (
              <div className="mt-6 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 p-5 text-center space-y-3">
                <span className="text-2xl">✓</span>
                <h3 className="text-base font-bold text-emerald-300">Registration Complete</h3>
                <p className="text-xs text-white/90 leading-relaxed">{bookingSuccessMsg}</p>
                <div className="rounded-xl bg-black/40 p-2.5 font-mono text-xs font-bold text-emerald-200">
                  Reference: {bookingReference}
                </div>
                <p className="text-[11px] text-white/70">
                  Our team will verify the InstaPay transfer and you will receive full instructions and calendar invite by email.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5 min-w-0 w-full">
                {/* Step 1: Schedule (if appointment) */}
                {!isEvent && (
                  <>
                    <div className="min-w-0 w-full">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#b9c2ce] mb-2">
                        1. Select Date
                      </label>
                      {loadingDays ? (
                        <p className="text-xs text-white/60">Loading available dates...</p>
                      ) : days.length === 0 ? (
                        <p className="text-xs text-white/60">No available dates found for this duration.</p>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full min-w-0 max-w-full">
                          {days.map((d) => (
                            <button
                              key={d.date}
                              type="button"
                              disabled={!d.hasSlots}
                              onClick={() => setSelectedDate(d.date)}
                              className={`shrink-0 rounded-2xl p-2.5 text-center transition min-w-[64px] ${selectedDate === d.date
                                  ? 'bg-[#ef5b4c] text-white shadow-md'
                                  : d.hasSlots
                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                                }`}
                            >
                              <span className="block text-[10px] font-bold uppercase">
                                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
                                  new Date(d.date + 'T00:00:00')
                                )}
                              </span>
                              <span className="block text-base font-black mt-0.5">
                                {d.date.slice(8)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedDate && (
                      <div className="min-w-0 w-full">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#b9c2ce] mb-2">
                          2. Select Time Slot ({formatDateLabel(selectedDate)})
                        </label>
                        {loadingSlots ? (
                          <p className="text-xs text-white/60">Loading available slots...</p>
                        ) : slots.length === 0 ? (
                          <p className="text-xs text-rose-300">No open slots on this day.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 min-w-0">
                            {slots.map((s) => (
                              <button
                                key={s.time}
                                type="button"
                                disabled={!s.available}
                                onClick={() => setSelectedTime(s.time)}
                                className={`rounded-xl py-2 px-2 text-xs font-bold transition ${selectedTime === s.time
                                    ? 'bg-[#ef5b4c] text-white shadow-sm'
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b9c2ce]">
                    {isEvent ? '1. Your Information' : '3. Your Information'}
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#ef5b4c]"
                  />
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#ef5b4c]"
                  />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Phone Number (e.g. +20 10...)"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#ef5b4c]"
                  />
                </div>

                {/* Step 3: InstaPay Transfer Instructions */}
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs space-y-1">
                    <p className="font-bold text-[#f5c3a8]">InstaPay Payment Details</p>
                    <p className="text-white/80 font-mono text-[11px]">IPA: bokbok@instapay</p>
                    <p className="text-white/80 font-mono text-[11px]">Amount: {price} {baseCurrency}</p>
                    <p className="text-[10px] text-white/60">
                      Transfer via your banking app or InstaPay, then upload the confirmation receipt below.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#b9c2ce] mb-1">
                      Upload InstaPay Transfer Receipt
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                      disabled={uploadingReceipt}
                      className="block w-full text-xs text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-white/20"
                    />
                    {uploadingReceipt && <p className="text-[11px] text-[#f5c3a8] mt-1">Uploading receipt...</p>}
                    {receiptUrl && <p className="text-[11px] text-emerald-400 mt-1 font-bold">✓ Receipt attached</p>}
                  </div>
                </div>

                {/* Submit Booking */}
                <button
                  type="button"
                  disabled={bookingLoading || (!isEvent && (!selectedDate || !selectedTime))}
                  onClick={handleBook}
                  className="w-full rounded-full bg-[#ef5b4c] py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#ff7568] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? 'Processing Booking...' : isEvent ? 'Confirm Registration' : 'Confirm & Request Session'}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-white/50 pt-1">
                  <ShieldCheck size={14} className="text-[#ef5b4c]" />
                  <span>Secure booking with direct expert confirmation</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
