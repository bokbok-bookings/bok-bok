import { NextResponse } from 'next/server'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const q = searchParams.get('q')

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
        data: {
          ...expert,
          _id: expert._id.toString(),
          id: expert._id.toString(),
        },
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

    const formatted = docs.map((e) => ({
      ...e,
      _id: e._id.toString(),
      id: e._id.toString(),
    }))

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
