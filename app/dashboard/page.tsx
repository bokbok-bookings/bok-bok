import React from 'react'
import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { verifySession } from '@/lib/auth/dal'
import {
  getBookingsCollection,
  getServicesCollection,
  getExpertsCollection,
  toObjectId,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await verifySession()

  let expertObjId: ObjectId | null = null
  if (session.expertId) {
    try {
      expertObjId = toObjectId(session.expertId)
    } catch {
      expertObjId = null
    }
  }

  // If user is admin without explicit expertId, pick first expert or display admin redirect
  if (!expertObjId && session.role === 'admin') {
    const expertsCol = await getExpertsCollection()
    const firstExp = await expertsCol.findOne({})
    if (firstExp) {
      expertObjId = firstExp._id
    }
  }

  if (!expertObjId) {
    return (
      <div className="rounded-3xl border border-[#dedbd5] bg-white p-10 text-center">
        <h2 className="text-xl font-bold text-[#14243b]">No expert profile linked</h2>
        <p className="mt-2 text-xs text-[#637084]">
          This user account is not currently linked with an expert record.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-block rounded-full bg-[#ef5b4c] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#14243b]"
        >
          Complete Onboarding
        </Link>
      </div>
    )
  }

  const now = new Date()
  const todayDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const bookingsCol = await getBookingsCollection()
  const servicesCol = await getServicesCollection()
  const expertsCol = await getExpertsCollection()

  const [
    expertDoc,
    pendingVerifications,
    confirmedTotal,
    allTotal,
    activeServicesCount,
    todayBookings,
    recentBookings,
  ] = await Promise.all([
    expertsCol.findOne({ _id: expertObjId }),
    bookingsCol.countDocuments({
      expertId: expertObjId,
      status: { $in: ['awaiting_verification', 'pending'] },
    }),
    bookingsCol.countDocuments({ expertId: expertObjId, status: 'confirmed' }),
    bookingsCol.countDocuments({ expertId: expertObjId }),
    servicesCol.countDocuments({ expertId: expertObjId, isActive: true }),
    bookingsCol
      .find({ expertId: expertObjId, date: todayDateStr })
      .sort({ time: 1 })
      .toArray(),
    bookingsCol
      .find({ expertId: expertObjId })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#eeeae4] pb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef5b4c]">
            Welcome Back
          </span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14243b]">
            {expertDoc?.name || session.displayName}
          </h1>
          <p className="text-xs text-[#637084] mt-0.5">
            Today is {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/services"
            className="rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b]"
          >
            Services ({activeServicesCount})
          </Link>
          <Link
            href="/dashboard/availability"
            className="rounded-full bg-[#14243b] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#ef5b4c]"
          >
            Edit Schedule
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-[#14243b] p-6 text-white shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
            Pending Actions
          </span>
          <p className="mt-3 text-4xl font-bold">{pendingVerifications}</p>
          <p className="mt-1 text-xs text-white/70">Receipts awaiting verification</p>
        </div>

        <div className="rounded-3xl border border-[#e7e2da] bg-white p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a1]">
            Today&apos;s Sessions
          </span>
          <p className="mt-3 text-4xl font-bold text-[#14243b]">{todayBookings.length}</p>
          <p className="mt-1 text-xs text-[#637084]">Appointments for today</p>
        </div>

        <div className="rounded-3xl border border-[#e7e2da] bg-white p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a1]">
            Confirmed Sessions
          </span>
          <p className="mt-3 text-4xl font-bold text-[#14243b]">{confirmedTotal}</p>
          <p className="mt-1 text-xs text-[#637084]">Completed or upcoming</p>
        </div>

        <div className="rounded-3xl border border-[#e7e2da] bg-white p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a1]">
            Active Offerings
          </span>
          <p className="mt-3 text-4xl font-bold text-[#14243b]">{activeServicesCount}</p>
          <p className="mt-1 text-xs text-[#637084]">Published consultation types</p>
        </div>
      </div>

      {/* Today's Schedule + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule Card */}
        <div className="lg:col-span-2 rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eeeae4] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#14243b]">Today&apos;s Booked Slots</h2>
              <p className="text-xs text-[#8b94a1] mt-0.5">{todayDateStr}</p>
            </div>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-bold text-[#ef5b4c] hover:underline"
            >
              View all bookings →
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {todayBookings.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-[#637084]">No appointments scheduled for today.</p>
                <p className="text-[11px] text-[#8b94a1] mt-0.5">Your schedule is clear.</p>
              </div>
            ) : (
              todayBookings.map((b) => (
                <div
                  key={b._id.toString()}
                  className="flex items-center justify-between rounded-2xl border border-[#eeeae4] bg-[#faf8f5] p-4"
                >
                  <div>
                    <span className="text-sm font-black text-[#14243b]">{b.time}</span>
                    <p className="text-xs font-bold text-[#14243b] mt-0.5">{b.clientName}</p>
                    <p className="text-[11px] text-[#637084]">{b.serviceTitle?.en || 'Consultation'}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                        }`}
                    >
                      {b.status}
                    </span>
                    <p className="text-xs font-bold text-[#14243b] mt-1">
                      {b.amount ? `${b.amount} ${b.currency || 'EGP'}` : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Tools */}
        <div className="rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#14243b]">Quick Management</h2>
            <p className="text-xs text-[#8b94a1] mt-0.5">Shortcuts for your day-to-day</p>

            <div className="mt-5 space-y-2.5">
              <Link
                href="/dashboard/services"
                className="block rounded-2xl border border-[#eeeae4] p-3.5 hover:border-[#14243b] transition"
              >
                <p className="text-xs font-bold text-[#14243b]">Add or Edit Services</p>
                <p className="text-[11px] text-[#637084] mt-0.5">
                  Update session prices, durations, and descriptions.
                </p>
              </Link>

              <Link
                href="/dashboard/availability"
                className="block rounded-2xl border border-[#eeeae4] p-3.5 hover:border-[#14243b] transition"
              >
                <p className="text-xs font-bold text-[#14243b]">Adjust Working Hours</p>
                <p className="text-[11px] text-[#637084] mt-0.5">
                  Enable/disable days, set custom shifts and lunch breaks.
                </p>
              </Link>

              <Link
                href="/dashboard/profile"
                className="block rounded-2xl border border-[#eeeae4] p-3.5 hover:border-[#14243b] transition"
              >
                <p className="text-xs font-bold text-[#14243b]">Update Public Bio & Rates</p>
                <p className="text-[11px] text-[#637084] mt-0.5">
                  Keep your headline, photo, and about text fresh.
                </p>
              </Link>
            </div>
          </div>

          {expertDoc?.slug && (
            <div className="mt-6 pt-4 border-t border-[#eeeae4]">
              <Link
                href={`/experts/${expertDoc.slug}`}
                target="_blank"
                className="w-full inline-flex items-center justify-center rounded-full bg-[#faf8f5] border border-[#dedbd5] py-2.5 text-xs font-bold text-[#14243b] hover:bg-white hover:border-[#14243b] transition"
              >
                Open Live Booking Page ↗
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#eeeae4] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#14243b]">Recent Bookings</h2>
            <p className="text-xs text-[#8b94a1] mt-0.5">Latest client appointment submissions</p>
          </div>
          <Link
            href="/dashboard/bookings"
            className="text-xs font-bold text-[#ef5b4c] hover:underline"
          >
            Manage all ({allTotal}) →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          {recentBookings.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#8b94a1]">No bookings registered yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#f4f2ee] text-[#8b94a1]">
                  <th className="pb-3 font-semibold">Ref</th>
                  <th className="pb-3 font-semibold">Client</th>
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Service</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f2ee]">
                {recentBookings.map((b) => (
                  <tr key={b._id.toString()} className="hover:bg-[#faf8f5]">
                    <td className="py-3 font-mono font-bold text-[#14243b]">
                      {b.reference || b._id.toString().slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3">
                      <p className="font-bold text-[#14243b]">{b.clientName}</p>
                      <p className="text-[11px] text-[#8b94a1]">{b.clientEmail}</p>
                    </td>
                    <td className="py-3 font-medium text-[#637084]">
                      {b.date} at {b.time}
                    </td>
                    <td className="py-3 font-medium text-[#14243b]">
                      {b.serviceTitle?.en || 'General Session'}
                    </td>
                    <td className="py-3 font-bold text-[#14243b]">
                      {b.amount ? `${b.amount} ${b.currency || 'EGP'}` : '—'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'awaiting_verification'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
