'use client'

import { CatalogListing } from '@/components/catalog/catalog-listing'

export default function ExploreAllPage() {
  return (
    <CatalogListing
      view="all"
      title="Explore Marketplace"
      subtitle="Discover everything Bok Bok offers — consultations, direct services, group workshops, and live webinars across 13 fields."
      badgeText="Marketplace Directory"
    />
  )
}
