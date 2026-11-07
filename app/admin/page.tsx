'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ExpertVerificationCard,
  type ExpertAdminItem,
} from '@/components/admin/expert-verification-card'
import type { BookingDocItem } from '@/components/dashboard/bookings-manager'
import { Check, X, Eye, ArrowRight, RefreshCw, CalendarCheck, UserCheck } from 'lucide-react'

export default function AdminOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [experts, setExperts] = useState<ExpertAdminItem[]>([])
  const [bookings, setBookings] = useState<BookingDocItem[]>([])
  const [bookingViewMode, setBookingViewMode] = useState<'pending' | 'recent'>('pending')
  const [stats, setStats] = useState({
    pendingBookings: 0,
    pendingExperts: 0,
    pendingServices: 0,
    approvedExperts: 0,
    totalExperts: 0,
    totalUsers: 0,
  })

  // Modals & Action states
  const [docModal, setDocModal] = useState<{ title: string; url: string } | null>(null)
  const [receiptModal, setReceiptModal] = useState<BookingDocItem | null>(null)
  const [bookingActionLoadingId, setBookingActionLoadingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error'
    text: string
  } | null>(null)

  const loadOverviewData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, srvRes, usersRes, bookingsRes] = await Promise.all([
        fetch('/api/admin/experts'),
        fetch('/api/admin/services'),
        fetch('/api/admin/users'),
        fetch('/api/dashboard/bookings'),
      ])

      const [expJson, srvJson, usersJson, bookingsJson] = await Promise.all([
        expRes.json(),
        srvRes.json(),
        usersRes.json(),
        bookingsRes.json(),
      ])

      let pendingExpCount = 0
      let approvedExpCount = 0
      if (expJson.success) {
        setExperts(expJson.data || [])
        pendingExpCount = (expJson.data || []).filter(
          (e: ExpertAdminItem) => e.status === 'pending_review' || Boolean(e.hasPendingInfoUpdate)
        ).length
        approvedExpCount = (expJson.data || []).filter(
          (e: ExpertAdminItem) => e.status === 'approved' || !e.status
        ).length
      }

      let pendingSrvCount = 0
      if (srvJson.success) {
        pendingSrvCount = (srvJson.data || []).filter(
          (s: any) => s.approvalStatus === 'pending'
        ).length
      }

      let userCount = 0
      if (usersJson.success) {
        userCount = (usersJson.data || []).length
      }

      let pendingBookingsCount = 0
      if (bookingsJson.success) {
        const allBookings: BookingDocItem[] = bookingsJson.data || []
        setBookings(allBookings)
        pendingBookingsCount = allBookings.filter(
          (b) => b.status === 'awaiting_verification' || b.status === 'pending'
        ).length
      }

      setStats({
        pendingBookings: pendingBookingsCount,
        pendingExperts: pendingExpCount,
        pendingServices: pendingSrvCount,
        approvedExperts: approvedExpCount,
        totalExperts: expJson.data?.length || 0,
        totalUsers: userCount,
      })
    } catch (err) {
      console.error('Failed to load admin overview:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab')
      if (
        urlTab &&
        ['queue', 'services', 'bookings', 'attendance', 'categories', 'experts', 'users'].includes(
          urlTab
        )
      ) {
        router.replace(`/admin/${urlTab}`)
        return
      }
    }
    loadOverviewData()
  }, [loadOverviewData, router])

  const handleBookingQuickAction = async (
    booking: BookingDocItem,
    action: 'approve' | 'reject'
  ) => {
    let adminNotes = ''
    if (action === 'reject') {
      const reason = prompt('Reason for declining this booking (sent to client):')
      if (reason === null) return
      adminNotes = reason
    } else {
      if (
        !confirm(
          `Confirm booking #${booking.reference || booking._id.slice(-6)} for ${booking.clientName}? This will generate a Google Meet link and notify both client and expert.`
        )
      ) {
        return
      }
    }

    setBookingActionLoadingId(booking._id)
    setFeedback(null)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: booking._id,
          action,
          adminNotes,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setFeedback({
          type: json.warning ? 'warning' : 'success',
          text:
            json.warning ||
            (action === 'approve'
              ? `Booking #${booking.reference || ''} confirmed! Google Meet created & confirmation emails sent.`
              : `Booking #${booking.reference || ''} declined.`),
        })
        await loadOverviewData()
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          text: json.error || 'Failed to update booking.',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Network error while updating booking.',
      })
    } finally {
      setBookingActionLoadingId(null)
    }
  }

  const handleExpertAction = async (
    expertId: string,
    action: 'approve' | 'reject' | 'suspend' | 'approve_info_update' | 'reject_info_update'
  ) => {
    let rejectionReason = ''
    if (action === 'reject' || action === 'reject_info_update') {
      const reason = prompt('Rejection reason or required improvements for the expert:')
      if (reason === null) return
      rejectionReason = reason
    } else if (action === 'approve_info_update') {
      if (!confirm('Approve and publish these requested Info changes?')) return
    } else {
      if (!confirm(`Are you sure you want to ${action} this expert?`)) return
    }

    try {
      const res = await fetch('/api/admin/experts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, action, rejectionReason }),
      })
      const json = await res.json()
      if (json.success) {
        await loadOverviewData()
        router.refresh()
      } else {
        alert(json.error || 'Failed to update expert')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating expert')
    }
  }

  const pendingExperts = experts.filter(
    (e) => e.status === 'pending_review' || Boolean(e.hasPendingInfoUpdate)
  )
  const pendingBookingsList = bookings.filter(
    (b) => b.status === 'awaiting_verification' || b.status === 'pending'
  )
  const displayedBookings =
    bookingViewMode === 'pending' ? pendingBookingsList : bookings.slice(0, 15)

  const expertNameMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const exp of experts) {
      map[exp._id] = exp.name
    }
    return map
  }, [experts])

  if (loading) {
    return (
      <div className="py-24 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
            Loading Admin Overview...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#eeeae4] pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Administrator Workspace
          </span>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
            Platform Overview
          </h1>
          <p className="text-xs text-[#637084] mt-0.5">
            Monitor and action all pending bookings, expert activations, and platform operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadOverviewData()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <Link
            href="/admin/bookings"
            className="rounded-full bg-[#14243b] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e3454] transition shadow-xs"
          >
            All Bookings ({bookings.length})
          </Link>
          <Link
            href="/admin/queue"
            className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-primary transition hover:bg-accent-hover shadow-xs"
          >
            Expert Queue ({pendingExperts.length})
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold flex items-center justify-between ${feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : feedback.type === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-4 text-xs font-bold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Key Metrics Row (Clickable to navigate to dedicated pages) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/admin/bookings"
          className="group rounded-3xl bg-[#14243b] p-5 text-white shadow-sm hover:bg-[#1c314f] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/60">
              Pending Bookings
            </span>
            <ArrowRight
              size={14}
              className="text-accent opacity-70 group-hover:translate-x-0.5 transition"
            />
          </div>
          <p className="mt-2.5 text-3xl font-black text-accent">{stats.pendingBookings}</p>
          <p className="mt-1 text-xs text-white/75">Receipts awaiting confirmation</p>
        </Link>

        <Link
          href="/admin/queue"
          className="group rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              Experts Pending
            </span>
            <ArrowRight
              size={14}
              className="text-amber-800 opacity-70 group-hover:translate-x-0.5 transition"
            />
          </div>
          <p className="mt-2.5 text-3xl font-black text-amber-900">{stats.pendingExperts}</p>
          <p className="mt-1 text-xs text-amber-800/80">Awaiting activation or info review</p>
        </Link>

        <Link
          href="/admin/services"
          className="group rounded-3xl border border-[#e7e2da] bg-white p-5 shadow-xs hover:border-[#14243b] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a1]">
              Pending Offers
            </span>
            <ArrowRight
              size={14}
              className="text-[#8b94a1] group-hover:translate-x-0.5 transition"
            />
          </div>
          <p className="mt-2.5 text-3xl font-bold text-[#14243b]">{stats.pendingServices}</p>
          <p className="mt-1 text-xs text-[#637084]">Services awaiting approval</p>
        </Link>

        <Link
          href="/admin/experts"
          className="group rounded-3xl border border-[#e7e2da] bg-white p-5 shadow-xs hover:border-[#14243b] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a1]">
              Live Experts
            </span>
            <ArrowRight
              size={14}
              className="text-[#8b94a1] group-hover:translate-x-0.5 transition"
            />
          </div>
          <p className="mt-2.5 text-3xl font-bold text-[#14243b]">{stats.approvedExperts}</p>
          <p className="mt-1 text-xs text-[#637084]">of {stats.totalExperts} total profiles</p>
        </Link>

        <Link
          href="/admin/users"
          className="group rounded-3xl border border-[#e7e2da] bg-white p-5 shadow-xs hover:border-[#14243b] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a1]">
              Platform Users
            </span>
            <ArrowRight
              size={14}
              className="text-[#8b94a1] group-hover:translate-x-0.5 transition"
            />
          </div>
          <p className="mt-2.5 text-3xl font-bold text-[#14243b]">{stats.totalUsers}</p>
          <p className="mt-1 text-xs text-[#637084]">Admins, experts &amp; clients</p>
        </Link>
      </div>

      {/* SECTION 1: Pending Bookings (All Recent) */}
      <section className="rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeeae4] pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-[#14243b] text-accent flex items-center justify-center shrink-0">
              <CalendarCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#14243b]">
                  Pending Bookings (All Recent)
                </h2>
                <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-black text-amber-900">
                  {pendingBookingsList.length} pending
                </span>
              </div>
              <p className="text-xs text-[#637084]">
                Verify payment receipts, confirm bookings, and automatically generate Google Meet links.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-[#dedbd5] bg-[#faf8f5] p-1">
              <button
                type="button"
                onClick={() => setBookingViewMode('pending')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${bookingViewMode === 'pending'
                  ? 'bg-[#14243b] text-white'
                  : 'text-[#637084] hover:text-[#14243b]'
                  }`}
              >
                Pending Verification ({pendingBookingsList.length})
              </button>
              <button
                type="button"
                onClick={() => setBookingViewMode('recent')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${bookingViewMode === 'recent'
                  ? 'bg-[#14243b] text-white'
                  : 'text-[#637084] hover:text-[#14243b]'
                  }`}
              >
                All Recent ({Math.min(bookings.length, 15)})
              </button>
            </div>

            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 rounded-full border border-[#dedbd5] bg-white px-3.5 py-1.5 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition"
            >
              Full Bookings Manager <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {displayedBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dedbd5] bg-[#faf8f5] py-12 text-center">
            <p className="text-sm font-bold text-[#14243b]">
              {bookingViewMode === 'pending'
                ? 'All Pending Bookings Have Been Verified!'
                : 'No Bookings Found'}
            </p>
            <p className="mt-1 text-xs text-[#637084]">
              {bookingViewMode === 'pending'
                ? 'There are no bookings awaiting receipt verification right now.'
                : 'No bookings have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedBookings.map((b) => {
              const isPendingBooking =
                b.status === 'awaiting_verification' || b.status === 'pending'
              const isActionLoading = bookingActionLoadingId === b._id
              const expertName = expertNameMap[b.expertId] || 'Expert'

              return (
                <div
                  key={b._id}
                  className={`rounded-2xl border p-4 sm:p-5 transition ${isPendingBooking
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-[#eeeae4] bg-[#faf8f5]'
                    }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-primary bg-white border border-[#dedbd5] px-2.5 py-0.5 rounded-lg">
                          #{b.reference || b._id.slice(-6)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isPendingBooking
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                        >
                          {b.status === 'awaiting_verification'
                            ? 'Awaiting Verification'
                            : b.status}
                        </span>
                        <span className="text-xs font-bold text-[#14243b]">
                          {b.serviceTitle?.en || b.serviceTitle?.ar || 'Consultation Session'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#637084]">
                        <span>
                          Client: <strong className="text-[#14243b]">{b.clientName}</strong> (
                          {b.clientEmail}
                          {b.clientPhone ? ` · ${b.clientPhone}` : ''})
                        </span>
                        <span>
                          Expert: <strong className="text-[#14243b]">{expertName}</strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#637084]">
                        <span>
                          📅 <strong className="text-[#14243b]">{b.date}</strong> at{' '}
                          <strong className="text-[#14243b]">{b.time}</strong> ({b.durationMinutes}m)
                        </span>
                        {b.amount !== undefined && (
                          <span>
                            💰{' '}
                            <strong className="text-[#14243b]">
                              {b.amount} {b.currency || 'EGP'}
                            </strong>{' '}
                            ({b.paymentMethod || 'instapay'})
                          </span>
                        )}
                        {b.createdAt && (
                          <span className="text-[11px] text-[#8b94a1]">
                            Booked {new Date(b.createdAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {b.paymentReceiptUrl && (
                        <button
                          type="button"
                          onClick={() => setReceiptModal(b)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd5] bg-white px-3.5 py-1.5 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition shadow-2xs"
                        >
                          <Eye size={13} /> View Receipt
                        </button>
                      )}

                      <Link
                        href={`/bookings/${b._id}${b.rescheduleToken ? `?token=${b.rescheduleToken}` : ''}`}
                        target="_blank"
                        className="rounded-full border border-[#dedbd5] bg-white px-3.5 py-1.5 text-xs font-bold text-[#637084] hover:text-[#14243b] transition"
                      >
                        Booking Page ↗
                      </Link>

                      {isPendingBooking && (
                        <>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleBookingQuickAction(b, 'reject')}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                          >
                            <X size={13} /> Decline
                          </button>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleBookingQuickAction(b, 'approve')}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                          >
                            <Check size={13} />
                            {isActionLoading ? 'Confirming...' : 'Confirm & Create Meet'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Experts Pending Activation */}
      <section className="rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeeae4] pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
              <UserCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#14243b]">
                  Experts Pending Activation
                </h2>
                <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-black text-amber-900">
                  {pendingExperts.length} awaiting review
                </span>
              </div>
              <p className="text-xs text-[#637084]">
                Verify National ID / Commercial Register documents and activate expert profiles for the public directory.
              </p>
            </div>
          </div>

          <Link
            href="/admin/queue"
            className="inline-flex items-center gap-1 rounded-full border border-[#dedbd5] bg-white px-3.5 py-1.5 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition self-start sm:self-auto"
          >
            Open Full Expert Queue <ArrowRight size={13} />
          </Link>
        </div>

        {pendingExperts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dedbd5] bg-[#faf8f5] py-12 text-center">
            <p className="text-sm font-bold text-[#14243b]">Expert Activation Queue is Clear</p>
            <p className="mt-1 text-xs text-[#637084]">
              No experts are currently waiting for profile activation or info edit approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingExperts.map((exp) => (
              <ExpertVerificationCard
                key={exp._id}
                exp={exp}
                onAction={handleExpertAction}
                onPreviewDoc={(doc) => setDocModal(doc)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Document Preview Modal */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative max-w-2xl w-full rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">{docModal.title}</h3>
              <button
                onClick={() => setDocModal(null)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Close ✕
              </button>
            </div>
            <div className="relative h-96 w-full overflow-hidden rounded-2xl bg-neutral-100 border border-border">
              <Image src={docModal.url} alt={docModal.title} fill className="object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipt Preview Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative max-w-xl w-full rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Payment Receipt — #{receiptModal.reference || receiptModal._id.slice(-6)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Client: {receiptModal.clientName} · Amount: {receiptModal.amount}{' '}
                  {receiptModal.currency || 'EGP'}
                </p>
              </div>
              <button
                onClick={() => setReceiptModal(null)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Close ✕
              </button>
            </div>
            <div className="relative h-96 w-full overflow-hidden rounded-2xl bg-neutral-100 border border-border flex items-center justify-center">
              {receiptModal.paymentReceiptUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptModal.paymentReceiptUrl}
                  alt="Payment Receipt"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p className="text-xs text-muted-foreground">No receipt image uploaded</p>
              )}
            </div>
            {(receiptModal.status === 'awaiting_verification' ||
              receiptModal.status === 'pending') && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      const target = receiptModal
                      setReceiptModal(null)
                      handleBookingQuickAction(target, 'reject')
                    }}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    Decline Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = receiptModal
                      setReceiptModal(null)
                      handleBookingQuickAction(target, 'approve')
                    }}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                  >
                    Confirm &amp; Create Meet ✓
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
