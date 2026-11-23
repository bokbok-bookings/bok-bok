import { NextResponse } from 'next/server'
import {
  getExpertsCollection,
  getBookingsCollection,
  getServicesCollection,
  getReviewsCollection,
} from '@/lib/db'
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

    // Compute completed/made sessions, workshops, webinars, and live review aggregates
    const now = new Date()
    const todayCairoISO = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const [bookingsCol, servicesCol, reviewsCol] = await Promise.all([
      getBookingsCollection(),
      getServicesCollection(),
      getReviewsCollection(),
    ])

    const completedOrPastConfirmedFilter = {
      expertId: expert._id,
      $or: [
        { attendanceStatus: 'completed' as const },
        {
          status: 'confirmed' as const,
          attendanceStatus: { $nin: ['expert_absent', 'both_absent', 'cancelled'] as any[] },
          $or: [
            { sessionEndAt: { $lt: now } },
            { sessionEndAt: { $exists: false }, date: { $lt: todayCairoISO } },
          ],
        },
      ],
    }

    const [
      completedConsultationBookings,
      completedEventBookings,
      pastHeldEventServices,
      expertReviewsAgg,
    ] = await Promise.all([
      bookingsCol.countDocuments({
        ...completedOrPastConfirmedFilter,
        bookingType: { $nin: ['WORKSHOP', 'WEBINAR'] as any[] },
      }),
      bookingsCol
        .find({
          ...completedOrPastConfirmedFilter,
          bookingType: { $in: ['WORKSHOP', 'WEBINAR'] as any[] },
        })
        .project({ _id: 1, serviceId: 1, bookingType: 1 })
        .toArray(),
      servicesCol
        .find({
          expertId: expert._id,
          approvalStatus: 'approved',
          bookingType: { $in: ['WORKSHOP', 'WEBINAR'] },
          'event.date': { $lt: todayCairoISO },
          'event.registeredCount': { $gt: 0 },
        })
        .project({ _id: 1, bookingType: 1 })
        .toArray(),
      reviewsCol
        .aggregate([
          { $match: { expertId: expert._id } },
          {
            $group: {
              _id: '$expertId',
              avgRating: { $avg: { $ifNull: ['$expertRating', 5] } },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ])

    const workshopIds = new Set<string>()
    const webinarIds = new Set<string>()

    for (const b of completedEventBookings) {
      const key = b.serviceId ? b.serviceId.toString() : `booking_${b._id.toString()}`
      if (b.bookingType === 'WORKSHOP') workshopIds.add(key)
      if (b.bookingType === 'WEBINAR') webinarIds.add(key)
    }

    for (const s of pastHeldEventServices) {
      const key = s._id.toString()
      if (s.bookingType === 'WORKSHOP') workshopIds.add(key)
      if (s.bookingType === 'WEBINAR') webinarIds.add(key)
    }

    const completedSessionsCount = Math.max(
      completedConsultationBookings,
      Number((expert as any).completedSessionsCount || 0)
    )
    const completedWorkshopsCount = Math.max(
      workshopIds.size,
      Number((expert as any).completedWorkshopsCount || 0)
    )
    const completedWebinarsCount = Math.max(
      webinarIds.size,
      Number((expert as any).completedWebinarsCount || 0)
    )

    const liveReviewStat = expertReviewsAgg[0]
    const liveReviewsCount = liveReviewStat
      ? Number(liveReviewStat.count || 0)
      : Number(expert.reviews || 0)
    const liveRating =
      liveReviewStat && liveReviewsCount > 0
        ? Number(liveReviewStat.avgRating || 0).toFixed(1)
        : expert.rating

    // Strip admin-only fields before returning to public/client callers
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
    } = expert as any

    return NextResponse.json({
      success: true,
      data: {
        ...publicExpert,
        _id: expert._id.toString(),
        id: expert._id.toString(),
        rating: liveRating,
        reviews: liveReviewsCount,
        completedSessionsCount,
        completedWorkshopsCount,
        completedWebinarsCount,
        activityStats: {
          sessions: completedSessionsCount,
          workshops: completedWorkshopsCount,
          webinars: completedWebinarsCount,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expert' },
      { status: 500 }
    )
  }
}
