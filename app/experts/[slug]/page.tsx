'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import React, { useState, useEffect, use } from 'react'
import { getExpertBySlug } from '@/lib/data/experts'
import type { DayAvailability, TimeSlot } from '@/lib/data/availability'
import { formatDateLabel, formatSlotLabel } from '@/lib/data/availability'

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string }
}

interface ServiceItem {
  _id: string
  slug?: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
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

  // 1. Fetch expert's services
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
          // Fallback service matching default expert pricing
          const defaultService: ServiceItem = {
            _id: 'default',
            title: { en: '1-on-1 Consultation', ar: 'جلسة استشارية فردية' },
            description: { en: profile?.about || '', ar: profile?.about || '' },
            durationMinutes: profile?.durationMinutes || 45,
            breakAfterMinutes: 10,
            pricing: {
              baseCurrency: 'EGP',
              prices: { EGP: profile?.priceNumber || 500, USD: 20, SAR: 75 },
            },
          }
          setServices([defaultService])
          setSelectedService(defaultService)
        }
      })
      .catch(() => {
        const defaultService: ServiceItem = {
          _id: 'default',
          title: { en: '1-on-1 Consultation', ar: 'جلسة استشارية فردية' },
          description: { en: profile?.about || '', ar: profile?.about || '' },
          durationMinutes: profile?.durationMinutes || 45,
          breakAfterMinutes: 10,
          pricing: {
            baseCurrency: 'EGP',
            prices: { EGP: profile?.priceNumber || 500 },
          },
        }
        setServices([defaultService])
        setSelectedService(defaultService)
      })
      .finally(() => setLoadingServices(false))
  }, [profileId, profile?.durationMinutes, profile?.priceNumber, profile?.about])

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

  // Handle receipt upload to Cloudinary
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
      alert('Error uploading receipt. Please try again.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  // Handle booking submission
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !profile) return
    if (!clientName.trim() || !clientEmail.trim()) {
      alert('Please enter your full name and email address')
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
          `Your appointment request has been submitted for ${formatDateLabel(selectedDate)} at ${formatSlotLabel(selectedTime)}.`
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

  if (loadingProfile) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] text-[#14243b]">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8 py-24 text-center">
          <p className="text-sm font-bold text-[#8b94a1]">Loading expert profile...</p>
        </div>
      </main>
    )
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] text-[#14243b]">
        <div className="mx-auto max-w-[1140px] px-5 sm:px-8 py-24 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#14243b]">Expert Not Found</h1>
          <p className="mt-2 text-xs text-[#637084]">
            The expert profile for &quot;{slug}&quot; does not exist or may still be pending review.
          </p>
          <div className="mt-6">
            <Link
              href="/experts"
              className="rounded-full bg-[#14243b] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#ef5b4c]"
            >
              ← Back to All Experts
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const currentPriceEGP = selectedService?.pricing?.prices?.EGP ?? profile.priceNumber ?? 500

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#14243b] overflow-x-hidden">
      <div className="mx-auto max-w-[1140px] px-4 sm:px-8 pb-20 w-full">

        <div className="py-8 w-full min-w-0">
          <Link
            href="/experts"
            className="inline-flex items-center text-xs font-bold text-[#ef5b4c] hover:underline"
          >
            ← Back to directory
          </Link>

          <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] w-full min-w-0">
            {/* Left Column: Expert Details & Services */}
            <div className="min-w-0 w-full space-y-8">
              {/* Expert Hero Profile */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="relative size-28 sm:size-32 shrink-0 overflow-hidden rounded-[24px] bg-[#f5c3a8] border border-[#eeeae4]">
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
                    <span className="rounded-full bg-[#fff2ed] px-2.5 py-0.5 text-[10px] font-bold text-[#ef5b4c]">
                      Vetted expert
                    </span>
                    <span className="text-xs font-semibold text-[#8b94a1]">
                      {profile.location}
                    </span>
                  </div>
                  <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-.04em] text-[#14243b] break-words">
                    {profile.name}
                  </h1>
                  <p className="mt-1 text-base sm:text-lg font-medium text-[#637084] break-words">
                    {profile.role}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#14243b]">
                    {profile.rating || '5.0'} ★{' '}
                    <span className="font-normal text-[#8b94a1]">
                      ({profile.reviews || 0} verified reviews)
                    </span>
                  </p>

                  {/* About Description directly under Expert Title */}
                  {(profile.about || profile.bio) && (
                    <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#637084] break-words max-w-2xl">
                      {profile.about || profile.bio}
                    </p>
                  )}

                  {/* Specialty Tags */}
                  {profile.tags && profile.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(profile.tags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#e7e2da] bg-white px-2.5 py-1 text-[11px] font-bold text-[#637084]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Consultation Services Offered */}
              <div className="border-t border-[#e7e2da] pt-8 min-w-0 w-full">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight text-[#14243b]">Available Services & Offerings</h2>
                  <span className="text-xs text-[#8b94a1]">Select an offering</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 min-w-0 w-full">
                  {services.map((s) => {
                    const isSelected = selectedService?._id === s._id
                    const bType = s.bookingType || 'APPOINTMENT'
                    const sKind = s.serviceKind || 'CONSULTATION'
                    const typeLabel =
                      bType === 'WORKSHOP'
                        ? 'Workshop'
                        : bType === 'WEBINAR'
                          ? 'Webinar'
                          : sKind === 'GENERAL_SERVICE'
                            ? 'Service'
                            : 'Consultation'

                    return (
                      <div
                        key={s._id}
                        onClick={() => setSelectedService(s)}
                        className={`cursor-pointer rounded-2xl border p-4 transition min-w-0 w-full flex flex-col justify-between ${isSelected
                            ? 'border-[#14243b] bg-[#14243b] text-white shadow-md'
                            : 'border-[#dedbd5] bg-white text-[#14243b] hover:border-[#14243b]'
                          }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-slate-100 text-slate-700'
                                    }`}
                                >
                                  {typeLabel}
                                </span>
                                {s.isMostBooked && (
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${isSelected
                                        ? 'bg-[#ef5b4c] text-white'
                                        : 'bg-[#ef5b4c]/10 text-[#ef5b4c]'
                                      }`}
                                  >
                                    Most Booked
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-1 text-sm font-bold leading-snug break-words">{s.title.en}</h3>
                              <p
                                className={`text-[11px] mt-0.5 break-words ${isSelected ? 'text-white/70' : 'text-[#8b94a1]'
                                  }`}
                                dir="rtl"
                              >
                                {s.title.ar}
                              </p>
                            </div>
                            <span className="text-sm font-black whitespace-nowrap shrink-0 ml-2">
                              {s.pricing?.prices?.EGP ?? profile.priceNumber} EGP
                            </span>
                          </div>
                          {s.description?.en && (
                            <p
                              className={`mt-2 text-xs line-clamp-2 leading-relaxed break-words ${isSelected ? 'text-white/80' : 'text-[#637084]'
                                }`}
                            >
                              {s.description.en}
                            </p>
                          )}
                        </div>
                        <div
                          className={`mt-3 pt-2.5 border-t text-[10px] font-semibold flex items-center justify-between ${isSelected ? 'border-white/15 text-white/60' : 'border-[#f4f2ee] text-[#8b94a1]'
                            }`}
                        >
                          <span>Duration: {s.durationMinutes} min</span>
                          <Link
                            href={`/services/${s.slug || s._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`hover:underline font-bold ${isSelected ? 'text-[#f5c3a8]' : 'text-[#ef5b4c]'}`}
                          >
                            Details ↗
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Live Booking & InstaPay Widget */}
            <aside className="h-fit rounded-[32px] bg-[#14243b] p-5 sm:p-6 text-white shadow-xl min-w-0 w-full overflow-hidden">
              <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-3xl font-semibold tracking-tight">
                    {currentPriceEGP} EGP
                  </span>
                  <span className="ml-2 text-xs text-[#b9c2ce]">
                    / {duration} min session
                  </span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-[#f5c3a8]">
                  InstaPay Payment
                </span>
              </div>

              {booked ? (
                <div className="mt-6 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 p-5 text-center space-y-3">
                  <span className="text-2xl">✓</span>
                  <h3 className="text-base font-bold text-emerald-300">Appointment Requested</h3>
                  <p className="text-xs text-white/90 leading-5">{bookingSuccessMsg}</p>
                  <div className="rounded-xl bg-black/30 p-2.5 font-mono text-xs font-bold text-emerald-200">
                    Booking Reference: {bookingReference}
                  </div>
                  <p className="text-[11px] text-white/70">
                    Your InstaPay receipt has been submitted. Our team will verify the transfer and confirm your calendar appointment.
                  </p>
                </div>
              ) : (
                <>
                  {/* Step 1: Pick a Date */}
                  <div className="mt-5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#f5c3a8]">
                      1. Select Date
                    </label>
                    {loadingDays ? (
                      <p className="mt-2 text-xs text-[#b9c2ce]">Checking calendar...</p>
                    ) : (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {days.map((d) => {
                          const isSelected = selectedDate === d.date
                          const isClosed = !d.hasSlots

                          return (
                            <button
                              key={d.date}
                              disabled={isClosed}
                              onClick={() => setSelectedDate(d.date)}
                              className={`shrink-0 rounded-2xl border px-3 py-2 text-center transition ${isSelected
                                  ? 'border-[#ef5b4c] bg-[#ef5b4c] text-white shadow-sm'
                                  : isClosed
                                    ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                                    : 'border-white/15 bg-white/10 text-white hover:border-white/40'
                                }`}
                            >
                              <span className="block text-[10px] font-bold uppercase">
                                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
                                  new Date(d.date + 'T00:00:00')
                                )}
                              </span>
                              <span className="block text-sm font-semibold">
                                {new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(
                                  new Date(d.date + 'T00:00:00')
                                )}
                              </span>
                              {isClosed && (
                                <span className="mt-0.5 block text-[9px] text-[#ef5b4c]">Closed</span>
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
                      <label className="text-xs font-bold uppercase tracking-wider text-[#f5c3a8]">
                        2. Select Time Slot
                      </label>
                      {selectedDate && (
                        <span className="text-[11px] text-[#b9c2ce]">
                          {formatDateLabel(selectedDate)}
                        </span>
                      )}
                    </div>

                    {loadingSlots ? (
                      <p className="mt-2 text-xs text-[#b9c2ce]">Loading available times...</p>
                    ) : slots.length === 0 ? (
                      <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/60">
                        No open consultation slots on this date.
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
                                  ? 'border-[#ef5b4c] bg-[#ef5b4c] text-white shadow-sm'
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#f5c3a8]">
                      3. Your Contact Details
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name *"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-[#ef5b4c]"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email Address *"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-[#ef5b4c]"
                    />
                    <input
                      type="tel"
                      placeholder="WhatsApp / Phone Number"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-[#ef5b4c]"
                    />
                  </div>

                  {/* Step 4: InstaPay Payment Instructions & Receipt Upload */}
                  <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#f5c3a8]">
                      4. InstaPay Payment
                    </p>
                    <div className="text-xs leading-relaxed text-white/80 space-y-1">
                      <p>
                        Transfer <strong>{currentPriceEGP} EGP</strong> to InstaPay address:
                      </p>
                      <p className="rounded-lg bg-black/40 px-2.5 py-1 font-mono text-[11px] font-bold text-white selection:bg-[#ef5b4c]">
                        bokbok@instapay
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#b9c2ce] mb-1.5">
                        Upload Transfer Receipt:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        disabled={uploadingReceipt}
                        className="w-full max-w-full min-w-0 text-xs text-white/70 file:mr-2.5 file:rounded-full file:border-0 file:bg-white/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-[#ef5b4c] truncate"
                      />
                      {uploadingReceipt && (
                        <p className="mt-1 text-[10px] text-amber-300">Uploading receipt...</p>
                      )}
                      {receiptUrl && (
                        <p className="mt-1 text-[10px] text-emerald-300">✓ Receipt attached</p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={!selectedTime || bookingLoading || uploadingReceipt}
                    onClick={handleBooking}
                    className="mt-5 flex w-full items-center justify-center rounded-full bg-[#ef5b4c] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-white hover:text-[#14243b] disabled:opacity-40"
                  >
                    {bookingLoading
                      ? 'Submitting appointment...'
                      : selectedTime
                        ? `Book & Submit Receipt`
                        : 'Choose a date & time'}
                  </button>
                </>
              )}

              <p className="mt-4 text-center text-[11px] text-white/50">
                Reschedule or cancel up to 12 hours before session
              </p>
            </aside>
          </section>
        </div>
      </div>
    </main>
  )
}
