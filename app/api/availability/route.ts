import crypto from 'crypto'
import { NextResponse } from 'next/server'
import {
  getExpertUpcomingDays,
  getExpertSlotsForDate,
  createExpertBooking,
  getCanonicalExpertId,
  getCanonicalExpertObjectId,
} from '@/lib/availability-server'
import { toObjectId, getServicesCollection, getExpertsCollection } from '@/lib/db'
import { isAllowedMvpCategory, isAllowedMvpSubcategory } from '@/lib/data/categories'
import { computeSessionBounds, getAppBaseUrl, resolveExpertContact } from '@/lib/email/scheduler'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import { renderBookingReceivedEmail } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'days'
    const rawExpertId =
      searchParams.get('expertId') ||
      searchParams.get('expertSlug') ||
      '6708a0000000000000000001'
    const expertId = await getCanonicalExpertId(rawExpertId)
    const duration = parseInt(searchParams.get('duration') || '30', 10)
    const breakAfter = parseInt(searchParams.get('breakAfter') || '0', 10)
    const serviceId = searchParams.get('serviceId')

    let minNoticeHours = 0
    if (searchParams.has('minNoticeHours')) {
      minNoticeHours = parseInt(searchParams.get('minNoticeHours') || '24', 10)
    } else if (serviceId && serviceId !== 'default') {
      try {
        const servicesCol = await getServicesCollection()
        const sDoc = await servicesCol.findOne({ _id: toObjectId(serviceId) })
        if (sDoc && sDoc.minNoticeHours !== undefined) {
          minNoticeHours = Number(sDoc.minNoticeHours)
        } else if (sDoc) {
          minNoticeHours = 24 // default: day before
        }
      } catch (err) {
        // fallback
      }
    }

    if (action === 'days') {
      const count = parseInt(searchParams.get('count') || '90', 10)
      const days = await getExpertUpcomingDays(expertId, count, duration, minNoticeHours)
      return NextResponse.json({ success: true, expertId, days, minNoticeHours })
    }

    if (action === 'slots') {
      const date = searchParams.get('date')
      if (!date) {
        return NextResponse.json(
          { success: false, error: 'Date parameter is required' },
          { status: 400 },
        )
      }
      const slots = await getExpertSlotsForDate(expertId, date, duration, breakAfter, minNoticeHours)
      return NextResponse.json({ success: true, expertId, date, slots, minNoticeHours })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Availability API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch availability' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawExpertId = body.expertId || body.expertSlug
    const {
      date,
      time,
      clientName,
      clientEmail,
      clientPhone,
      expertSlug,
      serviceId,
      paymentReceiptUrl,
      paymentReceiptPublicId,
      intakeAnswers,
    } = body

    if (!rawExpertId || !clientName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'expertId and clientName are required' },
        { status: 400 },
      )
    }

    const expertId = await getCanonicalExpertId(rawExpertId)
    const expertObjId = await getCanonicalExpertObjectId(rawExpertId)

    // Backend verification of Service & Price/Duration
    const servicesCol = await getServicesCollection()
    const expertsCol = await getExpertsCollection()
    const expertDoc = await expertsCol.findOne({ _id: expertObjId })

    let verifiedDuration = 45
    let verifiedBreak = 0
    let verifiedAmount = 500
    let verifiedCurrency = 'EGP'
    let verifiedServiceTitle = body.serviceTitle
    let serviceDoc = null

    if (serviceId && serviceId !== 'default') {
      try {
        serviceDoc = await servicesCol.findOne({
          _id: toObjectId(serviceId),
          expertId: expertObjId,
        })
      } catch {
        // ignore invalid objectId
      }

      if (!serviceDoc) {
        return NextResponse.json(
          { success: false, error: 'Requested offer was not found.' },
          { status: 404 },
        )
      }

      // Prevent new bookings on unpublished, unapproved, General Service, or removed-category offers
      const isValidMvpOffer =
        serviceDoc.isActive === true &&
        serviceDoc.approvalStatus === 'approved' &&
        serviceDoc.serviceKind !== 'GENERAL_SERVICE' &&
        isAllowedMvpCategory(serviceDoc.categorySlug) &&
        isAllowedMvpSubcategory(serviceDoc.categorySlug, serviceDoc.subcategorySlug) &&
        !(
          serviceDoc.requiresLicensingReview &&
          serviceDoc.licensingReviewStatus !== 'licensing_approved'
        )

      if (!isValidMvpOffer) {
        return NextResponse.json(
          {
            success: false,
            error:
              'This offer is inactive, outside the approved taxonomy, or pending admin/licensing review and cannot accept new bookings.',
          },
          { status: 400 },
        )
      }

      verifiedDuration = serviceDoc.durationMinutes || 45
      verifiedBreak = serviceDoc.breakAfterMinutes || 0
      verifiedServiceTitle = serviceDoc.title
      verifiedCurrency = serviceDoc.pricing?.baseCurrency || 'EGP'
      verifiedAmount =
        serviceDoc.pricing?.prices?.[verifiedCurrency] ??
        serviceDoc.pricing?.prices?.EGP ??
        500

      // If it's a WORKSHOP or WEBINAR, event registration logic applies
      if (serviceDoc.bookingType === 'WORKSHOP' || serviceDoc.bookingType === 'WEBINAR') {
        const eventDate = serviceDoc.event?.date
        const eventTime = serviceDoc.event?.startTime || '18:00'
        const capacity = serviceDoc.event?.capacity || 20
        const registered = serviceDoc.event?.registeredCount || 0

        if (registered >= capacity) {
          return NextResponse.json(
            { success: false, error: 'This event has reached full capacity.' },
            { status: 400 },
          )
        }

        // Atomically increment registeredCount
        await servicesCol.updateOne(
          {
            _id: serviceDoc._id,
            $or: [
              { 'event.registeredCount': { $lt: capacity } },
              { 'event.registeredCount': { $exists: false } },
            ],
          },
          { $inc: { 'event.registeredCount': 1 } },
        )

        const reference = `EV-${Math.floor(1000 + Math.random() * 9000)}`
        const finalDate = eventDate || date
        const finalTime = eventTime
        const finalDuration = serviceDoc.durationMinutes || 60
        const bounds = computeSessionBounds(finalDate, finalTime, finalDuration, 'Africa/Cairo')
        const rescheduleToken = crypto.randomBytes(24).toString('hex')

        const booking = await createExpertBooking({
          reference,
          expertId,
          expertSlug,
          serviceId: serviceDoc._id,
          serviceTitle: verifiedServiceTitle,
          date: finalDate,
          time: finalTime,
          clientName: clientName.trim(),
          clientEmail: (clientEmail || '').trim(),
          clientPhone: (clientPhone || '').trim(),
          durationMinutes: finalDuration,
          amount: verifiedAmount,
          currency: verifiedCurrency,
          deliveryMode: serviceDoc.deliveryMode || 'ONLINE',
          location: serviceDoc.deliveryMode === 'IN_PERSON' ? serviceDoc.location : undefined,
          timezone: 'Africa/Cairo',
          sessionStartAt: bounds.sessionStartAt,
          sessionEndAt: bounds.sessionEndAt,
          rescheduleToken,
          rescheduleDeadlineHours: expertDoc?.rescheduleDeadlineHours || 24,
          attendanceStatus: 'pending',
          googleMeetLink:
            serviceDoc.deliveryMode !== 'IN_PERSON'
              ? serviceDoc.event?.joinUrl || expertDoc?.defaultGoogleMeetLink || undefined
              : undefined,
          paymentMethod: 'instapay',
          paymentStatus: paymentReceiptUrl ? 'receipt_uploaded' : 'pending',
          paymentReceiptUrl: paymentReceiptUrl || undefined,
          paymentReceiptPublicId: paymentReceiptPublicId || undefined,
          status: paymentReceiptUrl ? 'awaiting_verification' : 'pending',
          ...(Array.isArray(intakeAnswers) ? { intakeAnswers } : {}),
        })

        // Trigger booking received email notifications (to client and expert)
        try {
          const baseUrl = getAppBaseUrl()
          const { expertName, expertEmail } = await resolveExpertContact(expertObjId)
          const bookingUrl = `${baseUrl}/bookings/${booking._id}?token=${rescheduleToken}`
          const title = verifiedServiceTitle?.en || verifiedServiceTitle?.ar || 'Consultation Session'

          // Note: Client is only emailed when the booking is confirmed by admin, not upon initial submission.
          if (expertEmail) {
            const expertEmailData = renderBookingReceivedEmail({
              booking,
              expertName,
              clientName: clientName.trim(),
              serviceTitle: title,
              recipientRole: 'expert',
              bookingUrl,
            })
            await sendTransactionalEmail({
              bookingId: booking._id,
              emailType: 'booking_received',
              recipientEmail: expertEmail,
              recipientName: expertName,
              recipientRole: 'expert',
              subject: expertEmailData.subject,
              html: expertEmailData.html,
              text: expertEmailData.text,
            })
          }
        } catch (emailErr) {
          console.error('Failed to send booking notification email:', emailErr)
        }

        return NextResponse.json({ success: true, booking, reference })
      }
    }

    // For standard appointment-based consultations:
    // MUST have valid date & time
    if (!date || !time) {
      return NextResponse.json(
        { success: false, error: 'Date and time slot are required for appointment booking.' },
        { status: 400 },
      )
    }

    // Fallback expert pricing if no serviceDoc
    if (!serviceDoc) {
      const exp = expertDoc || (await expertsCol.findOne({ _id: expertObjId }))
      if (exp) {
        if (exp.categorySlug && !isAllowedMvpCategory(exp.categorySlug)) {
          return NextResponse.json(
            {
              success: false,
              error: 'This expert profile references a category outside the approved platform scope.',
            },
            { status: 400 },
          )
        }
        verifiedAmount = exp.priceNumber || 500
        verifiedDuration = exp.durationMinutes || 45
      }
    }

    const minNoticeHours = serviceDoc?.minNoticeHours !== undefined ? Number(serviceDoc.minNoticeHours) : 24
    const bounds = computeSessionBounds(date, time, verifiedDuration, 'Africa/Cairo')
    const now = new Date()
    const minBookingCutoff = new Date(now.getTime() + (minNoticeHours > 0 ? minNoticeHours * 60 * 60 * 1000 : 15 * 60 * 1000))

    if (bounds.sessionStartAt.getTime() < minBookingCutoff.getTime()) {
      const noticeMsg = minNoticeHours === 0
        ? 'in advance'
        : minNoticeHours === 24
          ? 'at least 1 day (24 hours) in advance (the day before)'
          : `at least ${Math.round(minNoticeHours / 24)} days in advance`
      return NextResponse.json(
        {
          success: false,
          error: `This service requires booking ${noticeMsg}. Please select an upcoming eligible slot.`,
        },
        { status: 400 },
      )
    }

    // Backend verification of Slot Availability to prevent double-booking
    const availableSlots = await getExpertSlotsForDate(
      expertId,
      date,
      verifiedDuration,
      verifiedBreak,
      minNoticeHours,
    )
    const slotObj = availableSlots.find((s) => s.time === time)

    if (!slotObj || !slotObj.available) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The requested time slot is no longer available. Please select another time.',
        },
        { status: 409 },
      )
    }

    const reference = `BK-${Math.floor(1000 + Math.random() * 9000)}`
    const deliveryMode = serviceDoc?.deliveryMode || 'ONLINE'
    const rescheduleToken = crypto.randomBytes(24).toString('hex')

    const booking = await createExpertBooking({
      reference,
      expertId,
      expertSlug,
      serviceId: serviceDoc ? serviceDoc._id : undefined,
      serviceTitle: verifiedServiceTitle,
      date,
      time,
      clientName: clientName.trim(),
      clientEmail: (clientEmail || '').trim(),
      clientPhone: (clientPhone || '').trim(),
      durationMinutes: verifiedDuration,
      amount: verifiedAmount,
      currency: verifiedCurrency,
      deliveryMode,
      location: deliveryMode === 'IN_PERSON' ? serviceDoc?.location : undefined,
      timezone: 'Africa/Cairo',
      sessionStartAt: bounds.sessionStartAt,
      sessionEndAt: bounds.sessionEndAt,
      rescheduleToken,
      rescheduleDeadlineHours: expertDoc?.rescheduleDeadlineHours || 24,
      attendanceStatus: 'pending',
      googleMeetLink:
        deliveryMode !== 'IN_PERSON'
          ? expertDoc?.defaultGoogleMeetLink || undefined
          : undefined,
      paymentMethod: 'instapay',
      paymentStatus: paymentReceiptUrl ? 'receipt_uploaded' : 'pending',
      paymentReceiptUrl: paymentReceiptUrl || undefined,
      paymentReceiptPublicId: paymentReceiptPublicId || undefined,
      status: paymentReceiptUrl ? 'awaiting_verification' : 'pending',
      ...(Array.isArray(intakeAnswers) ? { intakeAnswers } : {}),
    })

    // Trigger booking received email notifications (to client and expert)
    try {
      const baseUrl = getAppBaseUrl()
      const { expertName, expertEmail } = await resolveExpertContact(expertObjId)
      const bookingUrl = `${baseUrl}/bookings/${booking._id}?token=${rescheduleToken}`
      const title = verifiedServiceTitle?.en || verifiedServiceTitle?.ar || 'Consultation Session'

      // Note: Client is only emailed when the booking is confirmed by admin, not upon initial submission.
      if (expertEmail) {
        const expertEmailData = renderBookingReceivedEmail({
          booking,
          expertName,
          clientName: clientName.trim(),
          serviceTitle: title,
          recipientRole: 'expert',
          bookingUrl,
        })
        await sendTransactionalEmail({
          bookingId: booking._id,
          emailType: 'booking_received',
          recipientEmail: expertEmail,
          recipientName: expertName,
          recipientRole: 'expert',
          subject: expertEmailData.subject,
          html: expertEmailData.html,
          text: expertEmailData.text,
        })
      }
    } catch (emailErr) {
      console.error('Failed to send booking notification email:', emailErr)
    }

    return NextResponse.json({ success: true, booking, reference })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to book slot' },
      { status: 500 },
    )
  }
}
