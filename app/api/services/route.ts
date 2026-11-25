import { NextResponse } from 'next/server'
import { getServicesCollection, getExpertsCollection, getReviewsCollection, toObjectId } from '@/lib/db'
import { buildClassificationFilter, isCatalogView } from '@/lib/services/service-types'
import {
  ALLOWED_CATEGORY_SLUGS,
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
  isRemovedCategory,
} from '@/lib/data/categories'
import { stripUnverifiedAccreditationClaims } from '@/lib/services/service-validation'
import { getServerGeo } from '@/lib/geo/server'
import {
  isServiceAvailableInMarket,
  getServicePriceForMarket,
  getServiceMarkets,
} from '@/lib/geo/markets'

export const dynamic = 'force-dynamic'

function sanitizePublicEvent(event: any) {
  if (!event || typeof event !== 'object') return undefined
  const { joinUrl, recordingUrl, materials, ...safeEvent } = event
  return {
    ...safeEvent,
    hasRecording: Boolean(recordingUrl),
    materialsCount: Array.isArray(materials) ? materials.length : 0,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const expertIdParam = searchParams.get('expertId')
    const slugParam = searchParams.get('slug')
    const viewParam = searchParams.get('view') || searchParams.get('type') // 'consultations' | 'services' | 'workshops' | 'webinars' | 'all'
    const categoryParam = searchParams.get('category')
    const subcategoryParam = searchParams.get('subcategory')
    const tagParam = searchParams.get('tag')
    const searchParam = searchParams.get('q')
    const includePast = searchParams.get('includePast') === 'true'
    const allMarketsParam = searchParams.get('allMarkets') === 'true'

    const geo = await getServerGeo(request)
    const visitorMarket = geo.market

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

    // Strictly verify subcategory membership in allowed MVP taxonomy & optionally hide past events
    const todayCairoISO = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    const isEventListing = viewParam === 'workshops' || viewParam === 'webinars'

    const services = rawServices.filter((s) => {
      if (
        !isAllowedMvpCategory(s.categorySlug) ||
        !isAllowedMvpSubcategory(s.categorySlug, s.subcategorySlug)
      ) {
        return false
      }
      if (!includePast && (s.bookingType === 'WORKSHOP' || s.bookingType === 'WEBINAR')) {
        if (s.event?.eventStatus === 'coming_soon') return true
        if (s.event?.date && s.event.date < todayCairoISO) return false
      }
      if (!allMarketsParam && !isServiceAvailableInMarket(s, visitorMarket)) {
        return false
      }
      return true
    })

    if (isEventListing) {
      services.sort((a, b) => (a.event?.date || '9999-99-99').localeCompare(b.event?.date || '9999-99-99'))
    }

    // Enrich with expert info and live service review ratings
    const expertIds = [...new Set(services.map((s) => s.expertId.toString()))]
    const serviceObjIds = services.map((s) => s._id)
    const reviewsCol = await getReviewsCollection()
    const [expertDocs, reviewStats] = await Promise.all([
      expertsCol
        .find({ _id: { $in: expertIds.map((id) => toObjectId(id)) } })
        .project({ name: 1, slug: 1, image: 1, avatarUrl: 1, role: 1 })
        .toArray(),
      serviceObjIds.length > 0
        ? reviewsCol
            .aggregate([
              { $match: { serviceId: { $in: serviceObjIds } } },
              {
                $group: {
                  _id: '$serviceId',
                  avgRating: { $avg: { $ifNull: ['$serviceRating', '$expertRating'] } },
                  count: { $sum: 1 },
                },
              },
            ])
            .toArray()
        : Promise.resolve([]),
    ])
    const expertMap = new Map(expertDocs.map((e) => [e._id.toString(), e]))
    const reviewStatsMap = new Map(
      reviewStats.map((r: any) => [
        r._id.toString(),
        {
          rating: Number(Number(r.avgRating || 0).toFixed(1)),
          reviewsCount: Number(r.count || 0),
        },
      ])
    )

    const formatted = services.map((s) => {
      const exp = expertMap.get(s.expertId.toString())
      const revStat = reviewStatsMap.get(s._id.toString())
      const rating = revStat ? revStat.rating : Number(s.rating || 0)
      const reviewsCount = revStat ? revStat.reviewsCount : Number(s.reviewsCount || 0)
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

      const resolvedPrice = getServicePriceForMarket(s, visitorMarket)

      return {
        ...s,
        availableMarkets: getServiceMarkets(s),
        resolvedPrice,
        ...(s.event ? { event: sanitizePublicEvent(s.event) } : {}),
        title: safeTitle,
        description: safeDescription,
        rating,
        reviewsCount,
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

    let meta:
      | {
        totalCount: number
        pendingCount: number
        hasServices: boolean
        hasPending: boolean
      }
      | undefined = undefined

    if (expertObjId) {
      const [totalCount, pendingCount] = await Promise.all([
        servicesCol.countDocuments({ expertId: expertObjId }),
        servicesCol.countDocuments({
          expertId: expertObjId,
          $or: [
            { approvalStatus: 'pending' },
            { licensingReviewStatus: 'pending_licensing_review' },
          ],
        }),
      ])
      meta = {
        totalCount,
        pendingCount,
        hasServices: totalCount > 0,
        hasPending: pendingCount > 0,
      }
    }

    return NextResponse.json({
      success: true,
      data: formatted,
      visitorMarket: geo.market,
      visitorCountry: geo.country,
      currency: geo.marketInfo.currency,
      ...(meta ? { meta } : {}),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
