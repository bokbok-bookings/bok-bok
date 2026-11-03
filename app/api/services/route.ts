import { NextResponse } from 'next/server'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'
import { buildClassificationFilter, isCatalogView } from '@/lib/services/service-types'
import {
  ALLOWED_CATEGORY_SLUGS,
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
  isRemovedCategory,
} from '@/lib/data/categories'
import { stripUnverifiedAccreditationClaims } from '@/lib/services/service-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const expertIdParam = searchParams.get('expertId')
    const slugParam = searchParams.get('slug')
    const viewParam = searchParams.get('view') // 'consultations' | 'services' | 'workshops' | 'webinars' | 'all'
    const categoryParam = searchParams.get('category')
    const subcategoryParam = searchParams.get('subcategory')
    const tagParam = searchParams.get('tag')
    const searchParam = searchParams.get('q')

    // Professional / General Services are outside the MVP
    if (viewParam === 'services') {
      return NextResponse.json({ success: true, data: [] })
    }

    // Reject queries for removed or non-MVP categories
    if (categoryParam && categoryParam !== 'All') {
      if (isRemovedCategory(categoryParam) || !isAllowedMvpCategory(categoryParam)) {
        return NextResponse.json({ success: true, data: [] })
      }
      if (subcategoryParam && !isAllowedMvpSubcategory(categoryParam, subcategoryParam)) {
        return NextResponse.json({ success: true, data: [] })
      }
    }

    const servicesCol = await getServicesCollection()
    const expertsCol = await getExpertsCollection()

    let expertObjId = null

    if (expertIdParam) {
      try {
        expertObjId = toObjectId(expertIdParam)
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid expertId' }, { status: 400 })
      }
    } else if (slugParam) {
      const expert = await expertsCol.findOne({ slug: slugParam })
      if (!expert) {
        return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 })
      }
      expertObjId = expert._id
    }

    const andConditions: any[] = [
      { isActive: true },
      { approvalStatus: 'approved' },
      { serviceKind: { $ne: 'GENERAL_SERVICE' } },
      { categorySlug: { $in: Array.from(ALLOWED_CATEGORY_SLUGS) } },
      {
        $or: [
          { requiresLicensingReview: { $ne: true } },
          { licensingReviewStatus: 'licensing_approved' },
        ],
      },
    ]

    if (expertObjId) {
      andConditions.push({ expertId: expertObjId })
    }

    // Classification filter (view)
    if (viewParam && viewParam !== 'all' && isCatalogView(viewParam)) {
      const classFilter = buildClassificationFilter(viewParam as any)
      andConditions.push(classFilter)
    }

    // Category & Subcategory
    if (categoryParam && categoryParam !== 'All') {
      andConditions.push({ categorySlug: categoryParam })
    }
    if (subcategoryParam) {
      andConditions.push({ subcategorySlug: subcategoryParam })
    }

    // Tags
    if (tagParam) {
      andConditions.push({ tags: tagParam.toLowerCase() })
    }

    // Search query
    if (searchParam?.trim()) {
      const qRegex = new RegExp(searchParam.trim(), 'i')
      andConditions.push({
        $or: [
          { 'title.en': qRegex },
          { 'title.ar': qRegex },
          { 'description.en': qRegex },
          { 'description.ar': qRegex },
          { tags: qRegex },
        ],
      })
    }

    const filter = { $and: andConditions }

    const rawServices = await servicesCol
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray()

    // Strictly verify subcategory membership in allowed MVP taxonomy
    const services = rawServices.filter(
      (s) =>
        isAllowedMvpCategory(s.categorySlug) &&
        isAllowedMvpSubcategory(s.categorySlug, s.subcategorySlug)
    )

    // Enrich with expert info if querying across platform
    const expertIds = [...new Set(services.map((s) => s.expertId.toString()))]
    const expertDocs = await expertsCol
      .find({ _id: { $in: expertIds.map((id) => toObjectId(id)) } })
      .project({ name: 1, slug: 1, image: 1, avatarUrl: 1, role: 1 })
      .toArray()
    const expertMap = new Map(expertDocs.map((e) => [e._id.toString(), e]))

    const formatted = services.map((s) => {
      const exp = expertMap.get(s.expertId.toString())
      const verifiedAccreditation = Boolean(s.hasVerifiedAccreditationAuthorization)
      const safeTitle = verifiedAccreditation
        ? s.title
        : {
          en: stripUnverifiedAccreditationClaims(s.title?.en || ''),
          ar: stripUnverifiedAccreditationClaims(s.title?.ar || ''),
        }
      const safeDescription = verifiedAccreditation
        ? s.description
        : {
          en: stripUnverifiedAccreditationClaims(s.description?.en || ''),
          ar: stripUnverifiedAccreditationClaims(s.description?.ar || ''),
        }

      return {
        ...s,
        title: safeTitle,
        description: safeDescription,
        adultsOnly: true,
        minimumAge: 18,
        _id: s._id.toString(),
        expertId: s.expertId.toString(),
        expertName: exp?.name || '',
        expertSlug: exp?.slug || '',
        expertImage: exp?.image || exp?.avatarUrl || '/experts/layla.png',
        expertRole: exp?.role || '',
      }
    })

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
