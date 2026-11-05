import { NextResponse } from 'next/server'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { isAllowedMvpCategory, isRemovedCategory } from '@/lib/data/categories'

export const dynamic = 'force-dynamic'

function sanitizePublicExpert(expert: any) {
  const {
    phone: _phone,
    whatsapp: _whatsapp,
    socialLinks: _socialLinks,
    nationalIdFrontUrl: _idFront,
    nationalIdBackUrl: _idBack,
    commercialRegisterUrl: _commRegUrl,
    taxIdDocumentUrl: _taxDocUrl,
    commercialRegisterNumber: _commRegNum,
    taxNumber: _taxNum,
    bankAccount: _bankAccount,
    instapayUsername: _instapay,
    preferredPayoutMethod: _payoutMethod,
    suggestedCategory: _suggestedCategory,
    pendingInfoUpdate: _pendingInfoUpdate,
    hasPendingInfoUpdate: _hasPendingInfoUpdate,
    pendingInfoSubmittedAt: _pendingInfoSubmittedAt,
    pendingInfoRejectionReason: _pendingInfoRejectionReason,
    ...publicExpert
  } = expert
  return {
    ...publicExpert,
    _id: expert._id.toString(),
    id: expert._id.toString(),
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const q = searchParams.get('q')

    // Reject removed or unapproved category filter queries
    if (category && category !== 'All' && category !== 'All experts') {
      if (isRemovedCategory(category) || !isAllowedMvpCategory(category)) {
        return NextResponse.json({ success: true, data: [] })
      }
    }

    const expertsCol = await getExpertsCollection()

    // 1. Fetch single expert by slug or ID
    if (slug || id) {
      const query: any = {}
      if (slug) query.slug = slug
      if (id) {
        try {
          query._id = toObjectId(id)
        } catch {
          return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
        }
      }

      const expert = await expertsCol.findOne(query)
      if (!expert) {
        return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 })
      }

      // Check access if not approved
      if (expert.status && expert.status !== 'approved') {
        const session = await getSession()
        const isOwner = session && session.expertId === expert._id.toString()
        const isAdmin = session && session.role === 'admin'
        if (!isOwner && !isAdmin) {
          return NextResponse.json(
            { success: false, error: 'Expert profile is currently under review' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        data: sanitizePublicExpert(expert),
      })
    }

    // 2. Fetch list of approved experts
    const filter: any = {
      $or: [
        { status: 'approved' },
        { status: { $exists: false } }, // Legacy seeded
      ],
    }

    if (category && category !== 'All' && category !== 'All experts') {
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { categorySlug: category },
          { categorySlugs: category },
          { 'categories.categorySlug': category },
          { tags: category },
        ],
      })
    }

    if (tag) {
      filter.tags = tag
    }

    if (q) {
      const regex = new RegExp(q.trim(), 'i')
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { name: regex },
          { role: regex },
          { location: regex },
          { tags: regex },
          { about: regex },
          { bio: regex },
        ],
      })
    }

    const docs = await expertsCol
      .find(filter)
      .sort({ rating: -1, reviews: -1, createdAt: -1 })
      .toArray()

    const formatted = docs
      .filter((e) => !e.categorySlug || !isRemovedCategory(e.categorySlug))
      .map((e) => sanitizePublicExpert(e))

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch experts' },
      { status: 500 }
    )
  }
}
