import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth/dal'
import {
  getBookingsCollection,
  getExpertsCollection,
  getServicesCollection,
  getUsersCollection,
} from '@/lib/db'
import { AdminShell, type AdminShellCounts } from '@/components/admin/admin-shell'

export const metadata: Metadata = {
  title: 'Bok Bok · Administrator Console',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifySession()

  if (session.role !== 'admin') {
    redirect('/login?callbackUrl=/admin')
  }

  let counts: AdminShellCounts = {
    pendingBookings: 0,
    pendingExperts: 0,
    pendingServices: 0,
    totalExperts: 0,
    totalUsers: 0,
  }

  try {
    const [bookingsCol, expertsCol, servicesCol, usersCol] = await Promise.all([
      getBookingsCollection(),
      getExpertsCollection(),
      getServicesCollection(),
      getUsersCollection(),
    ])

    const [
      pendingBookings,
      pendingExperts,
      pendingServices,
      totalExperts,
      totalUsers,
    ] = await Promise.all([
      bookingsCol.countDocuments({
        status: { $in: ['awaiting_verification', 'pending'] },
      }),
      expertsCol.countDocuments({
        $or: [{ status: 'pending_review' }, { hasPendingInfoUpdate: true }],
      }),
      servicesCol.countDocuments({ approvalStatus: 'pending' }),
      expertsCol.countDocuments({}),
      usersCol.countDocuments({}),
    ])

    counts = {
      pendingBookings,
      pendingExperts,
      pendingServices,
      totalExperts,
      totalUsers,
    }
  } catch (err) {
    console.warn('Failed to fetch admin sidebar counts:', err)
  }

  return (
    <AdminShell
      user={{
        userId: session.userId,
        email: session.email,
        displayName: session.displayName,
        role: session.role,
      }}
      counts={counts}
    >
      {children}
    </AdminShell>
  )
}

