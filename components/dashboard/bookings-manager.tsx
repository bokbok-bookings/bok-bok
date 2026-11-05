'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Video } from 'lucide-react'

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
  deliveryMode?: string
  paymentMethod?: string
  paymentStatus?: string
  paymentReceiptUrl?: string
  adminNotes?: string
  googleMeetLink?: string
  googleCalendarEventLink?: string
  googleCalendarEventId?: string
  googleMeetError?: string
  googleMeetUpdatedAt?: string
  attendanceStatus?: string
  expertAttendanceReport?: { response: 'attended' | 'absent'; submittedAt: string; notes?: string }
  clientAttendanceReport?: { response: 'attended' | 'absent'; submittedAt: string; notes?: string }
  sessionStartAt?: string
  sessionEndAt?: string
  rescheduleToken?: string
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

function isSafeReceiptImageUrl(value?: string): boolean {
  if (!value) return false
  if (value.startsWith('data:image/')) return true
  return isSafeHttpsUrl(value)
}

export function BookingsManager({ expertId, isAdmin = false }: BookingsManagerProps) {
  const [bookings, setBookings] = useState<BookingDocItem[]>([])
  const [calendarStatus, setCalendarStatus] = useState<CalendarConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'awaiting_verification' | 'confirmed' | 'all'>(
    'awaiting_verification',
  )
  const [selectedReceipt, setSelectedReceipt] = useState<BookingDocItem | null>(null)

  // Decline / Cancel modal
  const [actionModal, setActionModal] = useState<{
    booking: BookingDocItem
    action: 'reject' | 'cancel'
  } | null>(null)
  const [declineNotes, setDeclineNotes] = useState('')

  // Approval modal (supports automatic Google Calendar Meet generation OR optional manual Meet URL)
  const [approvalBooking, setApprovalBooking] = useState<BookingDocItem | null>(null)
  const [approvalMeetLink, setApprovalMeetLink] = useState('')

  // Manual Add/Edit Meet link modal
  const [meetModalBooking, setMeetModalBooking] = useState<BookingDocItem | null>(null)
  const [newMeetLink, setNewMeetLink] = useState('')
  const [savingMeetLink, setSavingMeetLink] = useState(false)

  // Attendance modal
  const [attendanceModal, setAttendanceModal] = useState<{
    booking: BookingDocItem
    response: 'attended' | 'absent'
  } | null>(null)
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [submittingAttendance, setSubmittingAttendance] = useState(false)

  // Edit Booking Modal (Admin)
  const [editingBooking, setEditingBooking] = useState<BookingDocItem | null>(null)
  const [editClientName, setEditClientName] = useState('')
  const [editClientEmail, setEditClientEmail] = useState('')
  const [editClientPhone, setEditClientPhone] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editDuration, setEditDuration] = useState(30)
  const [editAmount, setEditAmount] = useState<number | ''>(0)
  const [editCurrency, setEditCurrency] = useState('EGP')
  const [editStatus, setEditStatus] = useState('confirmed')
  const [editPaymentStatus, setEditPaymentStatus] = useState('paid')
  const [editMeetLink, setEditMeetLink] = useState('')
  const [editAdminNotes, setEditAdminNotes] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

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
    googleMeetLink?: string,
  ) => {
    setActionLoadingId(id)
    setFeedback(null)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          adminNotes,
          ...(googleMeetLink ? { googleMeetLink } : {}),
        }),
      })
      const json = await res.json()

      if (json.success) {
        setSelectedReceipt(null)
        setActionModal(null)
        setApprovalBooking(null)
        setApprovalMeetLink('')
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

  const handleSaveMeetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meetModalBooking || !newMeetLink.trim()) return

    setSavingMeetLink(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: meetModalBooking._id,
          action: 'update_meet_link',
          googleMeetLink: newMeetLink.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setMeetModalBooking(null)
        setNewMeetLink('')
        setFeedback({
          type: 'success',
          text: json.message || 'Google Meet link saved and emailed to attendees.',
          meetLink: json.googleMeetLink || undefined,
        })
        await loadBookings()
      } else {
        setFeedback({
          type: 'error',
          text: json.error || 'Failed to update Google Meet link.',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Error updating Google Meet link.',
      })
    } finally {
      setSavingMeetLink(false)
    }
  }

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attendanceModal) return

    setSubmittingAttendance(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/bookings/${attendanceModal.booking._id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: attendanceModal.response,
          notes: attendanceNotes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setAttendanceModal(null)
        setAttendanceNotes('')
        setFeedback({
          type: 'success',
          text: json.message || 'Attendance recorded successfully.',
        })
        await loadBookings()
      } else {
        setFeedback({
          type: 'error',
          text: json.error || 'Failed to record attendance.',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Error submitting attendance.',
      })
    } finally {
      setSubmittingAttendance(false)
    }
  }

  const handleOpenEditBooking = (b: BookingDocItem) => {
    setEditingBooking(b)
    setEditClientName(b.clientName || '')
    setEditClientEmail(b.clientEmail || '')
    setEditClientPhone(b.clientPhone || '')
    setEditDate(b.date || '')
    setEditTime(b.time || '')
    setEditDuration(b.durationMinutes || 30)
    setEditAmount(b.amount ?? 0)
    setEditCurrency(b.currency || 'EGP')
    setEditStatus(b.status || 'confirmed')
    setEditPaymentStatus(b.paymentStatus || 'paid')
    setEditMeetLink(b.googleMeetLink || '')
    setEditAdminNotes(b.adminNotes || '')
  }

  const handleSaveEditBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBooking) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBooking._id,
          action: 'edit',
          updates: {
            clientName: editClientName.trim(),
            clientEmail: editClientEmail.trim().toLowerCase(),
            clientPhone: editClientPhone.trim(),
            date: editDate,
            time: editTime,
            durationMinutes: Number(editDuration) || 30,
            amount: Number(editAmount) || 0,
            currency: editCurrency,
            status: editStatus,
            paymentStatus: editPaymentStatus,
            googleMeetLink: editMeetLink.trim(),
            adminNotes: editAdminNotes.trim(),
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === editingBooking._id
              ? {
                  ...b,
                  clientName: editClientName.trim(),
                  clientEmail: editClientEmail.trim().toLowerCase(),
                  clientPhone: editClientPhone.trim(),
                  date: editDate,
                  time: editTime,
                  durationMinutes: Number(editDuration) || 30,
                  amount: Number(editAmount) || 0,
                  currency: editCurrency,
                  status: editStatus,
                  paymentStatus: editPaymentStatus,
                  googleMeetLink: editMeetLink.trim(),
                  adminNotes: editAdminNotes.trim(),
                }
              : b,
          ),
        )
        setEditingBooking(null)
        setFeedback({ type: 'success', text: 'Booking details updated successfully.' })
      } else {
        alert(json.error || 'Failed to update booking')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating booking')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteBooking = async (b: BookingDocItem) => {
    const ref = b.reference || b._id.slice(-6).toUpperCase()
    if (
      !confirm(
        `Are you sure you want to permanently delete booking #${ref} for ${b.clientName}?\n\nThis will remove the booking and cancel its Google Calendar event if one exists.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/dashboard/bookings?id=${b._id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setBookings((prev) => prev.filter((item) => item._id !== b._id))
        setFeedback({ type: 'success', text: `Booking #${ref} deleted successfully.` })
      } else {
        alert(json.error || 'Failed to delete booking')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting booking')
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
    (b) => b.status === 'confirmed' && b.deliveryMode !== 'IN_PERSON' && !b.googleMeetLink,
  ).length

  const now = new Date()

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
            Bookings &amp; Meetings
          </h2>
          <p className={`text-xs mt-1 ${isAdmin ? 'text-slate-300' : 'text-[#637084]'}`}>
            Manage appointments, Google Meet rooms, InstaPay receipt verification, and session
            attendance.
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
            Awaiting Verification
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
            All Bookings
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
                <th className="py-3.5 px-4 font-semibold">Google Meet</th>
                <th className="py-3.5 px-4 font-semibold">Attendance</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f2ee]">
              {bookings.map((b) => {
                const isRowLoading = actionLoadingId === b._id
                const isOnline = b.deliveryMode !== 'IN_PERSON'
                const isConfirmed = b.status === 'confirmed'
                const hasSafeMeetLink = isSafeHttpsUrl(b.googleMeetLink)
                const hasSafeCalLink = isSafeHttpsUrl(b.googleCalendarEventLink)
                const hasSafeReceiptUrl = isSafeReceiptImageUrl(b.paymentReceiptUrl)
                const sessionEnd = b.sessionEndAt
                  ? new Date(b.sessionEndAt)
                  : new Date(`${b.date}T${b.time}`)
                const sessionEnded = now >= sessionEnd

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

                    {/* Google Meet Column */}
                    <td className="py-3.5 px-4">
                      {isOnline ? (
                        hasSafeMeetLink ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <a
                              href={b.googleMeetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                              title={b.googleMeetLink}
                            >
                              <Video size={11} />
                              <span>Join Meet ↗</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyMeet(b._id, b.googleMeetLink!)}
                              className="rounded-full border border-[#dedbd5] bg-[#faf8f5] px-2 py-0.5 text-[10px] font-bold text-[#14243b] hover:bg-[#eeeae4]"
                            >
                              {copiedId === b._id ? 'Copied ✓' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMeetModalBooking(b)
                                setNewMeetLink(b.googleMeetLink || '')
                              }}
                              className="text-[10px] text-[#8b94a1] hover:text-[#14243b] underline font-bold"
                            >
                              Edit
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
                        ) : isConfirmed ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Missing Meet
                              </span>
                              <button
                                type="button"
                                onClick={() => executeBookingAction(b._id, 'generate_meet')}
                                disabled={isRowLoading}
                                className="rounded-full bg-[#2855C5] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#14243b] disabled:opacity-50"
                              >
                                {isRowLoading ? 'Creating...' : '+ Generate Meet'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMeetModalBooking(b)
                                  setNewMeetLink('')
                                }}
                                className="text-[10px] font-bold text-[#637084] underline hover:text-[#14243b]"
                              >
                                Set URL
                              </button>
                            </div>
                            {b.googleMeetError && (
                              <p className="max-w-xs text-[10px] text-rose-600 leading-snug">
                                {b.googleMeetError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#8b94a1]">Created on approval</span>
                            <button
                              type="button"
                              onClick={() => {
                                setMeetModalBooking(b)
                                setNewMeetLink(b.googleMeetLink || '')
                              }}
                              className="text-[10px] font-bold text-[#637084] underline hover:text-[#14243b]"
                            >
                              Set URL
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-[10px] text-[#8b94a1] font-semibold">In-Person</span>
                      )}
                    </td>

                    {/* Attendance Column */}
                    <td className="py-3.5 px-4">
                      {isConfirmed ? (
                        b.attendanceStatus === 'completed' ? (
                          <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            Completed
                          </span>
                        ) : b.attendanceStatus === 'disputed' ? (
                          <span className="inline-block rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                            Disputed
                          </span>
                        ) : b.attendanceStatus === 'client_absent' ? (
                          <span className="inline-block rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                            Client Absent
                          </span>
                        ) : b.attendanceStatus === 'expert_absent' ? (
                          <span className="inline-block rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                            Expert Absent
                          </span>
                        ) : sessionEnded ? (
                          <div className="flex items-center gap-1">
                            {b.expertAttendanceReport ? (
                              <span className="text-[10px] text-[#8b94a1] font-semibold">
                                {b.expertAttendanceReport.response === 'attended'
                                  ? '✓ You Attended'
                                  : '✕ You Marked Absent'}
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceNotes('')
                                    setAttendanceModal({ booking: b, response: 'attended' })
                                  }}
                                  title="Confirm session took place"
                                  className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-600 hover:text-white"
                                >
                                  ✓ Attended
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceNotes('')
                                    setAttendanceModal({ booking: b, response: 'absent' })
                                  }}
                                  title="Report client no-show"
                                  className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold hover:bg-rose-600 hover:text-white"
                                >
                                  ✕ No-show
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#8b94a1]">Pending session</span>
                        )
                      ) : (
                        <span className="text-[10px] text-[#8b94a1]">—</span>
                      )}
                    </td>

                    {/* Booking Status Column */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ['awaiting_verification', 'pending', 'awaiting_payment'].includes(
                                  b.status,
                                )
                              ? 'bg-amber-100 text-amber-800'
                              : b.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.rescheduleToken && (
                          <Link
                            href={`/bookings/${b._id}?token=${b.rescheduleToken}`}
                            target="_blank"
                            className="rounded-full bg-[#f4f2ee] px-2.5 py-1 text-[10px] font-bold text-[#14243b] hover:bg-[#dedbd5]"
                          >
                            Hub ↗
                          </Link>
                        )}
                        {hasSafeReceiptUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(b)}
                            className="rounded-full bg-[#f4f2ee] px-2.5 py-1 text-[10px] font-bold text-[#14243b] hover:bg-[#dedbd5]"
                          >
                            Receipt
                          </button>
                        )}
                        {['awaiting_verification', 'pending', 'awaiting_payment'].includes(
                          b.status,
                        ) && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setApprovalMeetLink(b.googleMeetLink || '')
                                setApprovalBooking(b)
                              }}
                              disabled={isRowLoading}
                              className="rounded-full bg-[#14243b] px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                              className="rounded-full px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditBooking(b)}
                              className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 text-[10px] font-bold hover:bg-blue-600 hover:text-white transition cursor-pointer"
                              title="Edit booking data"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(b)}
                              className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 text-[10px] font-bold hover:bg-rose-600 hover:text-white transition cursor-pointer"
                              title="Delete booking"
                            >
                              Delete
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

      {/* MODAL 1: Add / Edit Google Meet Link */}
      {meetModalBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-[#14243b] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14243b]">Google Meet Link</h3>
                <p className="text-[11px] text-[#8b94a1]">
                  Reference #
                  {meetModalBooking.reference || meetModalBooking._id.slice(-6).toUpperCase()} —{' '}
                  {meetModalBooking.clientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMeetModalBooking(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeetLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#14243b] mb-1">
                  Google Meet Room URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  value={newMeetLink}
                  onChange={(e) => setNewMeetLink(e.target.value)}
                  className="w-full rounded-xl border border-[#dedbd5] bg-[#faf8f5] px-3.5 py-2.5 text-xs text-[#14243b] outline-none focus:border-[#2855C5]"
                />
                <p className="mt-1 text-[10px] text-[#8b94a1]">
                  If this booking is confirmed, both client and expert will receive an email update
                  with this joining link.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eeeae4]">
                <button
                  type="button"
                  onClick={() => setMeetModalBooking(null)}
                  className="rounded-full px-4 py-2 text-xs font-bold text-[#637084] hover:bg-[#f4f2ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMeetLink}
                  className="rounded-full bg-[#14243b] px-5 py-2 text-xs font-bold text-white hover:bg-[#2855C5] disabled:opacity-50"
                >
                  {savingMeetLink ? 'Saving...' : 'Save & Notify Parties'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Approve Booking Confirmation (Auto Google Meet + Optional Override) */}
      {approvalBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-[#14243b] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14243b]">
                  Confirm Booking &amp; Create Google Meet
                </h3>
                <p className="text-[11px] text-[#8b94a1]">
                  Reference #
                  {approvalBooking.reference || approvalBooking._id.slice(-6).toUpperCase()} —{' '}
                  {approvalBooking.clientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovalBooking(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-[#faf8f5] border border-[#eeeae4] p-4 text-xs space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-[#8b94a1]">Client:</span>
                <span className="font-bold text-[#14243b] text-right">
                  {approvalBooking.clientName} ({approvalBooking.clientEmail})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#8b94a1]">Scheduled Session:</span>
                <span className="font-bold text-[#14243b]">
                  {approvalBooking.date} at {approvalBooking.time}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#8b94a1]">Amount:</span>
                <span className="font-bold text-[#14243b]">
                  {approvalBooking.amount} {approvalBooking.currency || 'EGP'}
                </span>
              </div>
            </div>

            {approvalBooking.deliveryMode !== 'IN_PERSON' && (
              <div>
                <label className="block text-xs font-bold text-[#14243b] mb-1">
                  Custom Google Meet URL (Optional — leave blank to auto-generate)
                </label>
                <input
                  type="url"
                  placeholder="Leave empty to auto-create via Google Calendar OAuth"
                  value={approvalMeetLink}
                  onChange={(e) => setApprovalMeetLink(e.target.value)}
                  className="w-full rounded-xl border border-[#dedbd5] bg-[#faf8f5] px-3.5 py-2.5 text-xs text-[#14243b] outline-none focus:border-[#2855C5]"
                />
                <p className="mt-1 text-[10px] text-[#8b94a1]">
                  Leaving this blank automatically creates a Google Calendar event + Google Meet
                  link and emails both the client and expert.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eeeae4]">
              <button
                type="button"
                onClick={() => setApprovalBooking(null)}
                className="rounded-full px-4 py-2 text-xs font-bold text-[#637084] hover:bg-[#f4f2ee]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoadingId === approvalBooking._id}
                onClick={() =>
                  executeBookingAction(
                    approvalBooking._id,
                    'approve',
                    '',
                    approvalMeetLink.trim() || undefined,
                  )
                }
                className="rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoadingId === approvalBooking._id
                  ? 'Approving...'
                  : 'Confirm & Generate Meet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Decline / Cancel Booking Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-[#14243b] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <h3 className="text-base font-bold">
                {actionModal.action === 'reject'
                  ? 'Decline Booking / Receipt'
                  : 'Cancel Booking'}
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
              Provide an optional reason for{' '}
              {actionModal.action === 'reject' ? 'declining' : 'cancelling'} booking{' '}
              <strong>
                {actionModal.booking.reference ||
                  actionModal.booking._id.slice(-6).toUpperCase()}
              </strong>
              :
            </p>

            <textarea
              rows={3}
              value={declineNotes}
              onChange={(e) => setDeclineNotes(e.target.value)}
              placeholder="Optional notes or reason..."
              className="w-full rounded-2xl border border-[#dedbd5] bg-[#faf8f5] p-3 text-xs text-[#14243b] outline-none focus:border-[#2855C5]"
            />

            <div className="flex items-center justify-end gap-2 border-t border-[#eeeae4] pt-4">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-full px-4 py-2 text-xs font-bold text-[#637084] hover:bg-[#f4f2ee]"
              >
                Back
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
                className="rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoadingId === actionModal.booking._id
                  ? 'Processing...'
                  : actionModal.action === 'reject'
                    ? 'Decline Booking'
                    : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Session Attendance Modal */}
      {attendanceModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleAttendanceSubmit}
            className="w-full max-w-md rounded-3xl bg-white p-6 text-[#14243b] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <h3 className="text-base font-bold">
                {attendanceModal.response === 'attended'
                  ? 'Confirm Session Completion'
                  : 'Report Client No-Show'}
              </h3>
              <button
                type="button"
                onClick={() => setAttendanceModal(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#637084] leading-relaxed">
              {attendanceModal.response === 'attended'
                ? `Confirm that session ${attendanceModal.booking.reference || ''} with ${attendanceModal.booking.clientName} took place.`
                : `Report that ${attendanceModal.booking.clientName} did not attend session ${attendanceModal.booking.reference || ''}.`}
            </p>

            <textarea
              rows={3}
              value={attendanceNotes}
              onChange={(e) => setAttendanceNotes(e.target.value)}
              placeholder={
                attendanceModal.response === 'attended'
                  ? 'Optional session completion notes...'
                  : 'Reason or notes regarding client absence...'
              }
              className="w-full rounded-2xl border border-[#dedbd5] bg-[#faf8f5] p-3 text-xs text-[#14243b] outline-none focus:border-[#2855C5]"
            />

            <div className="flex items-center justify-end gap-2 border-t border-[#eeeae4] pt-4">
              <button
                type="button"
                onClick={() => setAttendanceModal(null)}
                className="rounded-full px-4 py-2 text-xs font-bold text-[#637084] hover:bg-[#f4f2ee]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAttendance}
                className={`rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                  attendanceModal.response === 'attended'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingAttendance ? 'Saving...' : 'Submit Attendance'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: InstaPay Receipt Preview Modal */}
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
              {isSafeReceiptImageUrl(selectedReceipt.paymentReceiptUrl) ? (
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

      {/* MODAL 5: Edit Booking Record (Admin) */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveEditBooking}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 text-[#14243b] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14243b]">Edit Booking Record</h3>
                <p className="text-[11px] text-[#8b94a1]">
                  Reference #{editingBooking.reference || editingBooking._id.slice(-6).toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-[#14243b]">Client Name *</label>
                <input
                  type="text"
                  required
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Client Email *</label>
                <input
                  type="email"
                  required
                  value={editClientEmail}
                  onChange={(e) => setEditClientEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Client Phone</label>
                <input
                  type="text"
                  value={editClientPhone}
                  onChange={(e) => setEditClientPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Booking Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs font-semibold text-[#14243b] outline-none focus:border-primary"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="awaiting_verification">Awaiting Verification</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Date</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Time</label>
                <input
                  type="time"
                  required
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={editDuration}
                  onChange={(e) => setEditDuration(parseInt(e.target.value) || 30)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Amount & Currency</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="flex-1 rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary"
                  />
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-24 rounded-xl border border-border bg-neutral-50 px-2 py-2 text-xs font-semibold text-[#14243b] outline-none focus:border-primary"
                  >
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Payment Status</label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs font-semibold text-[#14243b] outline-none focus:border-primary"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#14243b]">Google Meet Link</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={editMeetLink}
                  onChange={(e) => setEditMeetLink(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-xs text-[#14243b] outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#14243b]">Admin Internal Notes</label>
              <textarea
                rows={2}
                placeholder="Optional notes for admin records..."
                value={editAdminNotes}
                onChange={(e) => setEditAdminNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-neutral-50 p-3 text-xs text-[#14243b] outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#eeeae4] pt-4">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                disabled={savingEdit}
                className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-full bg-[#14243b] px-6 py-2 text-xs font-bold text-white hover:bg-[#1f3654] transition disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
