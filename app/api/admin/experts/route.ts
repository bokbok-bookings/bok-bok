import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized: Admin access required', status: 403, session: null }
  }
  return { error: null, status: 200, session }
}

export async function GET(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')

    const expertsCol = await getExpertsCollection()
    const filter: any = {}
    if (statusParam && statusParam !== 'all') {
      filter.status = statusParam
    }

    const experts = await expertsCol.find(filter).sort({ createdAt: -1 }).toArray()
    const formatted = experts.map((e) => ({
      ...e,
      _id: e._id.toString(),
      id: e._id.toString(),
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch experts' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const body = await request.json()
    const { expertId, action, rejectionReason } = body

    if (!expertId || !action) {
      return NextResponse.json(
        { success: false, error: 'expertId and action are required' },
        { status: 400 }
      )
    }

    const expertObjId = toObjectId(expertId)
    const expertsCol = await getExpertsCollection()

    const updateDoc: any = {
      updatedAt: new Date(),
    }

    if (action === 'approve') {
      updateDoc.status = 'approved'
      updateDoc.approvedAt = new Date()
      updateDoc.approvedBy = new ObjectId(auth.session.userId)
      updateDoc.rejectionReason = null
    } else if (action === 'reject') {
      updateDoc.status = 'rejected'
      updateDoc.rejectionReason = rejectionReason || 'Profile does not meet directory quality standards.'
    } else if (action === 'suspend') {
      updateDoc.status = 'suspended'
    }

    await expertsCol.updateOne({ _id: expertObjId }, { $set: updateDoc })

    return NextResponse.json({
      success: true,
      message: `Expert ${action}d successfully`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update expert' },
      { status: 500 }
    )
  }
}
