'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Video, Check, AlertCircle, Clock, ExternalLink, UserCheck, XCircle } from 'lucide-react'

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
  googleMeetUpdatedAt?: string
  attendanceStatus?: string
  expertAttendanceReport?: { response: 'attended' | 'absent'; submittedAt: string; notes?: string }
  clientAttendanceReport?: { response: 'attended' | 'absent'; submittedAt: string; notes?: string }
  sessionStartAt?: string
  sessionEndAt?: string
  rescheduleToken?: string
  createdAt: string
}

interface BookingsManagerProps {
  expertId?: string
  isAdmin?: boolean
}

export function BookingsManager({ expertId, isAdmin = false }: BookingsManagerProps) {
  const [bookings, setBookings] = useState<BookingDocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'awaiting_verification' | 'confirmed' | 'all'>('awaiting_verification')
  const [selectedReceipt, setSelectedReceipt] = useState<BookingDocItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Meet link modal
  const [meetModalBooking, setMeetModalBooking] = useState<BookingDocItem | null>(null)
  const [newMeetLink, setNewMeetLink] = useState('')
  const [savingMeetLink, setSavingMeetLink] = useState(false)

  // Approval modal with Meet link
  const [approvalBooking, setApprovalBooking] = useState<BookingDocItem | null>(null)
  const [approvalMeetLink, setApprovalMeetLink] = useState('')

  const loadBookings = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/dashboard/bookings', window.location.origin)
      if (expertId) url.searchParams.set('expertId', expertId)
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter)

      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success) {
        setBookings(json.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [expertId, statusFilter])

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'cancel', googleMeetLink?: string) => {
    let adminNotes = ''
    if (action === 'reject') {
      const reason = prompt('Reason for declining this receipt/booking:')
      if (reason === null) return
      adminNotes = reason
    } else if (action === 'approve') {
      // approved via modal or direct confirmation
    } else {
      if (!confirm(`Are you sure you want to ${action} this booking?`)) return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, adminNotes, googleMeetLink }),
      })
      const json = await res.json()
      if (json.success) {
        setSelectedReceipt(null)
        setApprovalBooking(null)
        loadBookings()
      } else {
        alert(json.error || 'Failed to update booking')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating booking')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveMeetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meetModalBooking || !newMeetLink.trim()) return

    setSavingMeetLink(true)
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
        loadBookings()
      } else {
        alert(json.error || 'Failed to update Google Meet link')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating meet link')
    } finally {
      setSavingMeetLink(false)
    }
  }

  const handleAttendanceSubmit = async (bookingId: string, response: 'attended' | 'absent') => {
    const notes = prompt(
      response === 'attended'
        ? 'Optional notes regarding session completion:'
        : 'Reason or notes for client absence (no-show):'
    )
    if (notes === null) return

    try {
      const res = await fetch(`/api/bookings/${bookingId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, notes: notes || undefined }),
      })
      const json = await res.json()
      if (json.success) {
        alert(json.message || 'Attendance recorded')
        loadBookings()
      } else {
        alert(json.error || 'Failed to record attendance')
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting attendance')
    }
  }

  const now = new Date()

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#eeeae4] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#14243b]">Bookings &amp; Meetings</h2>
          <p className="text-xs text-[#637084] mt-1">
            Manage appointments, Google Meet rooms, receipt verification, and session attendance.
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-1.5 rounded-2xl bg-[#faf8f5] p-1 border border-[#eeeae4]">
          <button
            onClick={() => setStatusFilter('awaiting_verification')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${statusFilter === 'awaiting_verification'
                ? 'bg-[#14243b] text-white'
                : 'text-[#637084] hover:text-[#14243b]'
              }`}
          >
            Awaiting Verification
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${statusFilter === 'confirmed'
                ? 'bg-[#14243b] text-white'
                : 'text-[#637084] hover:text-[#14243b]'
              }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${statusFilter === 'all'
                ? 'bg-[#14243b] text-white'
                : 'text-[#637084] hover:text-[#14243b]'
              }`}
          >
            All Bookings
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-[#8b94a1]">Loading bookings...</div>
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
                <th className="py-3.5 px-4 font-semibold">Google Meet</th>
                <th className="py-3.5 px-4 font-semibold">Attendance</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f2ee]">
              {bookings.map((b) => {
                const isOnline = b.deliveryMode !== 'IN_PERSON'
                const isConfirmed = b.status === 'confirmed'
                const sessionEnd = b.sessionEndAt ? new Date(b.sessionEndAt) : new Date(`${b.date}T${b.time}`)
                const sessionEnded = now >= sessionEnd

                return (
                  <tr key={b._id} className="hover:bg-[#faf8f5]/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#14243b]">
                      {b.reference || b._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#14243b]">{b.clientName}</p>
                      <p className="text-[11px] text-[#8b94a1]">{b.clientEmail}</p>
                      {b.clientPhone && <p className="text-[10px] text-[#637084]">{b.clientPhone}</p>}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#14243b]">
                      {b.serviceTitle?.en || 'General Session'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#637084]">
                      {b.date} at <strong>{b.time}</strong> ({b.durationMinutes}m)
                    </td>

                    {/* Google Meet Column */}
                    <td className="py-3.5 px-4">
                      {isOnline ? (
                        b.googleMeetLink ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={b.googleMeetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-[#00796b]/10 text-[#00796b] px-2.5 py-0.5 text-[10px] font-bold hover:bg-[#00796b]/20"
                              title={b.googleMeetLink}
                            >
                              <Video size={11} />
                              <span>Meet Link</span>
                            </a>
                            <button
                              onClick={() => {
                                setMeetModalBooking(b)
                                setNewMeetLink(b.googleMeetLink || '')
                              }}
                              className="text-[10px] text-[#8b94a1] hover:text-[#14243b] underline font-bold"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[9px] font-bold">
                              ⚠️ Missing
                            </span>
                            <button
                              onClick={() => {
                                setMeetModalBooking(b)
                                setNewMeetLink('')
                              }}
                              className="rounded-full bg-[#14243b] text-white px-2 py-0.5 text-[10px] font-bold hover:bg-[#ef5b4c]"
                            >
                              + Add Link
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
                            ⚠️ Disputed
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
                                {b.expertAttendanceReport.response === 'attended' ? '✓ You Attended' : '✕ You Marked Absent'}
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleAttendanceSubmit(b._id, 'attended')}
                                  title="Confirm session took place"
                                  className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-600 hover:text-white"
                                >
                                  ✓ Attended
                                </button>
                                <button
                                  onClick={() => handleAttendanceSubmit(b._id, 'absent')}
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
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ['awaiting_verification', 'pending', 'awaiting_payment'].includes(b.status)
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
                        {b.paymentReceiptUrl && (
                          <button
                            onClick={() => setSelectedReceipt(b)}
                            className="rounded-full bg-[#f4f2ee] px-2.5 py-1 text-[10px] font-bold text-[#14243b] hover:bg-[#dedbd5]"
                          >
                            Receipt
                          </button>
                        )}
                        {['awaiting_verification', 'pending', 'awaiting_payment'].includes(b.status) && (
                          <>
                            <button
                              onClick={() => handleAction(b._id, 'approve')}
                              disabled={actionLoading}
                              className="rounded-full bg-[#14243b] px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(b._id, 'reject')}
                              disabled={actionLoading}
                              className="rounded-full px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
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

      {/* MODAL 1: Add/Edit Meet Link */}
      {meetModalBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14243b]">Google Meet Link</h3>
                <p className="text-[11px] text-[#8b94a1]">
                  Reference #{meetModalBooking.reference || meetModalBooking._id.slice(-6).toUpperCase()} — {meetModalBooking.clientName}
                </p>
              </div>
              <button
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
                  className="w-full rounded-xl border border-[#dedbd5] bg-[#faf8f5] px-3.5 py-2.5 text-xs text-[#14243b] outline-none focus:border-[#ef5b4c]"
                />
                <p className="mt-1 text-[10px] text-[#8b94a1]">
                  Both client and expert will receive an email update with this joining link.
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
                  className="rounded-full bg-[#14243b] px-5 py-2 text-xs font-bold text-white hover:bg-[#ef5b4c] disabled:opacity-50"
                >
                  {savingMeetLink ? 'Saving...' : 'Save & Notify Parties'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Approve Booking Confirmation with Meet Link */}
      {approvalBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14243b]">Confirm &amp; Approve Appointment</h3>
                <p className="text-[11px] text-[#8b94a1]">
                  Reference #{approvalBooking.reference || approvalBooking._id.slice(-6).toUpperCase()} — {approvalBooking.clientName}
                </p>
              </div>
              <button
                onClick={() => setApprovalBooking(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-[#faf8f5] border border-[#eeeae4] p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8b94a1]">Client:</span>
                <span className="font-bold text-[#14243b]">{approvalBooking.clientName} ({approvalBooking.clientEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b94a1]">Scheduled Session:</span>
                <span className="font-bold text-[#14243b]">{approvalBooking.date} at {approvalBooking.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b94a1]">Amount:</span>
                <span className="font-bold text-[#14243b]">{approvalBooking.amount} {approvalBooking.currency || 'EGP'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14243b] mb-1">
                Google Meet Link for this Session (Optional now, can be added later)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                value={approvalMeetLink}
                onChange={(e) => setApprovalMeetLink(e.target.value)}
                className="w-full rounded-xl border border-[#dedbd5] bg-[#faf8f5] px-3.5 py-2.5 text-xs text-[#14243b] outline-none focus:border-[#ef5b4c]"
              />
              <p className="mt-1 text-[10px] text-[#8b94a1]">
                If provided, this link is included immediately in the confirmation email sent to the client.
              </p>
            </div>

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
                disabled={actionLoading}
                onClick={() => handleAction(approvalBooking._id, 'approve', approvalMeetLink)}
                className="rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ? 'Approving...' : 'Confirm & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14243b]">InstaPay Receipt</h3>
                <p className="text-[11px] text-[#8b94a1]">
                  Reference #{selectedReceipt.reference || selectedReceipt._id.slice(-6).toUpperCase()} — {selectedReceipt.clientName}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="size-7 rounded-full bg-[#f4f2ee] text-xs font-bold text-[#637084] hover:bg-[#dedbd5]"
              >
                ✕
              </button>
            </div>

            <div className="my-4 max-h-[60vh] overflow-y-auto rounded-2xl bg-[#faf8f5] p-2 border border-[#eeeae4] text-center">
              {selectedReceipt.paymentReceiptUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedReceipt.paymentReceiptUrl}
                  alt="InstaPay Transfer Receipt"
                  className="mx-auto rounded-xl max-h-[50vh] object-contain"
                />
              ) : (
                <p className="py-12 text-xs text-[#8b94a1]">No image file available</p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#eeeae4] pt-4">
              <span className="text-xs font-bold text-[#14243b]">
                Amount: {selectedReceipt.amount} {selectedReceipt.currency || 'EGP'}
              </span>
              <div className="flex items-center gap-2">
                {['awaiting_verification', 'pending', 'awaiting_payment'].includes(selectedReceipt.status) && (
                  <>
                    <button
                      onClick={() => handleAction(selectedReceipt._id, 'reject')}
                      className="rounded-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAction(selectedReceipt._id, 'approve')}
                      disabled={actionLoading}
                      className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Approving...' : 'Approve Booking'}
                    </button>
                  </>
                )}
                {!['awaiting_verification', 'pending', 'awaiting_payment'].includes(selectedReceipt.status) && (
                  <button
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
