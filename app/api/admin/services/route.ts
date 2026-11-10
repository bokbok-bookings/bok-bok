import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getServicesCollection, getExpertsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import {
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
  getCategoryLabel,
  getSubcategoryLabel,
} from '@/lib/data/categories'
import {
  detectExcludedService,
  detectStructuredVocationalProgramme,
  detectUnverifiedAccreditationClaim,
} from '@/lib/services/service-validation'

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
    const statusParam = searchParams.get('status') // 'pending' | 'approved' | 'rejected' | 'licensing' | 'all'

    const servicesCol = await getServicesCollection()
    const expertsCol = await getExpertsCollection()

    const filter: any = {}
    if (statusParam === 'licensing') {
      filter.requiresLicensingReview = true
    } else if (statusParam && statusParam !== 'all') {
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
      const catValid = isAllowedMvpCategory(s.categorySlug)
      const subValid = isAllowedMvpSubcategory(s.categorySlug, s.subcategorySlug)
      const combinedText = [
        s.title?.en || '',
        s.title?.ar || '',
        s.description?.en || '',
        s.description?.ar || '',
        ...(s.tags || []),
      ].join(' ')
      const excludedCheck = detectExcludedService(combinedText)
      const vocationalFlagged =
        Boolean(s.isStructuredVocationalProgramme) ||
        Boolean(s.requiresLicensingReview) ||
        detectStructuredVocationalProgramme(combinedText)

      return {
        ...s,
        _id: s._id.toString(),
        expertId: s.expertId.toString(),
        expertName: exp?.name || 'Unknown Expert',
        expertRole: exp?.role || '',
        expertSlug: exp?.slug || '',
        expertImage: exp?.image || '/experts/layla.png',
        categoryLabel: getCategoryLabel(s.categorySlug, 'en'),
        subcategoryLabel: getSubcategoryLabel(s.categorySlug, s.subcategorySlug, 'en'),
        isMvpTaxonomyValid: catValid && subValid && s.serviceKind !== 'GENERAL_SERVICE',
        excludedPolicyViolation: excludedCheck.excluded ? excludedCheck.reason : null,
        requiresLicensingReview: vocationalFlagged,
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
    const { serviceId, action, rejectionReason, adminReviewNote } = body

    if (!serviceId || !action) {
      return NextResponse.json(
        {
          success: false,
          error:
            'serviceId and action (approve | reject | unpublish | approve_licensing | reject_licensing | verify_accreditation) are required',
        },
        { status: 400 }
      )
    }

    const serviceObjId = toObjectId(serviceId)
    const servicesCol = await getServicesCollection()
    const existing = await servicesCol.findOne({ _id: serviceObjId })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }

    const updateDoc: any = {
      updatedAt: new Date(),
    }

    if (action === 'approve') {
      if (existing.serviceKind === 'GENERAL_SERVICE') {
        return NextResponse.json(
          {
            success: false,
            error:
              'Cannot approve Professional / General Services: only Consultations, Workshops, and Webinars are permitted.',
          },
          { status: 400 }
        )
      }

      if (
        !isAllowedMvpCategory(existing.categorySlug) ||
        !isAllowedMvpSubcategory(existing.categorySlug, existing.subcategorySlug)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot approve offer: category "${existing.categorySlug || 'none'}" / subcategory "${existing.subcategorySlug || 'none'}" is outside the approved taxonomy. Reassign to a valid subcategory first.`,
          },
          { status: 400 }
        )
      }

      const combinedText = [
        existing.title?.en || '',
        existing.title?.ar || '',
        existing.description?.en || '',
        existing.description?.ar || '',
        ...(existing.tags || []),
      ].join(' ')

      const excludedCheck = detectExcludedService(combinedText)
      if (excludedCheck.excluded) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot approve offer: ${excludedCheck.reason}`,
          },
          { status: 400 }
        )
      }

      if (
        !existing.hasVerifiedAccreditationAuthorization &&
        detectUnverifiedAccreditationClaim(combinedText)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Cannot approve offer containing "accredited" or "officially recognized" claims without verified supporting authorization.',
          },
          { status: 400 }
        )
      }

      const needsLicensing =
        Boolean(existing.requiresLicensingReview) ||
        Boolean(existing.isStructuredVocationalProgramme) ||
        detectStructuredVocationalProgramme(combinedText)

      if (needsLicensing && existing.licensingReviewStatus !== 'licensing_approved') {
        return NextResponse.json(
          {
            success: false,
            error:
              'This offer is flagged as a structured vocational training programme and requires separate licensing review approval before publication.',
          },
          { status: 400 }
        )
      }

      updateDoc.approvalStatus = 'approved'
      updateDoc.isActive = true
      updateDoc.approvedAt = new Date()
      updateDoc.approvedBy = new ObjectId(auth.session.userId)
      updateDoc.rejectionReason = null
    } else if (action === 'reject') {
      updateDoc.approvalStatus = 'rejected'
      updateDoc.isActive = false
      updateDoc.rejectionReason =
        rejectionReason || 'Offer does not meet Bok Bok quality and compliance requirements.'
    } else if (action === 'unpublish') {
      updateDoc.isActive = false
      updateDoc.approvalStatus = 'pending'
      updateDoc.adminReviewNote =
        adminReviewNote || 'Unpublished for admin scope and category review.'
    } else if (action === 'approve_licensing') {
      updateDoc.requiresLicensingReview = true
      updateDoc.licensingReviewStatus = 'licensing_approved'
      updateDoc.licensingReviewedAt = new Date()
      updateDoc.licensingReviewedBy = new ObjectId(auth.session.userId)
    } else if (action === 'reject_licensing') {
      updateDoc.requiresLicensingReview = true
      updateDoc.licensingReviewStatus = 'licensing_rejected'
      updateDoc.approvalStatus = 'rejected'
      updateDoc.isActive = false
      updateDoc.rejectionReason =
        rejectionReason ||
        'Rejected during separate vocational/licensing review. Calling an offer a consultation, workshop, or webinar does not exempt it from licensing requirements.'
    } else if (action === 'verify_accreditation') {
      updateDoc.hasVerifiedAccreditationAuthorization = Boolean(body.verified)
    } else if (action === 'edit') {
      const { updates } = body
      if (updates && typeof updates === 'object') {
        if (updates.title) updateDoc.title = updates.title
        if (updates.description) updateDoc.description = updates.description
        if (updates.durationMinutes !== undefined) updateDoc.durationMinutes = Number(updates.durationMinutes) || 30
        if (updates.price !== undefined || updates.priceNumber !== undefined) {
          const num = Number(updates.priceNumber ?? updates.price) || 0
          const curr = existing.pricing?.baseCurrency || 'EGP'
          updateDoc.pricing = {
            baseCurrency: curr,
            prices: { [curr]: num },
          }
        }
        if (updates.serviceKind) updateDoc.serviceKind = updates.serviceKind
        if (updates.bookingType) updateDoc.bookingType = updates.bookingType
        if (updates.approvalStatus) updateDoc.approvalStatus = updates.approvalStatus
        if (updates.isActive !== undefined) updateDoc.isActive = Boolean(updates.isActive)
        if (updates.categorySlug) updateDoc.categorySlug = updates.categorySlug
        if (updates.subcategorySlug) updateDoc.subcategorySlug = updates.subcategorySlug
        if (updates.thumbnailUrl !== undefined) updateDoc.thumbnailUrl = updates.thumbnailUrl || null
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    await servicesCol.updateOne({ _id: serviceObjId }, { $set: updateDoc })

    return NextResponse.json({
      success: true,
      message: `Service action "${action}" completed successfully`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update service' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    let serviceId = searchParams.get('serviceId') || searchParams.get('id')
    if (!serviceId) {
      try {
        const body = await request.json()
        serviceId = body.serviceId || body.id
      } catch { }
    }

    if (!serviceId) {
      return NextResponse.json({ success: false, error: 'Service ID is required' }, { status: 400 })
    }

    const serviceObjId = toObjectId(serviceId)
    const servicesCol = await getServicesCollection()

    const res = await servicesCol.deleteOne({ _id: serviceObjId })
    if (res.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete service' },
      { status: 500 }
    )
  }
}
