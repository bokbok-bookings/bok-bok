import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { verifySession, getCurrentUser } from '@/lib/auth/dal'
import { ClientAccountManager } from '@/components/account/client-account-manager'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Bookings & Account · Bok Bok',
  description: 'Manage your consultation bookings, reschedule sessions, and review experts on Bok Bok.',
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const session = await verifySession()

  const fullUser = await getCurrentUser()

  return (
    <ClientAccountManager
      user={{
        userId: session.userId,
        email: session.email,
        displayName: fullUser?.displayName || session.displayName || session.email.split('@')[0],
        role: session.role,
      }}
    />
  )
}

