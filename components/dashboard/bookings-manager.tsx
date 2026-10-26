'use client'

import React, { useState, useEffect } from 'react'

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

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'cancel') => {
    let adminNotes = ''
    if (action === 'reject') {
      const reason = prompt('Reason for declining this receipt/booking:')
      if (reason === null) return
      adminNotes = reason
    } else {
      if (!confirm(`Are you sure you want to ${action} this booking?`)) return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, adminNotes }),
      })
      const json = await res.json()
      if (json.success) {
        setSelectedReceipt(null)
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

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#eeeae4] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#14243b]">Bookings & Receipts</h2>
          <p className="text-xs text-[#637084] mt-1">
            Review incoming appointments and verify InstaPay transfer receipts.
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
            Awaiting Verification / Pending
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
            All
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
                <th className="py-3.5 px-4 font-semibold">Price</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f2ee]">
              {bookings.map((b) => (
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
                  <td className="py-3.5 px-4 font-bold text-[#14243b]">
                    {b.amount ? `${b.amount} ${b.currency || 'EGP'}` : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'awaiting_verification' || b.status === 'pending' || b.status === 'awaiting_payment'
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-neutral-100 text-neutral-700'
                        }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {b.paymentReceiptUrl && (
                        <button
                          onClick={() => setSelectedReceipt(b)}
                          className="rounded-full bg-[#f4f2ee] px-3 py-1.5 text-[11px] font-bold text-[#14243b] hover:bg-[#dedbd5]"
                        >
                          View Receipt
                        </button>
                      )}
                      {['awaiting_verification', 'pending', 'awaiting_payment'].includes(b.status) && (
                        <>
                          <button
                            onClick={() => handleAction(b._id, 'approve')}
                            disabled={actionLoading}
                            className="rounded-full bg-[#14243b] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(b._id, 'reject')}
                            disabled={actionLoading}
                            className="rounded-full px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt Preview Modal */}
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
                      className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Approve Booking
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
