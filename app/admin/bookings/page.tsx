'use client'

import React from 'react'
import { BookingsManager } from '@/components/dashboard/bookings-manager'

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#eeeae4] pb-5">
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
          Bookings &amp; Payments
        </span>
        <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
          All Bookings &amp; Receipts
        </h1>
        <p className="text-xs text-[#637084] mt-0.5">
          Verify InstaPay / transfer receipts, confirm appointments, manage Google Meet links, and inspect all sessions.
        </p>
      </div>

      <div className="rounded-3xl border border-[#e7e2da] bg-white p-6 shadow-xs">
        <BookingsManager isAdmin={true} />
      </div>
    </div>
  )
}

