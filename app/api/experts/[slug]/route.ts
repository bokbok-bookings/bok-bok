import { NextResponse } from 'next/server'
import { getExpertsCollection } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

interface RouteProps {
  params: Promise<{ slug: string }> | { slug: string }
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const slug = resolvedParams.slug

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug parameter is required' }, { status: 400 })
    }

    const expertsCol = await getExpertsCollection()
    const expert = await expertsCol.findOne({ slug })

    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 })
    }

    // Access control for non-approved profiles
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expert' },
      { status: 500 }
    )
  }
}
