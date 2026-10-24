import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getServicesCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Resolves the target expert's ObjectId for the current session.
 * Experts only manage their own services.
 * Admins can pass ?expertId=... to manage any expert's services.
 */
async function resolveExpertObjectId(request: Request) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized: Please log in', status: 401, expertId: null, session: null }
  }

  const { searchParams } = new URL(request.url)
  const queryExpertId = searchParams.get('expertId')

  if (session.role === 'admin') {
    if (queryExpertId) {
      return { error: null, status: 200, expertId: toObjectId(queryExpertId), session }
    }
    // If admin didn't specify expertId, return null to signify all or admin view
    return { error: null, status: 200, expertId: null, session }
  }

  if (session.role === 'expert') {
    if (!session.expertId) {
      return { error: 'Expert profile not found for this account', status: 403, expertId: null, session: null }
    }
    return { error: null, status: 200, expertId: toObjectId(session.expertId), session }
  }

  return { error: 'Access denied: Experts or Admins only', status: 403, expertId: null, session: null }
}

// GET: List services for this expert (or all if admin with no expertId filter)
export async function GET(request: Request) {
  try {
    const auth = await resolveExpertObjectId(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const servicesCol = await getServicesCollection()
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const filter: any = {}
    if (auth.expertId) {
      filter.expertId = auth.expertId // Native BSON ObjectId!
    }
    if (activeOnly) {
      filter.isActive = true
    }

    const items = await servicesCol.find(filter).sort({ sortOrder: 1, createdAt: 1 }).toArray()

    const formatted = items.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      expertId: doc.expertId.toString(),
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

// POST: Create new service
export async function POST(request: Request) {
  try {
    const auth = await resolveExpertObjectId(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    if (!auth.expertId) {
      return NextResponse.json(
        { success: false, error: 'Target expertId is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      categorySlug,
      subcategorySlug,
      tags,
      durationMinutes,
      breakAfterMinutes,
      pricing,
      isActive,
      isMostBooked,
      sortOrder,
    } = body

    if (!title?.en || !title?.ar) {
      return NextResponse.json(
        { success: false, error: 'Title in both English and Arabic is required' },
        { status: 400 }
      )
    }

    const servicesCol = await getServicesCollection()

    // If marked as most booked, unset on this specific expert's other services only!
    if (isMostBooked) {
      await servicesCol.updateMany(
        { expertId: auth.expertId },
        { $set: { isMostBooked: false } }
      )
    }

    const baseCurrency = pricing?.baseCurrency || 'EGP'
    const prices = pricing?.prices || { [baseCurrency]: Number(pricing?.amount) || 500 }

    const approvalStatus = auth.session.role === 'admin' ? 'approved' : 'pending'

    const newService: any = {
      _id: new ObjectId(),
      expertId: auth.expertId, // Native BSON ObjectId!
      title: {
        en: String(title.en).trim(),
        ar: String(title.ar).trim(),
      },
      description: {
        en: String(description?.en || '').trim(),
        ar: String(description?.ar || '').trim(),
      },
      categorySlug: categorySlug || 'marketing-growth',
      subcategorySlug: subcategorySlug || '',
      tags: Array.isArray(tags) ? tags : [],
      durationMinutes: Number(durationMinutes) || 45,
      breakAfterMinutes: Number(breakAfterMinutes) || 10,
      pricing: {
        baseCurrency,
        prices,
      },
      isActive: isActive !== false,
      isMostBooked: Boolean(isMostBooked),
      sortOrder: Number(sortOrder) || 1,
      approvalStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (auth.session.role === 'admin') {
      newService.approvedAt = new Date()
      newService.approvedBy = new ObjectId(auth.session.userId)
    }

    await servicesCol.insertOne(newService)

    return NextResponse.json({
      success: true,
      data: {
        ...newService,
        _id: newService._id.toString(),
        expertId: newService.expertId.toString(),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create service' },
      { status: 500 }
    )
  }
}

// PUT: Update service
export async function PUT(request: Request) {
  try {
    const auth = await resolveExpertObjectId(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const body = await request.json()
    const {
      id,
      title,
      description,
      categorySlug,
      subcategorySlug,
      tags,
      durationMinutes,
      breakAfterMinutes,
      pricing,
      isActive,
      isMostBooked,
      sortOrder,
    } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Service ID is required' }, { status: 400 })
    }

    const serviceObjId = toObjectId(id)
    const servicesCol = await getServicesCollection()

    // Enforce ownership: expert can only update their own service
    const filter: any = { _id: serviceObjId }
    if (auth.session.role !== 'admin' && auth.expertId) {
      filter.expertId = auth.expertId
    }

    const existing = await servicesCol.findOne(filter)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Service not found or unauthorized' }, { status: 404 })
    }

    if (isMostBooked) {
      await servicesCol.updateMany(
        { expertId: existing.expertId, _id: { $ne: serviceObjId } },
        { $set: { isMostBooked: false } }
      )
    }

    const updateDoc: any = {
      updatedAt: new Date(),
    }

    if (title) {
      updateDoc.title = {
        en: String(title.en || '').trim(),
        ar: String(title.ar || '').trim(),
      }
    }
    if (description) {
      updateDoc.description = {
        en: String(description.en || '').trim(),
        ar: String(description.ar || '').trim(),
      }
    }
    if (categorySlug !== undefined) updateDoc.categorySlug = categorySlug
    if (subcategorySlug !== undefined) updateDoc.subcategorySlug = subcategorySlug
    if (tags !== undefined) updateDoc.tags = Array.isArray(tags) ? tags : []
    if (durationMinutes !== undefined) updateDoc.durationMinutes = Number(durationMinutes)
    if (breakAfterMinutes !== undefined) updateDoc.breakAfterMinutes = Number(breakAfterMinutes)
    if (pricing !== undefined) updateDoc.pricing = pricing
    if (isActive !== undefined) updateDoc.isActive = Boolean(isActive)
    if (isMostBooked !== undefined) updateDoc.isMostBooked = Boolean(isMostBooked)
    if (sortOrder !== undefined) updateDoc.sortOrder = Number(sortOrder)

    if (auth.session.role !== 'admin') {
      updateDoc.approvalStatus = 'pending'
      updateDoc.rejectionReason = null
    }

    await servicesCol.updateOne({ _id: serviceObjId }, { $set: updateDoc })

    return NextResponse.json({ success: true, message: 'Service updated successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update service' },
      { status: 500 }
    )
  }
}

// DELETE: Remove service
export async function DELETE(request: Request) {
  try {
    const auth = await resolveExpertObjectId(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Service ID is required' }, { status: 400 })
    }

    const serviceObjId = toObjectId(id)
    const servicesCol = await getServicesCollection()

    const filter: any = { _id: serviceObjId }
    if (auth.session.role !== 'admin' && auth.expertId) {
      filter.expertId = auth.expertId
    }

    const result = await servicesCol.deleteOne(filter)
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Service not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Service deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete service' },
      { status: 500 }
    )
  }
}
