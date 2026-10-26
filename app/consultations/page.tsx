'use client'

import { CatalogListing } from '@/components/catalog/catalog-listing'

export default function ConsultationsPage() {
  return (
    <CatalogListing
      view="consultations"
      title="Expert Consultations"
      subtitle="Connect 1-on-1 with vetted industry practitioners to resolve your specific business, career, or creative challenges."
      badgeText="Individual Sessions"
    />
  )
}
