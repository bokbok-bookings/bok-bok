import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { verifySession } from '@/lib/auth/dal'
import { getExpertsCollection } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const metadata: Metadata = {
  title: 'Bok Bok · Expert Workspace',
  robots: { index: false, follow: false },
}

export default async function ExpertDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifySession()

  // If admin tries to access /dashboard, they can view or use /admin
  let expertDoc = null
  if (session.expertId) {
    const expertsCol = await getExpertsCollection()
    try {
      expertDoc = await expertsCol.findOne({ _id: new ObjectId(session.expertId) })
    } catch {
      expertDoc = null
    }
  }

  return (
    <DashboardShell
      user={{
        userId: session.userId,
        email: session.email,
        displayName: session.displayName,
        role: session.role,
        expertId: session.expertId,
        status: expertDoc?.status,
        slug: expertDoc?.slug,
      }}
    >
      {children}
    </DashboardShell>
  )
}
