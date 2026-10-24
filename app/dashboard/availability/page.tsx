import React from 'react'
import { verifySession } from '@/lib/auth/dal'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { AvailabilityManager } from '@/components/dashboard/availability-manager'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<{ expertId?: string }> | { expertId?: string }
}

export default async function ExpertAvailabilityPage({ searchParams }: PageProps) {
  const session = await verifySession()
  const resolvedParams = searchParams ? await searchParams : {}
  const queryExpertId = resolvedParams.expertId

  const isPlatformAdmin = session.role === 'admin'
  const expertsCol = await getExpertsCollection()

  let targetExpertDoc = null
  const targetId = isPlatformAdmin && queryExpertId ? queryExpertId : session.expertId

  if (targetId) {
    try {
      targetExpertDoc = await expertsCol.findOne({ _id: toObjectId(targetId) })
    } catch {
      targetExpertDoc = null
    }
  }

  // If still no expert found (e.g. admin without query param), pick first expert from DB
  if (!targetExpertDoc) {
    targetExpertDoc = await expertsCol.findOne({})
  }

  const effectiveExpertId = targetExpertDoc?._id.toString() || session.expertId || ''
  const effectiveExpertName = targetExpertDoc?.name || session.displayName || 'Expert'
  const effectiveExpertSlug = targetExpertDoc?.slug || ''

  return (
    <div className="space-y-6">
      <div className="border-b border-[#eeeae4] pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#14243b]">Working Hours & Availability</h1>
        <p className="text-xs text-[#637084] mt-0.5">
          {isPlatformAdmin
            ? `Admin inspection for ${effectiveExpertName}. You can adjust weekly hours and vacation overrides.`
            : 'Configure your weekly recurring hours, breaks, and date-specific closures or custom shifts.'}
        </p>
      </div>

      <AvailabilityManager
        initialExpertId={effectiveExpertId}
        initialExpertName={effectiveExpertName}
        initialExpertSlug={effectiveExpertSlug}
        showExpertPicker={isPlatformAdmin}
      />
    </div>
  )
}
