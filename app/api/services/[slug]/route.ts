import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'
import { isAllowedMvpCategory, isAllowedMvpSubcategory } from '@/lib/data/categories'
import { stripUnverifiedAccreditationClaims } from '@/lib/services/service-validation'

export const dynamic = 'force-dynamic'

interface RouteProps {
  params: Promise<{ slug: string }> | { slug: string }
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { slug } = resolvedParams

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Service slug is required' }, { status: 400 })
    }

    const servicesCol = await getServicesCollection()
    const expertsCol = await getExpertsCollection()

    // 1. Try finding by unique slug
    let serviceDoc = await servicesCol.findOne({ slug, isActive: true })

    // 2. Fallback to ID if someone visits with an ObjectId
    if (!serviceDoc && ObjectId.isValid(slug)) {
      try {
        serviceDoc = await servicesCol.findOne({ _id: toObjectId(slug), isActive: true })
      } catch {
        // continue
      }
    }

    if (
      !serviceDoc ||
      serviceDoc.approvalStatus !== 'approved' ||
      serviceDoc.serviceKind === 'GENERAL_SERVICE' ||
      !isAllowedMvpCategory(serviceDoc.categorySlug) ||
      !isAllowedMvpSubcategory(serviceDoc.categorySlug, serviceDoc.subcategorySlug) ||
      (serviceDoc.requiresLicensingReview &&
        serviceDoc.licensingReviewStatus !== 'licensing_approved')
    ) {
      return NextResponse.json(
        { success: false, error: 'Offer not found, inactive, or pending compliance review' },
        { status: 404 }
      )
    }

    const expert = await expertsCol.findOne({ _id: serviceDoc.expertId })

    const verifiedAccreditation = Boolean(serviceDoc.hasVerifiedAccreditationAuthorization)
    const safeTitle = verifiedAccreditation
      ? serviceDoc.title
      : {
          en: stripUnverifiedAccreditationClaims(serviceDoc.title?.en || ''),
          ar: stripUnverifiedAccreditationClaims(serviceDoc.title?.ar || ''),
        }
    const safeDescription = verifiedAccreditation
      ? serviceDoc.description
      : {
          en: stripUnverifiedAccreditationClaims(serviceDoc.description?.en || ''),
          ar: stripUnverifiedAccreditationClaims(serviceDoc.description?.ar || ''),
        }

    const formatted = {
      ...serviceDoc,
      title: safeTitle,
      description: safeDescription,
      adultsOnly: true,
      minimumAge: 18,
      _id: serviceDoc._id.toString(),
      expertId: serviceDoc.expertId.toString(),
      slug: serviceDoc.slug || serviceDoc._id.toString(),
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

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch service' },
      { status: 500 }
    )
  }
}
