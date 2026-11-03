'use client'

import { CatalogListing } from '@/components/catalog/catalog-listing'

export default function ServicesPage() {
  return (
    <CatalogListing
      view="all"
      title="Consultations, Workshops & Webinars"
      subtitle="Bok Bok is an adults-only (18+) marketplace for Consultations, Workshops, and Webinars across 9 approved fields. Professional Services are outside the MVP."
      badgeText="MVP Marketplace"
    />
  )
}
