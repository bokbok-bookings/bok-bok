import type { Metadata } from 'next'
import { CatalogListing } from '@/components/catalog/catalog-listing'

export const metadata: Metadata = {
  title: 'Live Online Webinars | Industry Insights & Direct Q&A',
  description: 'Engaging live webinars with industry leaders covering key insights, emerging trends, and interactive direct Q&A.',
  openGraph: {
    title: 'Live Online Webinars | Bok Bok',
    description: 'Engaging live webinars with industry leaders covering key insights, emerging trends, and interactive direct Q&A.',
    type: 'website',
  },
}

export default function WebinarsPage() {
  return (
    <CatalogListing
      view="webinars"
      title="Live Online Webinars"
      subtitle="Engaging live webinars with industry leaders covering key insights, trends, and direct Q&A."
    />
  )
}
