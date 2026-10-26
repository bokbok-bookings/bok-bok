'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import { useState } from 'react'

export default function CheckoutPage() {
  const [paid, setPaid] = useState(false)

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-5 text-[#14243b]">
      <div className="mx-auto max-w-5xl pb-20">
        <div className="flex h-16 items-center justify-between border-b border-[#e7e2da]">
          <Link
            href="/experts"
            className="text-xs font-bold text-[#ef5b4c] hover:underline"
          >
            ← Back to directory
          </Link>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#637084] border border-[#dedbd5]">
            Secure checkout
          </span>
        </div>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_390px]">
          <section>
            <Link
              href="/experts/layla-hassan"
              className="inline-flex items-center text-xs font-bold text-[#ef5b4c] hover:underline"
            >
              ← Back to Layla&apos;s profile
            </Link>

            <p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[#ef5b4c]">
              Step 2 of 2
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Complete your booking</h1>
            <p className="mt-2 text-sm text-[#637084]">
              Your session time is held while you complete payment.
            </p>

            <div className="mt-8 rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-base font-bold text-[#14243b]">Payment details</h2>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-1.5 text-xs font-bold text-[#14243b]">
                  Card number
                  <input
                    className="rounded-2xl border border-[#dedbd5] bg-[#fbfaf7] px-4 py-3 text-sm font-normal outline-none focus:border-[#ef5b4c]"
                    placeholder="4242 4242 4242 4242"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-bold text-[#14243b]">
                    Expiry
                    <input
                      className="rounded-2xl border border-[#dedbd5] bg-[#fbfaf7] px-4 py-3 text-sm font-normal outline-none focus:border-[#ef5b4c]"
                      placeholder="MM / YY"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-[#14243b]">
                    CVC
                    <input
                      className="rounded-2xl border border-[#dedbd5] bg-[#fbfaf7] px-4 py-3 text-sm font-normal outline-none focus:border-[#ef5b4c]"
                      placeholder="123"
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-xs font-bold text-[#14243b]">
                  Name on card
                  <input
                    className="rounded-2xl border border-[#dedbd5] bg-[#fbfaf7] px-4 py-3 text-sm font-normal outline-none focus:border-[#ef5b4c]"
                    placeholder="Sara Ahmed"
                  />
                </label>
              </div>

              {paid ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800">
                  Payment confirmed! Your session with Layla Hassan has been added to your calendar.
                </div>
              ) : (
                <button
                  onClick={() => setPaid(true)}
                  className="mt-6 w-full rounded-full bg-[#ef5b4c] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#d94c3e]"
                >
                  Confirm and Pay 750 EGP
                </button>
              )}
            </div>
          </section>

          <aside className="h-fit rounded-3xl bg-[#14243b] p-7 text-white shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-white/50">
              Booking summary
            </p>
            <h2 className="mt-4 text-2xl font-semibold">Product strategy session</h2>
            <div className="mt-6 flex items-center gap-3 border-b border-white/10 pb-6">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#ef5b4c] text-sm font-bold text-white">
                LH
              </div>
              <div>
                <p className="font-bold">Layla Hassan</p>
                <p className="text-xs text-white/60">Tomorrow · 11:00 AM · 45 min Video call</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-white/65">
              <span>Expert consultation</span>
              <span>750 EGP</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-base font-bold">
              <span>Total due</span>
              <span>750 EGP</span>
            </div>
            <p className="mt-6 text-[11px] leading-5 text-white/55">
              Free reschedule or cancellation up to 12 hours before your session.
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
