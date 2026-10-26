import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'

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

    if (!serviceDoc) {
      return NextResponse.json({ success: false, error: 'Service not found or inactive' }, { status: 404 })
    }

    const expert = await expertsCol.findOne({ _id: serviceDoc.expertId })

    const formatted = {
      ...serviceDoc,
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
            rating: expert.rating || '5.0',
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
