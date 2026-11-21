import type { Metadata } from 'next'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'
import { ServiceDetailView } from '@/components/service/service-detail-view'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bokbok.io'

  let service: any = null
  let expert: any = null

  try {
    const servicesCol = await getServicesCollection()
    service = await servicesCol.findOne({
      $or: [{ slug }, { _id: toObjectId(slug) }],
    })

    if (service?.expertId) {
      const expertsCol = await getExpertsCollection()
      expert = await expertsCol.findOne({ _id: toObjectId(service.expertId) })
    }
  } catch (err) {
    console.error('Failed to fetch service for metadata:', err)
  }

  if (!service) {
    return {
      title: 'Service Details | Bok Bok',
    }
  }

  const serviceTitle = service.title?.en || service.title?.ar || 'Consultation Session'
  const expertName = expert?.name || 'Verified Expert'
  const rawDesc =
    service.description?.en ||
    service.description?.ar ||
    'Book verified 1-on-1 consultations and workshops on Bok Bok.'
  const description = rawDesc.length > 160 ? `${rawDesc.slice(0, 157)}...` : rawDesc
  const image = service.thumbnailUrl || expert?.image || '/testFavsmall.png'
  const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`

  return {
    title: `${serviceTitle} | ${expertName} | Bok Bok`,
    description,
    keywords: [
      serviceTitle,
      expertName,
      service.categorySlug || 'Consulting',
      service.bookingType || 'Session',
      'Bok Bok',
    ],
    openGraph: {
      type: 'article',
      title: `${serviceTitle} | ${expertName} | Bok Bok`,
      description,
      url: `${baseUrl}/services/${slug}`,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 500,
          alt: serviceTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${serviceTitle} | ${expertName} | Bok Bok`,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${baseUrl}/services/${slug}`,
    },
  }
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bokbok.io'

  let service: any = null
  let expert: any = null

  try {
    const servicesCol = await getServicesCollection()
    service = await servicesCol.findOne({
      $or: [{ slug }, { _id: toObjectId(slug) }],
    })

    if (service?.expertId) {
      const expertsCol = await getExpertsCollection()
      expert = await expertsCol.findOne({ _id: toObjectId(service.expertId) })
    }
  } catch (err) {
    console.error('Failed to load service for schema:', err)
  }

  let jsonLd = null
  let initialService: any = null

  if (service) {
    const serviceTitle = service.title?.en || service.title?.ar || 'Consultation Session'
    const serviceDesc = service.description?.en || service.description?.ar || ''
    const price = service.pricing?.prices?.EGP ?? 0
    const expertName = expert?.name || 'Verified Expert'
    const isEvent = service.bookingType === 'WORKSHOP' || service.bookingType === 'WEBINAR'
    const image = service.thumbnailUrl || (service.categorySlug ? `/categories/${service.categorySlug}.png` : expert?.image || '/testFavsmall.png')
    const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`

    initialService = {
      ...service,
      _id: service._id.toString(),
      expertId: service.expertId?.toString() || '',
      slug: service.slug || service._id.toString(),
      thumbnailUrl:
        service.thumbnailUrl ||
        (service.categorySlug ? `/categories/${service.categorySlug}.png` : undefined),
      expert: expert
        ? {
          name: expert.name,
          slug: expert.slug,
          role: expert.role,
          location: expert.location,
          image: expert.image || expert.avatarUrl || '/experts/layla.png',
          rating: expert.reviews && Number(expert.reviews) > 0 ? expert.rating : '',
          reviews: expert.reviews || 0,
          bio: expert.bio || expert.about || '',
        }
        : null,
    }

    const breadcrumbCatalogName = isEvent
      ? service.bookingType === 'WORKSHOP'
        ? 'Workshops'
        : 'Webinars'
      : 'Consultations'
    const breadcrumbCatalogPath = isEvent
      ? service.bookingType === 'WORKSHOP'
        ? '/workshops'
        : '/webinars'
      : '/consultations'

    const mainEntity = isEvent
      ? {
        '@type': 'EducationEvent',
        '@id': `${baseUrl}/services/${slug}#event`,
        name: serviceTitle,
        description: serviceDesc,
        image: imageUrl,
        startDate: service.event?.date
          ? `${service.event.date}T${service.event.startTime || '18:00'}:00+02:00`
          : undefined,
        endDate: service.event?.date && service.event?.endTime
          ? `${service.event.date}T${service.event.endTime}:00+02:00`
          : undefined,
        eventAttendanceMode:
          service.deliveryMode === 'IN_PERSON'
            ? 'https://schema.org/OfflineEventAttendanceMode'
            : 'https://schema.org/OnlineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        maximumAttendeeCapacity: service.event?.capacity || 20,
        remainingAttendeeCapacity: Math.max(
          0,
          (service.event?.capacity || 20) - (service.event?.registeredCount || 0)
        ),
        organizer: {
          '@type': 'Person',
          name: expertName,
          url: expert?.slug ? `${baseUrl}/experts/${expert.slug}` : undefined,
        },
        offers: {
          '@type': 'Offer',
          price,
          priceCurrency: 'EGP',
          availability: 'https://schema.org/InStock',
          url: `${baseUrl}/services/${slug}`,
        },
      }
      : {
        '@type': 'Service',
        '@id': `${baseUrl}/services/${slug}#service`,
        name: serviceTitle,
        description: serviceDesc,
        image: imageUrl,
        serviceType: '1-on-1 Professional Consultation',
        provider: {
          '@type': 'Person',
          name: expertName,
          url: expert?.slug ? `${baseUrl}/experts/${expert.slug}` : undefined,
        },
        offers: {
          '@type': 'Offer',
          price,
          priceCurrency: 'EGP',
          availability: 'https://schema.org/InStock',
          url: `${baseUrl}/services/${slug}`,
        },
      }

    jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        mainEntity,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: baseUrl,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: breadcrumbCatalogName,
              item: `${baseUrl}${breadcrumbCatalogPath}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: serviceTitle,
              item: `${baseUrl}/services/${slug}`,
            },
          ],
        },
      ],
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ServiceDetailView slug={slug} initialService={initialService} />
    </>
  )
}
