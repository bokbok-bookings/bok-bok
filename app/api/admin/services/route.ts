import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'
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
    const statusParam = searchParams.get('status') // 'pending' | 'approved' | 'rejected' | 'all'

    const servicesCol = await getServicesCollection()
    const expertsCol = await getExpertsCollection()

    const filter: any = {}
    if (statusParam && statusParam !== 'all') {
      filter.approvalStatus = statusParam
    }

    const services = await servicesCol.find(filter).sort({ createdAt: -1 }).toArray()

    // Enrich with expert names and roles
    const expertIds = [...new Set(services.map((s) => s.expertId.toString()))]
    const expertObjectIds = expertIds.map((id) => toObjectId(id))
    const experts = await expertsCol
      .find({ _id: { $in: expertObjectIds } })
      .project({ name: 1, role: 1, slug: 1, image: 1 })
      .toArray()

    const expertMap = new Map(experts.map((e) => [e._id.toString(), e]))

    const enriched = services.map((s) => {
      const exp = expertMap.get(s.expertId.toString())
      return {
        ...s,
        _id: s._id.toString(),
        expertId: s.expertId.toString(),
        expertName: exp?.name || 'Unknown Expert',
        expertRole: exp?.role || '',
        expertSlug: exp?.slug || '',
        expertImage: exp?.image || '/experts/layla.png',
      }
    })

    return NextResponse.json({ success: true, data: enriched })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch services' },
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
    const { serviceId, action, rejectionReason } = body

    if (!serviceId || !action) {
      return NextResponse.json(
        { success: false, error: 'serviceId and action (approve | reject) are required' },
        { status: 400 }
      )
    }

    const serviceObjId = toObjectId(serviceId)
    const servicesCol = await getServicesCollection()

    const updateDoc: any = {
      updatedAt: new Date(),
    }

    if (action === 'approve') {
      updateDoc.approvalStatus = 'approved'
      updateDoc.approvedAt = new Date()
      updateDoc.approvedBy = new ObjectId(auth.session.userId)
      updateDoc.rejectionReason = null
    } else if (action === 'reject') {
      updateDoc.approvalStatus = 'rejected'
      updateDoc.rejectionReason = rejectionReason || 'Service details do not meet directory standards.'
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    await servicesCol.updateOne({ _id: serviceObjId }, { $set: updateDoc })

    return NextResponse.json({
      success: true,
      message: `Service ${action}d successfully`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update service' },
      { status: 500 }
    )
  }
}
