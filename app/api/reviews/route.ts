import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import {
  getBookingsCollection,
  getExpertsCollection,
  getServicesCollection,
  getReviewsCollection,
  toObjectId,
} from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please log in' }, { status: 401 })
    }

    const body = await request.json()
    const {
      bookingId,
      expertRating,
      expertReviewText,
      serviceRating,
      serviceReviewText,
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

    const bookingObjId = toObjectId(bookingId)
    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Verify ownership: either booking.clientId matches session.userId, or booking.clientEmail matches session.email
    const userMatchesId = booking.clientId && booking.clientId.toString() === session.userId
    const userMatchesEmail =
      booking.clientEmail &&
      session.email &&
      booking.clientEmail.toLowerCase() === session.email.toLowerCase()

    if (!userMatchesId && !userMatchesEmail) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to review this booking' },
        { status: 403 }
      )
    }

    const reviewsCol = await getReviewsCollection()
    const existingReview = await reviewsCol.findOne({ bookingId: bookingObjId })
    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'A review has already been submitted for this booking' },
        { status: 400 }
      )
    }

    const now = new Date()
    const reviewDoc = {
      bookingId: bookingObjId,
      clientId: new ObjectId(session.userId),
      clientName: session.displayName || booking.clientName || 'Client',
      clientEmail: (session.email || booking.clientEmail).toLowerCase(),
      expertId: booking.expertId,
      serviceId: booking.serviceId,
      expertRating: expRatingNum,
      expertReviewText: sanitizedExpertText,
      serviceRating: srvRatingNum,
      serviceReviewText: sanitizedServiceText,
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

