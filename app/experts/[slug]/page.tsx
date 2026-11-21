import type { Metadata } from 'next'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { getExpertBySlug } from '@/lib/data/experts'
import { ExpertProfileView } from '@/components/expert/expert-profile-view'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bokbok.io'

  let expert: any = null
  try {
    const expertsCol = await getExpertsCollection()
    expert = await expertsCol.findOne({ slug })
  } catch (err) {
    console.error('Failed to fetch expert for metadata:', err)
  }

  if (!expert) {
    expert = getExpertBySlug(slug)
  }

  if (!expert) {
    return {
      title: 'Expert Profile | Bok Bok',
    }
  }

  const title = `${expert.name} — ${expert.role || 'Industry Expert'} | Bok Bok`
  const rawBio = expert.bio || expert.about || 'Connect with top vetted industry practitioners on Bok Bok.'
  const description = rawBio.length > 160 ? `${rawBio.slice(0, 157)}...` : rawBio
  const image = expert.image || expert.avatarUrl || '/testFavsmall.png'
  const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`

  return {
    title,
    description,
    keywords: [
      expert.name,
      expert.role,
      expert.category || 'Consulting',
      'expert Egypt',
      'Cairo advisor',
      'Bok Bok',
    ],
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `${baseUrl}/experts/${slug}`,
      images: [
        {
          url: imageUrl,
          width: 600,
          height: 600,
          alt: expert.name,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${baseUrl}/experts/${slug}`,
    },
  }
}

export default async function ExpertPage({ params }: PageProps) {
  const { slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bokbok.io'

  let expert: any = null
  try {
    const expertsCol = await getExpertsCollection()
    expert = await expertsCol.findOne({ slug })
  } catch (err) {
    console.error('Failed to load expert for schema:', err)
  }

  if (!expert) {
    expert = getExpertBySlug(slug)
  }

  const jsonLd = expert
    ? {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          '@id': `${baseUrl}/experts/${slug}#expert`,
          name: expert.name,
          jobTitle: expert.role,
          description: expert.bio || expert.about,
          image: expert.image || expert.avatarUrl,
          workLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'EG',
              addressLocality: 'Cairo',
            },
          },
          ...(expert.rating
            ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: expert.rating,
                reviewCount: expert.reviewCount || 1,
              },
            }
            : {}),
          knowsAbout: Array.isArray(expert.tags)
            ? expert.tags
            : [expert.category || 'Consulting'],
          worksFor: {
            '@type': 'Organization',
            name: 'Bok Bok',
            url: baseUrl,
          },
        },
        {
          '@type': 'ProfilePage',
          '@id': `${baseUrl}/experts/${slug}#webpage`,
          url: `${baseUrl}/experts/${slug}`,
          name: `${expert.name} — Expert Profile | Bok Bok`,
          mainEntity: { '@id': `${baseUrl}/experts/${slug}#expert` },
          breadcrumb: {
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
                name: 'Experts',
                item: `${baseUrl}/experts`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: expert.name,
                item: `${baseUrl}/experts/${slug}`,
              },
            ],
          },
        },
      ],
    }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ExpertProfileView slug={slug} />
    </>
  )
}
