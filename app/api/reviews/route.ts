import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import {
  getBookingsCollection,
  getExpertsCollection,
  getServicesCollection,
  getReviewsCollection,
  getComplaintsCollection,
  toObjectId,
} from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { resolveTokenRole } from '@/lib/booking/access'
import { evaluateReviewEligibility } from '@/lib/booking/review-eligibility'
import { computeSessionBounds, getPlatformMeetingSettings } from '@/lib/email/scheduler'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const expertId = searchParams.get('expertId')
    const serviceId = searchParams.get('serviceId')
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const skip = (page - 1) * limit

    if (!expertId && !serviceId) {
      return NextResponse.json(
        { success: false, error: 'expertId or serviceId query parameter is required' },
        { status: 400 }
      )
    }

    const reviewsCol = await getReviewsCollection()
    const query: any = {}
    if (expertId) {
      try {
        query.expertId = toObjectId(expertId)
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid expertId' }, { status: 400 })
      }
    }
    if (serviceId) {
      try {
        query.serviceId = toObjectId(serviceId)
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid serviceId' }, { status: 400 })
      }
    }

    const [reviews, total] = await Promise.all([
      reviewsCol
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          clientEmail: 0,
          platformFeedback: 0,
        })
        .toArray(),
      reviewsCol.countDocuments(query),
    ])

    // Enrich reviews with service title & booking type when serviceId is present
    const serviceIds = [
      ...new Set(
        reviews
          .map((r) => (r.serviceId ? r.serviceId.toString() : ''))
          .filter((id) => ObjectId.isValid(id))
      ),
    ]
    const serviceMap = new Map<string, { title?: { en: string; ar: string }; slug?: string; bookingType?: string }>()
    if (serviceIds.length > 0) {
      const servicesCol = await getServicesCollection()
      const serviceDocs = await servicesCol
        .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
        .project({ title: 1, slug: 1, bookingType: 1 })
        .toArray()
      for (const s of serviceDocs) {
        serviceMap.set(s._id.toString(), {
          title: s.title,
          slug: s.slug,
          bookingType: s.bookingType,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: reviews.map((r) => {
        const srv = r.serviceId ? serviceMap.get(r.serviceId.toString()) : undefined
        return {
          ...r,
          _id: r._id.toString(),
          bookingId: r.bookingId?.toString(),
          expertId: r.expertId?.toString(),
          serviceId: r.serviceId?.toString(),
          clientId: r.clientId?.toString(),
          ...(srv?.title ? { serviceTitle: srv.title } : {}),
          ...(srv?.slug ? { serviceSlug: srv.slug } : {}),
          ...(srv?.bookingType ? { bookingType: srv.bookingType } : {}),
        }
      }),
      pagination: {
        page,
        limit,
        limitPerPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()

    const body = await request.json()
    const {
      bookingId,
      token,
      expertRating,
      expertReviewText,
      serviceRating,
      serviceReviewText,
      platformFeedback,
    } = body

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 })
    }

    const expRatingNum = Number(expertRating)
    const srvRatingNum = Number(serviceRating)

    if (!Number.isInteger(expRatingNum) || expRatingNum < 1 || expRatingNum > 5) {
      return NextResponse.json(
        { success: false, error: 'Expert rating must be an integer between 1 and 5' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(srvRatingNum) || srvRatingNum < 1 || srvRatingNum > 5) {
      return NextResponse.json(
        { success: false, error: 'Service rating must be an integer between 1 and 5' },
        { status: 400 }
      )
    }

    const sanitizedExpertText = typeof expertReviewText === 'string' ? expertReviewText.trim().slice(0, 2000) : ''
    const sanitizedServiceText = typeof serviceReviewText === 'string' ? serviceReviewText.trim().slice(0, 2000) : ''
    const sanitizedPlatformFeedback = typeof platformFeedback === 'string' ? platformFeedback.trim().slice(0, 2000) : ''

    const bookingObjId = toObjectId(bookingId)
    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Verify ownership: either logged-in client matches booking OR valid client access token from booking email link
    const isClientTokenValid = resolveTokenRole(booking, token) === 'client'
    const userMatchesId = Boolean(
      session?.userId && booking.clientId && booking.clientId.toString() === session.userId
    )
    const userMatchesEmail = Boolean(
      session?.email &&
      booking.clientEmail &&
      booking.clientEmail.toLowerCase() === session.email.toLowerCase()
    )

    if (!session?.userId && !isClientTokenValid) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 })
    }

    if (!userMatchesId && !userMatchesEmail && !isClientTokenValid) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to review this booking' },
        { status: 403 }
      )
    }

    const [reviewsCol, complaintsCol, platformSettings] = await Promise.all([
      getReviewsCollection(),
      getComplaintsCollection(),
      getPlatformMeetingSettings(),
    ])
    const [existingReview, existingComplaint] = await Promise.all([
      reviewsCol.findOne({ bookingId: bookingObjId }),
      complaintsCol.findOne({ bookingId: bookingObjId }),
    ])

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'A review has already been submitted for this booking' },
        { status: 400 }
      )
    }

    // Enforce post-session review window: opens only after refund/problem period ends and nothing is on hold
    let sessionEndAt = booking.sessionEndAt
    if (!sessionEndAt && booking.date && booking.time) {
      const bounds = computeSessionBounds(
        booking.date,
        booking.time,
        booking.durationMinutes || 45,
        booking.timezone || 'Africa/Cairo'
      )
      sessionEndAt = bounds.sessionEndAt
    }

    const eligibility = evaluateReviewEligibility({
      booking,
      sessionEndAt,
      complaint: existingComplaint,
      hasExistingReview: false,
      reportingWindowHours: platformSettings.attendanceReportingWindowHours || 24,
      now: new Date(),
    })

    if (!eligibility.isOpen) {
      const errorMsg =
        eligibility.reason === 'on_hold'
          ? 'Review is currently paused while an open issue, refund request, or attendance dispute is on hold.'
          : eligibility.reason === 'waiting_period'
            ? `The review window opens after the ${eligibility.reportingWindowHours}-hour post-session issue/refund reporting period ends.`
            : eligibility.reason === 'session_not_ended'
              ? 'You can submit a review after the session has concluded and the reporting period has ended.'
              : 'This booking is not eligible for review.'
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 })
    }

    const now = new Date()
    const reviewDoc = {
      bookingId: bookingObjId,
      clientId: session?.userId ? new ObjectId(session.userId) : booking.clientId || new ObjectId(),
      clientName: session?.displayName || booking.clientName || 'Client',
      clientEmail: (session?.email || booking.clientEmail).toLowerCase(),
      expertId: booking.expertId,
      serviceId: booking.serviceId,
      expertRating: expRatingNum,
      expertReviewText: sanitizedExpertText,
      serviceRating: srvRatingNum,
      serviceReviewText: sanitizedServiceText,
      ...(sanitizedPlatformFeedback ? { platformFeedback: sanitizedPlatformFeedback } : {}),
      createdAt: now,
      updatedAt: now,
    }

    const insertResult = await reviewsCol.insertOne(reviewDoc as any)

    // Update booking with review reference
    await bookingsCol.updateOne(
      { _id: bookingObjId },
      { $set: { hasReview: true, reviewId: insertResult.insertedId, updatedAt: now } }
    )

    // Recalculate Expert Rating and Reviews Count
    try {
      const expertReviews = await reviewsCol.find({ expertId: booking.expertId }).toArray()
      if (expertReviews.length > 0) {
        const totalExpRating = expertReviews.reduce((sum, r) => sum + (r.expertRating || 5), 0)
        const avgExpRating = (totalExpRating / expertReviews.length).toFixed(1)
        const expertsCol = await getExpertsCollection()
        await expertsCol.updateOne(
          { _id: booking.expertId },
          {
            $set: {
              rating: avgExpRating,
              reviews: expertReviews.length,
              updatedAt: now,
            },
          }
        )
      }
    } catch (expErr) {
      console.warn('Failed to update expert rating aggregate:', expErr)
    }

    // Recalculate Service Rating if serviceId exists
    if (booking.serviceId) {
      try {
        const serviceReviews = await reviewsCol.find({ serviceId: booking.serviceId }).toArray()
        if (serviceReviews.length > 0) {
          const totalSrvRating = serviceReviews.reduce((sum, r) => sum + (r.serviceRating || 5), 0)
          const avgSrvRating = Number((totalSrvRating / serviceReviews.length).toFixed(1))
          const servicesCol = await getServicesCollection()
          await servicesCol.updateOne(
            { _id: booking.serviceId },
            {
              $set: {
                rating: avgSrvRating,
                reviewsCount: serviceReviews.length,
                updatedAt: now,
              },
            }
          )
        }
      } catch (srvErr) {
        console.warn('Failed to update service rating aggregate:', srvErr)
      }
    }

    return NextResponse.json({
      success: true,
      reviewId: insertResult.insertedId.toString(),
      message: 'Review submitted successfully',
    })
  } catch (error: any) {
    console.error('Failed to submit review:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

