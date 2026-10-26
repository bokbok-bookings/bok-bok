'use client'

import { CatalogListing } from '@/components/catalog/catalog-listing'

export default function ServicesPage() {
  return (
    <CatalogListing
      view="services"
      title="Appointment Services"
      subtitle="Discover and book professional appointment-based services from top photography sessions, beauty & bridal styling, to design audits."
      badgeText="Direct Services"
    />
  )
}
