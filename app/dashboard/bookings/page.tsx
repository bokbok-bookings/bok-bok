import React from 'react'
import { verifySession } from '@/lib/auth/dal'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { BookingsManager } from '@/components/dashboard/bookings-manager'

export const dynamic = 'force-dynamic'

export default async function ExpertBookingsPage() {
  const session = await verifySession()

  let expertDoc = null
  if (session.expertId) {
    const expertsCol = await getExpertsCollection()
    try {
      expertDoc = await expertsCol.findOne({ _id: toObjectId(session.expertId) })
    } catch {
      expertDoc = null
    }
  }

  const effectiveExpertId = session.expertId || expertDoc?._id.toString() || ''
  const isPlatformAdmin = session.role === 'admin'

  return (
    <div className="space-y-6">
      <BookingsManager
        expertId={effectiveExpertId}
        isAdmin={isPlatformAdmin}
      />
    </div>
  )
}
