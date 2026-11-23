import type { Metadata } from 'next'
import { ObjectId } from 'mongodb'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'
import { isAllowedMvpCategory, isAllowedMvpSubcategory } from '@/lib/data/categories'
import { stripUnverifiedAccreditationClaims } from '@/lib/services/service-validation'
import { ServiceDetailView } from '@/components/service/service-detail-view'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function fetchPublicServiceAndExpert(slug: string): Promise<{
  service: any | null
  expert: any | null
}> {
  if (!slug) return { service: null, expert: null }

  const servicesCol = await getServicesCollection()
  const orConditions: any[] = [{ slug }]
  if (ObjectId.isValid(slug)) {
    orConditions.push({ _id: new ObjectId(slug) })
  }

  const service = await servicesCol.findOne({ $or: orConditions, isActive: true })
  if (
    !service ||
    service.approvalStatus !== 'approved' ||
    service.serviceKind === 'GENERAL_SERVICE' ||
    !isAllowedMvpCategory(service.categorySlug) ||
    !isAllowedMvpSubcategory(service.categorySlug, service.subcategorySlug) ||
    (service.requiresLicensingReview &&
      service.licensingReviewStatus !== 'licensing_approved')
  ) {
    return { service: null, expert: null }
  }

  let expert: any = null
  if (
    service.expertId &&
    (service.expertId instanceof ObjectId || ObjectId.isValid(String(service.expertId)))
  ) {
    const expertsCol = await getExpertsCollection()
    expert = await expertsCol.findOne({ _id: toObjectId(service.expertId) })
  }

  return { service, expert }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bokbok.io'

  let service: any = null
  let expert: any = null

  try {
    const res = await fetchPublicServiceAndExpert(slug)
    service = res.service
    expert = res.expert
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
    const res = await fetchPublicServiceAndExpert(slug)
    service = res.service
    expert = res.expert
  } catch (err) {
    console.error('Failed to load service for schema:', err)
  }

  let jsonLd = null
  let initialService: any = null

  if (service) {
    const verifiedAccreditation = Boolean(service.hasVerifiedAccreditationAuthorization)
    const safeTitle = verifiedAccreditation
      ? service.title
      : {
        en: stripUnverifiedAccreditationClaims(service.title?.en || ''),
        ar: stripUnverifiedAccreditationClaims(service.title?.ar || ''),
      }
    const safeDescription = verifiedAccreditation
      ? service.description
      : {
        en: stripUnverifiedAccreditationClaims(service.description?.en || ''),
        ar: stripUnverifiedAccreditationClaims(service.description?.ar || ''),
      }

    const serviceTitle = safeTitle?.en || safeTitle?.ar || 'Consultation Session'
    const serviceDesc = safeDescription?.en || safeDescription?.ar || ''
    const price = service.pricing?.prices?.EGP ?? 0
    const expertName = expert?.name || 'Verified Expert'
    const isEvent = service.bookingType === 'WORKSHOP' || service.bookingType === 'WEBINAR'
    const image = service.thumbnailUrl || (service.categorySlug ? `/categories/${service.categorySlug}.png` : expert?.image || '/testFavsmall.png')
    const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`

    const safeEvent = service.event
      ? (() => {
        const { joinUrl, recordingUrl, materials, ...rest } = service.event
        return {
          ...rest,
          hasRecording: Boolean(recordingUrl),
          materialsCount: Array.isArray(materials) ? materials.length : 0,
        }
      })()
      : undefined

    const { approvedBy: _approvedBy, licensingReviewedBy: _licensingReviewedBy, ...restService } = service

    initialService = JSON.parse(
      JSON.stringify({
        ...restService,
        ...(safeEvent ? { event: safeEvent } : {}),
        title: safeTitle,
        description: safeDescription,
        adultsOnly: true,
        minimumAge: 18,
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
      })
    )

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
