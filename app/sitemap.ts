import type { MetadataRoute } from 'next'
import { getExpertsCollection, getServicesCollection } from '@/lib/db'
import { ALLOWED_CATEGORY_SLUGS } from '@/lib/data/categories'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bokbok.io'
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/consultations`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/workshops`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/webinars`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/experts`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  let expertRoutes: MetadataRoute.Sitemap = []
  let serviceRoutes: MetadataRoute.Sitemap = []

  try {
    const expertsCol = await getExpertsCollection()
    const approvedExperts = await expertsCol
      .find({ status: 'approved' }, { projection: { slug: 1, updatedAt: 1 } })
      .toArray()

    expertRoutes = approvedExperts
      .filter((e) => Boolean(e.slug))
      .map((e) => ({
        url: `${baseUrl}/experts/${e.slug}`,
        lastModified: e.updatedAt ? new Date(e.updatedAt) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (err) {
    console.error('[Sitemap] Failed to fetch experts:', err)
  }

  try {
    const servicesCol = await getServicesCollection()
    const approvedServices = await servicesCol
      .find(
        {
          approvalStatus: 'approved',
          isActive: true,
          categorySlug: { $in: Array.from(ALLOWED_CATEGORY_SLUGS) },
        },
        { projection: { slug: 1, updatedAt: 1 } }
      )
      .toArray()

    serviceRoutes = approvedServices
      .filter((s) => Boolean(s.slug))
      .map((s) => ({
        url: `${baseUrl}/services/${s.slug}`,
        lastModified: s.updatedAt ? new Date(s.updatedAt) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (err) {
    console.error('[Sitemap] Failed to fetch services:', err)
  }

  return [...staticRoutes, ...expertRoutes, ...serviceRoutes]
}
