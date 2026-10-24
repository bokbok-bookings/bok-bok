import { NextResponse } from 'next/server'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const expertIdParam = searchParams.get('expertId')
    const slugParam = searchParams.get('slug')

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

    const services = await servicesCol
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray()

    const formatted = services.map((s) => ({
      ...s,
      _id: s._id.toString(),
      expertId: s.expertId.toString(),
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
