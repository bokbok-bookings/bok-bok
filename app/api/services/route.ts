import { NextResponse } from 'next/server'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'

export const dynamic = 'force-dynamic'

import { buildClassificationFilter, isCatalogView } from '@/lib/services/service-types'

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

    const filter: any = {
      isActive: true,
      $or: [
        { approvalStatus: 'approved' },
        { approvalStatus: { $exists: false } },
      ],
    }

    if (expertObjId) {
      filter.expertId = expertObjId // Native BSON ObjectId!
    }

    // Classification filter (view)
    if (viewParam && viewParam !== 'all' && isCatalogView(viewParam)) {
      const classFilter = buildClassificationFilter(viewParam as any)
      Object.assign(filter, classFilter)
    }

    // Category & Subcategory
    if (categoryParam && categoryParam !== 'All') {
      filter.categorySlug = categoryParam
    }
    if (subcategoryParam) {
      filter.subcategorySlug = subcategoryParam
    }

    // Tags
    if (tagParam) {
      filter.tags = tagParam.toLowerCase()
    }

    // Search query
    if (searchParam?.trim()) {
      const qRegex = new RegExp(searchParam.trim(), 'i')
      filter.$or = [
        { 'title.en': qRegex },
        { 'title.ar': qRegex },
        { 'description.en': qRegex },
        { 'description.ar': qRegex },
        { tags: qRegex },
      ]
    }

    const services = await servicesCol
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray()

    // Enrich with expert info if querying across platform
    const expertIds = [...new Set(services.map((s) => s.expertId.toString()))]
    const expertDocs = await expertsCol
      .find({ _id: { $in: expertIds.map((id) => toObjectId(id)) } })
      .project({ name: 1, slug: 1, image: 1, avatarUrl: 1, role: 1 })
      .toArray()
    const expertMap = new Map(expertDocs.map((e) => [e._id.toString(), e]))

    const formatted = services.map((s) => {
      const exp = expertMap.get(s.expertId.toString())
      return {
        ...s,
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
