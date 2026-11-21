import type { Metadata } from 'next'
import { CatalogListing } from '@/components/catalog/catalog-listing'

export const metadata: Metadata = {
  title: 'Hands-on Workshops | Interactive Masterclasses & Skill Labs',
  description: 'Interactive group workshops and practical masterclasses designed to build tangible skills alongside expert instructors.',
  openGraph: {
    title: 'Hands-on Workshops | Bok Bok',
    description: 'Interactive group workshops and practical masterclasses designed to build tangible skills alongside expert instructors.',
    type: 'website',
  },
}

export default function WorkshopsPage() {
  return (
    <CatalogListing
      view="workshops"
      title="Hands-on Workshops"
      subtitle="Interactive group sessions and masterclasses designed to build tangible skills alongside expert instructors."
    />
  )
}
