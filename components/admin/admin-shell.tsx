'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/brand/logo'
import {
  LayoutDashboard,
  CalendarCheck,
  UserCheck,
  Briefcase,
  ClipboardCheck,
  FolderTree,
  Users,
  Shield,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

export interface AdminShellCounts {
  pendingBookings: number
  pendingExperts: number
  pendingServices: number
  totalExperts: number
  totalUsers: number
}

interface AdminShellProps {
  children: React.ReactNode
  user: {
    userId: string
    email: string
    displayName: string
    role: string
  }
  counts: AdminShellCounts
}

export function AdminShell({ children, user, counts }: AdminShellProps) {
  const pathname = usePathname() || '/admin'
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
      href: '/admin',
      icon: LayoutDashboard,
      badge:
        counts.pendingBookings + counts.pendingExperts > 0
          ? counts.pendingBookings + counts.pendingExperts
          : undefined,
      badgeHighlight: true,
    },
    {
      name: 'Bookings & Receipts',
      href: '/admin/bookings',
      icon: CalendarCheck,
      badge: counts.pendingBookings > 0 ? counts.pendingBookings : undefined,
      badgeHighlight: true,
    },
    {
      name: 'Experts Pending Activation',
      href: '/admin/queue',
      icon: UserCheck,
      badge: counts.pendingExperts > 0 ? counts.pendingExperts : undefined,
      badgeHighlight: true,
    },
    {
      name: 'Offers & Licensing',
      href: '/admin/services',
      icon: Briefcase,
      badge: counts.pendingServices > 0 ? counts.pendingServices : undefined,
      badgeHighlight: true,
    },
    {
      name: 'Attendance & Disputes',
      href: '/admin/attendance',
      icon: ClipboardCheck,
    },
    {
      name: 'Categories & Taxonomy',
      href: '/admin/categories',
      icon: FolderTree,
    },
    {
      name: 'Directory Experts',
      href: '/admin/experts',
      icon: Users,
      badge: counts.totalExperts || undefined,
      badgeHighlight: false,
    },
    {
      name: 'Users & Staff',
      href: '/admin/users',
      icon: Shield,
      badge: counts.totalUsers || undefined,
      badgeHighlight: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#14243b] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#e7e2da] sticky top-0 z-40">
        <BrandLogo href="/admin" size="sm" subtitle="Admin Console" />
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dedbd5] bg-white px-3 py-1.5 text-xs font-bold text-[#14243b]"
        >
          {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          <span>{mobileOpen ? 'Close' : 'Menu'}</span>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-68 shrink-0 bg-white border-r border-[#e7e2da] flex flex-col transition-transform duration-200 md:sticky md:top-0 md:h-screen md:max-h-screen md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#eeeae4] flex items-center justify-between">
          <BrandLogo href="/admin" size="sm" subtitle="Administrator Console" />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-xs font-bold text-[#637084]"
          >
            ✕
          </button>
        </div>

        {/* Admin User Card */}
        <div className="p-4 mx-4 my-4 rounded-2xl bg-[#faf8f5] border border-[#eeeae4]">
          <div className="flex items-center gap-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[#14243b] text-white flex items-center justify-center font-bold text-xs uppercase border border-[#dedbd5]">
              {(user.displayName || user.email || 'A').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#14243b] truncate">
                {user.displayName || 'Administrator'}
              </p>
              <p className="text-[11px] text-[#637084] truncate">{user.email}</p>
              <span className="inline-block mt-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700">
                Platform Admin
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${isActive
                    ? 'bg-[#14243b] text-white shadow-xs'
                    : 'text-[#637084] hover:bg-[#faf8f5] hover:text-[#14243b]'
                  }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon
                    size={15}
                    className={isActive ? 'text-accent shrink-0' : 'text-[#8b94a1] shrink-0'}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black shrink-0 ${isActive
                        ? 'bg-accent text-primary'
                        : item.badgeHighlight
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#eeeae4] text-[#637084]'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#eeeae4] space-y-1.5">
          {/* <Link
            href="/admin/users?new=1"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center w-full rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-hover transition shadow-2xs"
          >
            + Create New User
          </Link> */}

          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#637084] hover:bg-[#faf8f5] hover:text-[#14243b]"
          >
            <span>Public Site</span>
            <ExternalLink size={13} className="text-[#8b94a1]" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
          >
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
            <LogOut size={13} />
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
      <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 overflow-y-auto max-w-7xl">
        {children}
      </main>
    </div>
  )
}

