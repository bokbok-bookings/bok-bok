'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { UserRole, ExpertStatus } from '@/lib/db'

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    userId: string
    email: string
    displayName: string
    role: UserRole
    expertId?: string
    status?: ExpertStatus
    slug?: string
  }
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
    },
    {
      name: 'Consultation Services',
      href: '/dashboard/services',
    },
    {
      name: 'Working Hours & Schedule',
      href: '/dashboard/availability',
    },
    {
      name: 'Bookings & Receipts',
      href: '/dashboard/bookings',
    },
    {
      name: 'Public Profile',
      href: '/dashboard/profile',
    },
  ]

  const isPending = user.status === 'pending_review'
  const isDraft = user.status === 'draft'

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#14243b] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#e7e2da] sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-[#ef5b4c] text-xs font-black text-white">
            B
          </span>
          Bok Bok Expert
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-[#dedbd5] bg-white px-3 py-1.5 text-xs font-bold text-[#14243b]"
        >
          {mobileOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#e7e2da] flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#eeeae4] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#ef5b4c] text-sm font-black text-white">
              B
            </span>
            <div>
              <span className="leading-tight block">Bok Bok</span>
              <span className="text-[10px] uppercase tracking-wider text-[#8b94a1] font-semibold block">
                Expert Workspace
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-xs font-bold text-[#637084]"
          >
            ✕
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 rounded-2xl bg-[#faf8f5] border border-[#eeeae4]">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-[#14243b] text-white flex items-center justify-center font-bold text-xs uppercase">
              {user.displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#14243b] truncate">{user.displayName}</p>
              <span className="inline-block mt-0.5 rounded-full bg-[#ef5b4c]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#ef5b4c]">
                {user.role}
              </span>
            </div>
          </div>
          {user.status && (
            <div className="mt-3 pt-2.5 border-t border-[#eeeae4] flex items-center justify-between text-[11px]">
              <span className="text-[#8b94a1]">Status:</span>
              <span
                className={`font-bold ${
                  user.status === 'approved'
                    ? 'text-emerald-700'
                    : user.status === 'pending_review'
                    ? 'text-amber-700'
                    : 'text-neutral-500'
                }`}
              >
                {user.status === 'approved'
                  ? 'Live & Approved'
                  : user.status === 'pending_review'
                  ? 'In Review'
                  : 'Draft Profile'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#14243b] text-white'
                    : 'text-[#637084] hover:bg-[#faf8f5] hover:text-[#14243b]'
                }`}
              >
                <span>{item.name}</span>
                {isActive && <span className="text-[10px] text-[#ef5b4c] font-black">●</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#eeeae4] space-y-2">
          {user.slug && (
            <Link
              href={`/experts/${user.slug}`}
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#637084] hover:bg-[#faf8f5] hover:text-[#14243b]"
            >
              <span>View Public Page</span>
              <span className="text-[10px] text-[#8b94a1]">↗</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
          >
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
            <span>→</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 overflow-y-auto max-w-6xl">
        {isPending && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <strong className="font-bold">Your profile is currently under review by our team.</strong>
              <p className="mt-0.5 text-amber-800">
                You can configure your services, availability, and profile. Once approved by an administrator, your profile will be publicly bookable.
              </p>
            </div>
            <span className="rounded-full bg-amber-200 px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-amber-900">
              Pending Approval
            </span>
          </div>
        )}

        {isDraft && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 flex items-center justify-between">
            <div>
              <strong className="font-bold">Profile Setup in Progress</strong>
              <p className="mt-0.5 text-blue-800">
                Complete your details and services, then submit for review to go live.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="rounded-full bg-blue-600 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
            >
              Continue Onboarding →
            </Link>
          </div>
        )}

        {children}
      </main>
    </div>
  )
}
