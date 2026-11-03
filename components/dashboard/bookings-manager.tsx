'use client'

import React, { useState, useEffect, useCallback } from 'react'

export interface BookingDocItem {
  _id: string
  reference?: string
  expertId: string
  serviceTitle?: { en: string; ar: string }
  clientName: string
  clientEmail: string
  clientPhone?: string
  date: string
  time: string
  durationMinutes: number
  amount?: number
  currency?: string
  status: string
  paymentMethod?: string
  paymentStatus?: string
  paymentReceiptUrl?: string
  adminNotes?: string
  googleMeetLink?: string
  googleCalendarEventLink?: string
  googleCalendarEventId?: string
  googleMeetError?: string
  createdAt: string
}

interface CalendarConnectionStatus {
  state: 'connected' | 'expired' | 'not_connected' | 'not_configured'
  calendarEmail?: string
  updatedAt?: string
  message: string
}

interface BookingsManagerProps {
  expertId?: string
  isAdmin?: boolean
}

function isSafeHttpsUrl(value?: string): boolean {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function BookingsManager({ expertId, isAdmin = false }: BookingsManagerProps) {
  const [bookings, setBookings] = useState<BookingDocItem[]>([])
  const [calendarStatus, setCalendarStatus] = useState<CalendarConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'awaiting_verification' | 'confirmed' | 'all'>(
    'awaiting_verification',
  )
  const [selectedReceipt, setSelectedReceipt] = useState<BookingDocItem | null>(null)
  const [actionModal, setActionModal] = useState<{
    booking: BookingDocItem
    action: 'approve' | 'reject' | 'cancel'
  } | null>(null)
  const [declineNotes, setDeclineNotes] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error'
    text: string
    meetLink?: string
  } | null>(null)

  const loadBookings = useCallback(
    async (refreshCalendar = false) => {
      setLoading(true)
      try {
        const url = new URL('/api/dashboard/bookings', window.location.origin)
        if (expertId) url.searchParams.set('expertId', expertId)
        if (statusFilter !== 'all') url.searchParams.set('status', statusFilter)
        if (isAdmin) {
          url.searchParams.set('includeCalendarStatus', 'true')
          if (refreshCalendar) {
            url.searchParams.set('refreshCalendarStatus', 'true')
          }
        }

        const res = await fetch(url.toString())
        const json = await res.json()
        if (json.success) {
          setBookings(json.data || [])
          if (json.calendarStatus) {
            setCalendarStatus(json.calendarStatus)
          }
        }
      } catch {
        setFeedback({ type: 'error', text: 'Failed to load bookings from server.' })
      } finally {
        setLoading(false)
      }
    },
    [expertId, statusFilter, isAdmin],
  )

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const executeBookingAction = async (
    id: string,
    action: 'approve' | 'reject' | 'cancel' | 'generate_meet',
    adminNotes = '',
  ) => {
    setActionLoadingId(id)
    setFeedback(null)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, adminNotes }),
      })
      const json = await res.json()

      if (json.success) {
        setSelectedReceipt(null)
        setActionModal(null)
        setDeclineNotes('')

        if (json.calendarWarning) {
          setFeedback({
            type: 'warning',
            text: json.calendarWarning,
          })
          await loadBookings(true)
        } else {
          setFeedback({
            type: 'success',
            text: json.message || 'Booking updated successfully.',
            meetLink: json.googleMeetLink || undefined,
          })
          await loadBookings(action === 'generate_meet')
        }
      } else {
        setFeedback({
          type: 'error',
          text: json.error || 'Failed to update booking.',
        })
        await loadBookings(true)
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Network error while updating booking.',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSyncAllMissingMeet = async () => {
    setSyncingAll(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all_missing_meet' }),
      })
      const json = await res.json()
      if (json.success) {
        setFeedback({
          type: 'success',
          text: json.message || 'Synced missing Google Meet links.',
        })
      } else {
        setFeedback({
          type: 'error',
          text: json.error || 'Could not sync missing Google Meet links.',
        })
      }
      await loadBookings(true)
    } catch {
      setFeedback({
        type: 'error',
        text: 'Network error while syncing Google Meet links.',
      })
    } finally {
      setSyncingAll(false)
    }
  }

  const handleCopyMeet = async (bookingId: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(bookingId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Clipboard API unavailable
    }
  }

  const missingMeetCount = bookings.filter(
    (b) => b.status === 'confirmed' && !b.googleMeetLink,
  ).length

  return (
    <div className="space-y-5">
      {/* Admin Google Calendar & Meet Connection Health Banner */}
      {isAdmin && calendarStatus && (
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            calendarStatus.state === 'connected'
              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-950'
              : 'border-amber-500/40 bg-amber-50 text-amber-950'
          }`}
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-block size-2.5 rounded-full ${
                  calendarStatus.state === 'connected' ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              />
              <p className="text-xs font-extrabold uppercase tracking-wider">
                {calendarStatus.state === 'connected'
                  ? 'Google Calendar & Meet Active'
                  : calendarStatus.state === 'expired'
                    ? 'Google Calendar OAuth Token Expired — Action Required'
                    : 'Google Calendar & Meet Disconnected'}
              </p>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{calendarStatus.message}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {calendarStatus.state === 'connected' && missingMeetCount > 0 && (
              <button
                type="button"
                onClick={handleSyncAllMissingMeet}
                disabled={syncingAll}
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {syncingAll
                  ? 'Generating...'
                  : `Generate Missing Meet Links (${missingMeetCount})`}
              </button>
            )}
            <a
              href="/api/auth/google/connect"
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                calendarStatus.state === 'connected'
                  ? 'border border-emerald-700/30 bg-white text-emerald-900 hover:bg-emerald-100'
                  : 'bg-[#14243b] text-white hover:bg-[#2855C5] shadow-sm'
              }`}
            >
              {calendarStatus.state === 'connected'
                ? 'Reconnect Account'
                : 'Reconnect Google Calendar & Meet →'}
            </a>
          </div>
        </div>
      )}

      {/* Action Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : feedback.type === 'warning'
                ? 'border-amber-400 bg-amber-50 text-amber-950'
                : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="space-y-1">
            <p>{feedback.text}</p>
            {feedback.meetLink && isSafeHttpsUrl(feedback.meetLink) && (
              <p className="font-mono text-[11px]">
                Google Meet:{' '}
                <a
                  href={feedback.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold"
                >
                  {feedback.meetLink}
                </a>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {feedback.type !== 'success' && isAdmin && (
              <a
                href="/api/auth/google/connect"
                className="rounded-full bg-[#14243b] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#2855C5]"
              >
                Reconnect Google →
              </a>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded-full px-2.5 py-1 text-xs font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#eeeae4] pb-5">
        <div>
          <h2
            className={`text-2xl font-bold tracking-tight ${
              isAdmin ? 'text-white' : 'text-[#14243b]'
            }`}
          >
            Bookings & Receipts
          </h2>
          <p className={`text-xs mt-1 ${isAdmin ? 'text-slate-300' : 'text-[#637084]'}`}>
            Review incoming appointments, verify InstaPay receipts, and manage Google Meet links.
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-1.5 rounded-2xl bg-[#faf8f5] p-1 border border-[#eeeae4]">
          <button
            type="button"
            onClick={() => setStatusFilter('awaiting_verification')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'awaiting_verification'
                ? 'bg-[#14243b] text-white'
                : 'text-[#637084] hover:text-[#14243b]'
            }`}
          >
            Awaiting Verification / Pending
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('confirmed')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'confirmed'
                ? 'bg-[#14243b] text-white'
                : 'text-[#637084] hover:text-[#14243b]'
            }`}
          >
            Confirmed
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-[#14243b] text-white'
                : 'text-[#637084] hover:text-[#14243b]'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-[#8b94a1]">
          Loading bookings...
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#dedbd5] bg-white p-12 text-center">
          <p className="text-base font-bold text-[#14243b]">No bookings found</p>
          <p className="mt-1 text-xs text-[#637084]">
            {statusFilter === 'awaiting_verification'
              ? 'No pending bookings or receipts waiting for verification right now.'
              : 'No appointments match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#e7e2da] bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#f4f2ee] bg-[#faf8f5] text-[#8b94a1]">
                <th className="py-3.5 px-4 font-semibold">Ref</th>
                <th className="py-3.5 px-4 font-semibold">Client</th>
                <th className="py-3.5 px-4 font-semibold">Service</th>
                <th className="py-3.5 px-4 font-semibold">Session Date</th>
                <th className="py-3.5 px-4 font-semibold">Price</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Google Meet</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f2ee]">
              {bookings.map((b) => {
                const isRowLoading = actionLoadingId === b._id
                const hasSafeMeetLink = isSafeHttpsUrl(b.googleMeetLink)
                const hasSafeCalLink = isSafeHttpsUrl(b.googleCalendarEventLink)
                const hasSafeReceiptUrl = isSafeHttpsUrl(b.paymentReceiptUrl)

                return (
                  <tr key={b._id} className="hover:bg-[#faf8f5]/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#14243b]">
                      {b.reference || b._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#14243b]">{b.clientName}</p>
                      <p className="text-[11px] text-[#8b94a1]">{b.clientEmail}</p>
                      {b.clientPhone && (
                        <p className="text-[10px] text-[#637084]">{b.clientPhone}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#14243b]">
                      {b.serviceTitle?.en || 'General Session'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#637084]">
                      {b.date} at <strong>{b.time}</strong> ({b.durationMinutes}m)
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#14243b]">
                      {b.amount ? `${b.amount} ${b.currency || 'EGP'}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'awaiting_verification' ||
                                b.status === 'pending' ||
                                b.status === 'awaiting_payment'
                              ? 'bg-amber-100 text-amber-800'
                              : b.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {hasSafeMeetLink ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={b.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            Join Meet ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyMeet(b._id, b.googleMeetLink!)}
                            className="rounded-full border border-[#dedbd5] bg-[#faf8f5] px-2 py-1 text-[10px] font-bold text-[#14243b] hover:bg-[#eeeae4]"
                          >
                            {copiedId === b._id ? 'Copied ✓' : 'Copy'}
                          </button>
                          {hasSafeCalLink && (
                            <a
                              href={b.googleCalendarEventLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-semibold text-[#2855C5] hover:underline"
                            >
                              Calendar ↗
                            </a>
                          )}
                        </div>
                      ) : b.status === 'confirmed' ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Missing Meet Link
                            </span>
                            <button
                              type="button"
                              onClick={() => executeBookingAction(b._id, 'generate_meet')}
                              disabled={isRowLoading}
                              className="rounded-full bg-[#2855C5] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#14243b] disabled:opacity-50"
                            >
                              {isRowLoading ? 'Creating...' : '+ Generate Meet'}
                            </button>
                          </div>
                          {b.googleMeetError && (
                            <p className="max-w-xs text-[10px] text-rose-600 leading-snug">
                              {b.googleMeetError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8b94a1]">Created on approval</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasSafeReceiptUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(b)}
                            className="rounded-full bg-[#f4f2ee] px-3 py-1.5 text-[11px] font-bold text-[#14243b] hover:bg-[#dedbd5]"
                          >
                            View Receipt
                          </button>
                        )}
                        {['awaiting_verification', 'pending', 'awaiting_payment'].includes(
                          b.status,
                        ) && (
                          <>
                            <button
                              type="button"
                              onClick={() => setActionModal({ booking: b, action: 'approve' })}
                              disabled={isRowLoading}
                              className="rounded-full bg-[#14243b] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeclineNotes('')
                                setActionModal({ booking: b, action: 'reject' })
                              }}
                              disabled={isRowLoading}
                              className="rounded-full px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation / Decline Modal (replaces native confirm/prompt) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-[#14243b] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <h3 className="text-base font-bold">
                {actionModal.action === 'approve'
                  ? 'Confirm Booking & Create Google Meet'
                  : 'Decline Booking / Receipt'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#637084] leading-relaxed">
              {actionModal.action === 'approve' ? (
                <>
                  Approve booking{' '}
                  <strong>
                    {actionModal.booking.reference ||
                      actionModal.booking._id.slice(-6).toUpperCase()}
                  </strong>{' '}
                  for <strong>{actionModal.booking.clientName}</strong> on{' '}
                  <strong>
                    {actionModal.booking.date} at {actionModal.booking.time}
                  </strong>
                  ? This will verify payment and create a Google Calendar invitation with a Google
                  Meet link.
                </>
              ) : (
                <>
                  Provide an optional reason for declining booking{' '}
                  <strong>
                    {actionModal.booking.reference ||
                      actionModal.booking._id.slice(-6).toUpperCase()}
                  </strong>
                  :
                </>
              )}
            </p>

            {actionModal.action === 'reject' && (
              <textarea
                rows={3}
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
                placeholder="Reason for declining receipt or booking..."
                className="w-full rounded-2xl border border-[#dedbd5] bg-[#faf8f5] p-3 text-xs text-[#14243b] outline-none focus:border-[#2855C5]"
              />
            )}

            <div className="flex items-center justify-end gap-2 border-t border-[#eeeae4] pt-4">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-full px-4 py-2 text-xs font-bold text-[#637084] hover:bg-[#f4f2ee]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoadingId === actionModal.booking._id}
                onClick={() =>
                  executeBookingAction(
                    actionModal.booking._id,
                    actionModal.action,
                    declineNotes.trim(),
                  )
                }
                className={`rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                  actionModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoadingId === actionModal.booking._id
                  ? 'Processing...'
                  : actionModal.action === 'approve'
                    ? 'Confirm & Generate Meet'
                    : 'Decline Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-[#14243b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14243b]">InstaPay Receipt</h3>
                <p className="text-[11px] text-[#8b94a1]">
                  Reference #
                  {selectedReceipt.reference || selectedReceipt._id.slice(-6).toUpperCase()} —{' '}
                  {selectedReceipt.clientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <div className="my-4 max-h-[60vh] overflow-y-auto rounded-2xl bg-[#faf8f5] p-2 border border-[#eeeae4] text-center">
              {isSafeHttpsUrl(selectedReceipt.paymentReceiptUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedReceipt.paymentReceiptUrl}
                  alt="InstaPay Transfer Receipt"
                  className="mx-auto rounded-xl max-h-[50vh] object-contain"
                />
              ) : (
                <p className="py-12 text-xs text-[#8b94a1]">No valid image file available</p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#eeeae4] pt-4">
              <span className="text-xs font-bold text-[#14243b]">
                Amount: {selectedReceipt.amount} {selectedReceipt.currency || 'EGP'}
              </span>
              <div className="flex items-center gap-2">
                {['awaiting_verification', 'pending', 'awaiting_payment'].includes(
                  selectedReceipt.status,
                ) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedReceipt
                        setSelectedReceipt(null)
                        setDeclineNotes('')
                        setActionModal({ booking: target, action: 'reject' })
                      }}
                      className="rounded-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedReceipt._id}
                      onClick={() => executeBookingAction(selectedReceipt._id, 'approve')}
                      className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoadingId === selectedReceipt._id
                        ? 'Approving...'
                        : 'Approve & Create Meet'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(null)}
                    className="rounded-full bg-[#14243b] px-5 py-2 text-xs font-bold text-white"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
