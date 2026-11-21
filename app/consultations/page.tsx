import type { Metadata } from 'next'
import { CatalogListing } from '@/components/catalog/catalog-listing'

export const metadata: Metadata = {
  title: 'Expert Consultations | 1-on-1 Advice & Strategy Sessions',
  description: 'Connect 1-on-1 with vetted industry practitioners to resolve your specific business, career, tech, or creative challenges.',
  openGraph: {
    title: 'Expert Consultations | Bok Bok',
    description: 'Connect 1-on-1 with vetted industry practitioners to resolve your specific business, career, tech, or creative challenges.',
    type: 'website',
  },
}

export default function ConsultationsPage() {
  return (
    <CatalogListing
      view="consultations"
      title="Expert Consultations"
      subtitle="Connect 1-on-1 with vetted industry practitioners to resolve your specific business, career, or creative challenges."
    />
  )
}
