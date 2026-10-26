'use client'

import { CatalogListing } from '@/components/catalog/catalog-listing'

export default function WebinarsPage() {
  return (
    <CatalogListing
      view="webinars"
      title="Live Online Webinars"
      subtitle="Engaging live webinars with industry leaders covering key insights, trends, and direct Q&A."
      badgeText="Online Events"
    />
  )
}
