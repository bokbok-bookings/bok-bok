'use client'

import { CatalogListing } from '@/components/catalog/catalog-listing'

export default function WorkshopsPage() {
  return (
    <CatalogListing
      view="workshops"
      title="Hands-on Workshops"
      subtitle="Interactive group sessions and masterclasses designed to build tangible skills alongside expert instructors."
      badgeText="Group Learning"
    />
  )
}
