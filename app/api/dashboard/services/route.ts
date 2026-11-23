import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getServicesCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { validateServiceInput, stripUnverifiedAccreditationClaims } from '@/lib/services/service-validation'
import { slugify } from '@/lib/services/service-types'
import { ensureEventServiceMeetLink } from '@/lib/google-calendar'

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
    // Non-admins cannot self-verify accreditation authorization
    if (auth.session.role !== 'admin') {
      body.hasVerifiedAccreditationAuthorization = false
    }

    const todayISO = new Date().toISOString().slice(0, 10)
    const validation = validateServiceInput(body, { todayISO, existing: null })

    if (!validation.ok || !validation.value) {
      return NextResponse.json(
        { success: false, error: validation.errors.join('; ') },
        { status: 400 }
      )
    }

    const servicesCol = await getServicesCollection()

    // Generate unique slug
    const baseSlug = validation.value.slug || slugify(validation.value.title.en)
    let candidateSlug = baseSlug
    let counter = 2
    while (await servicesCol.findOne({ slug: candidateSlug })) {
      candidateSlug = `${baseSlug}-${counter}`
      counter++
    }

    // If marked as most booked, unset on this specific expert's other services only!
    if (body.isMostBooked) {
      await servicesCol.updateMany(
        { expertId: auth.expertId },
        { $set: { isMostBooked: false } }
      )
    }

    // MVP control: Require admin review before publishing offers.
    // Even if created by an admin, if it requires separate licensing review, hold it in pending.
    const canAutoApprove =
      auth.session.role === 'admin' &&
      body.approveImmediately === true &&
      !validation.value.requiresLicensingReview
    const approvalStatus = canAutoApprove ? 'approved' : 'pending'

    const sanitizedTitle = validation.value.hasVerifiedAccreditationAuthorization
      ? validation.value.title
      : {
        en: stripUnverifiedAccreditationClaims(validation.value.title.en),
        ar: stripUnverifiedAccreditationClaims(validation.value.title.ar),
      }
    const sanitizedDescription = validation.value.hasVerifiedAccreditationAuthorization
      ? validation.value.description
      : {
        en: stripUnverifiedAccreditationClaims(validation.value.description.en),
        ar: stripUnverifiedAccreditationClaims(validation.value.description.ar),
      }

    const newService: any = {
      _id: new ObjectId(),
      expertId: auth.expertId, // Native BSON ObjectId!
      slug: candidateSlug,
      title: sanitizedTitle,
      description: sanitizedDescription,
      whatYouWillGet: validation.value.whatYouWillGet || [],
      intakeQuestions: validation.value.intakeQuestions || [],
      ...(validation.value.thumbnailUrl ? { thumbnailUrl: validation.value.thumbnailUrl } : {}),
      intendedAudience: validation.value.intendedAudience,
      adultsOnly: true,
      minimumAge: 18,
      categorySlug: validation.value.categorySlug,
      subcategorySlug: validation.value.subcategorySlug,
      tags: validation.value.tags,
      bookingType: validation.value.bookingType,
      serviceKind: validation.value.serviceKind,
      deliveryMode: validation.value.deliveryMode,
      location: validation.value.location,
      event: validation.value.event,
      durationMinutes: validation.value.durationMinutes,
      breakAfterMinutes: validation.value.breakAfterMinutes,
      minNoticeHours: validation.value.minNoticeHours !== undefined ? validation.value.minNoticeHours : 24,
      pricing: validation.value.pricing,
      isActive: body.isActive !== false,
      isMostBooked: Boolean(body.isMostBooked),
      sortOrder: Number(body.sortOrder) || 1,
      approvalStatus,
      isStructuredVocationalProgramme: validation.value.isStructuredVocationalProgramme,
      requiresLicensingReview: validation.value.requiresLicensingReview,
      licensingReviewStatus: validation.value.licensingReviewStatus,
      licensingReviewReason: validation.value.licensingReviewReason,
      hasVerifiedAccreditationAuthorization: validation.value.hasVerifiedAccreditationAuthorization,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (canAutoApprove) {
      newService.approvedAt = new Date()
      newService.approvedBy = new ObjectId(auth.session.userId)
    }

    await servicesCol.insertOne(newService)

    // If auto-approved (e.g. created by an admin) and online Webinar/Workshop, create its single shared Google Meet room immediately
    if (
      canAutoApprove &&
      (newService.bookingType === 'WEBINAR' || newService.bookingType === 'WORKSHOP') &&
      newService.deliveryMode !== 'IN_PERSON' &&
      !newService.event?.joinUrl
    ) {
      try {
        const meetRes = await ensureEventServiceMeetLink(newService._id.toString())
        if (meetRes?.joinUrl && newService.event) {
          newService.event.joinUrl = meetRes.joinUrl
          newService.event.googleCalendarEventId = meetRes.googleCalendarEventId
          newService.event.googleCalendarEventLink = meetRes.googleCalendarEventLink
          newService.event.googleMeetSpaceName = meetRes.googleMeetSpaceName
        }
      } catch (calErr: any) {
        console.error('[Dashboard Services] Auto-approve Meet link generation failed:', calErr?.message)
      }
    }

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
    const { id } = body

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

    if (auth.session.role !== 'admin') {
      body.hasVerifiedAccreditationAuthorization = Boolean(existing.hasVerifiedAccreditationAuthorization)
    }

    const todayISO = new Date().toISOString().slice(0, 10)
    const validation = validateServiceInput(body, { todayISO, existing })

    if (!validation.ok || !validation.value) {
      return NextResponse.json(
        { success: false, error: validation.errors.join('; ') },
        { status: 400 }
      )
    }

    if (body.isMostBooked) {
      await servicesCol.updateMany(
        { expertId: existing.expertId, _id: { $ne: serviceObjId } },
        { $set: { isMostBooked: false } }
      )
    }

    const sanitizedTitle = validation.value.hasVerifiedAccreditationAuthorization
      ? validation.value.title
      : {
        en: stripUnverifiedAccreditationClaims(validation.value.title.en),
        ar: stripUnverifiedAccreditationClaims(validation.value.title.ar),
      }
    const sanitizedDescription = validation.value.hasVerifiedAccreditationAuthorization
      ? validation.value.description
      : {
        en: stripUnverifiedAccreditationClaims(validation.value.description.en),
        ar: stripUnverifiedAccreditationClaims(validation.value.description.ar),
      }

    const updateDoc: any = {
      updatedAt: new Date(),
      title: sanitizedTitle,
      description: sanitizedDescription,
      whatYouWillGet: validation.value.whatYouWillGet || [],
      intakeQuestions: validation.value.intakeQuestions || [],
      ...(validation.value.thumbnailUrl ? { thumbnailUrl: validation.value.thumbnailUrl } : {}),
      intendedAudience: validation.value.intendedAudience,
      adultsOnly: true,
      minimumAge: 18,
      categorySlug: validation.value.categorySlug,
      subcategorySlug: validation.value.subcategorySlug,
      tags: validation.value.tags,
      bookingType: validation.value.bookingType,
      deliveryMode: validation.value.deliveryMode,
      durationMinutes: validation.value.durationMinutes,
      breakAfterMinutes: validation.value.breakAfterMinutes,
      minNoticeHours: validation.value.minNoticeHours !== undefined ? validation.value.minNoticeHours : 24,
      pricing: validation.value.pricing,
      isStructuredVocationalProgramme: validation.value.isStructuredVocationalProgramme,
      requiresLicensingReview: validation.value.requiresLicensingReview,
      licensingReviewStatus: validation.value.licensingReviewStatus,
      licensingReviewReason: validation.value.licensingReviewReason,
      hasVerifiedAccreditationAuthorization: validation.value.hasVerifiedAccreditationAuthorization,
    }

    if (validation.value.serviceKind && !validation.unset.includes('serviceKind')) {
      updateDoc.serviceKind = validation.value.serviceKind
    }

    // Ensure slug exists on existing document or handle custom update
    if (!existing.slug) {
      const baseSlug = validation.value.slug || slugify(validation.value.title.en)
      let candidateSlug = baseSlug
      let counter = 2
      while (await servicesCol.findOne({ slug: candidateSlug, _id: { $ne: serviceObjId } })) {
        candidateSlug = `${baseSlug}-${counter}`
        counter++
      }
      updateDoc.slug = candidateSlug
    } else if (validation.value.slug && validation.value.slug !== existing.slug) {
      let candidateSlug = validation.value.slug
      let counter = 2
      while (await servicesCol.findOne({ slug: candidateSlug, _id: { $ne: serviceObjId } })) {
        candidateSlug = `${validation.value.slug}-${counter}`
        counter++
      }
      updateDoc.slug = candidateSlug
    }

    if (validation.value.location) {
      updateDoc.location = validation.value.location
    }
    if (validation.value.event) {
      updateDoc.event = validation.value.event
    }
    if (validation.value.thumbnailUrl) {
      updateDoc.thumbnailUrl = validation.value.thumbnailUrl
    }

    if (body.isActive !== undefined) updateDoc.isActive = Boolean(body.isActive)
    if (body.isMostBooked !== undefined) updateDoc.isMostBooked = Boolean(body.isMostBooked)
    if (body.sortOrder !== undefined) updateDoc.sortOrder = Number(body.sortOrder)

    // Check if core content was changed. Operational changes (like eventStatus or capacity) on already approved services do not reset approval status.
    const isCoreContentChanged =
      JSON.stringify(existing.title) !== JSON.stringify(sanitizedTitle) ||
      JSON.stringify(existing.description) !== JSON.stringify(sanitizedDescription) ||
      existing.categorySlug !== validation.value.categorySlug ||
      existing.subcategorySlug !== validation.value.subcategorySlug ||
      existing.bookingType !== validation.value.bookingType

    if (
      auth.session.role !== 'admin' &&
      isCoreContentChanged
    ) {
      updateDoc.approvalStatus = 'pending'
      updateDoc.rejectionReason = null
    } else if (existing.approvalStatus) {
      updateDoc.approvalStatus = existing.approvalStatus
    }

    const unsets: Record<string, string> = {}
    if (validation.unset.includes('event')) {
      delete updateDoc.event
      unsets.event = ''
    }
    if (validation.unset.includes('serviceKind')) {
      delete updateDoc.serviceKind
      unsets.serviceKind = ''
    }
    if (validation.unset.includes('location')) {
      delete updateDoc.location
      unsets.location = ''
    }
    if (validation.unset.includes('thumbnailUrl')) {
      delete updateDoc.thumbnailUrl
      unsets.thumbnailUrl = ''
    }

    // Guarantee no path is both in $set and $unset to avoid MongoDB path conflict
    for (const unsetKey of Object.keys(unsets)) {
      delete updateDoc[unsetKey]
    }

    const updateOps: any = { $set: updateDoc }
    if (Object.keys(unsets).length > 0) {
      updateOps.$unset = unsets
    }

    await servicesCol.updateOne({ _id: serviceObjId }, updateOps)

    return NextResponse.json({
      success: true,
      message: isCoreContentChanged && auth.session.role !== 'admin'
        ? 'Service updated and submitted for admin review'
        : 'Service updated successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update service' },
      { status: 500 }
    )
  }
}

// PATCH: Direct operational updates (eventStatus, isActive) that update immediately without full resubmission
export async function PATCH(request: Request) {
  try {
    const auth = await resolveExpertObjectId(request)
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const body = await request.json()
    const { id, eventStatus, isActive } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Service ID is required' }, { status: 400 })
    }

    const serviceObjId = toObjectId(id)
    const servicesCol = await getServicesCollection()

    const filter: any = { _id: serviceObjId }
    if (auth.session.role !== 'admin' && auth.expertId) {
      filter.expertId = auth.expertId
    }

    const existing = await servicesCol.findOne(filter)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Service not found or unauthorized' }, { status: 404 })
    }

    const updates: any = { updatedAt: new Date() }

    if (eventStatus !== undefined) {
      if (!['open', 'coming_soon', 'closed'].includes(eventStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid event status' }, { status: 400 })
      }
      updates['event.eventStatus'] = eventStatus
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive)
    }

    await servicesCol.updateOne({ _id: serviceObjId }, { $set: updates })

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully',
      eventStatus: eventStatus ?? existing.event?.eventStatus,
      isActive: isActive ?? existing.isActive,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update status' },
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
