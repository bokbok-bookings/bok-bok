import React from 'react'
import { verifySession } from '@/lib/auth/dal'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { ServicesManager } from '@/components/dashboard/services-manager'

export const dynamic = 'force-dynamic'

export default async function ExpertServicesPage() {
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

  return (
    <div className="space-y-6">
      <ServicesManager
        expertId={effectiveExpertId}
        expertName={expertDoc?.name || session.displayName}
      />
    </div>
  )
}
