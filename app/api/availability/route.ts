import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import {
  getExpertUpcomingDays,
  getExpertSlotsForDate,
  createExpertBooking,
  getCanonicalExpertId,
  getCanonicalExpertObjectId,
} from '@/lib/availability-server'
import { toObjectId, getServicesCollection, getExpertsCollection, getBookingsCollection } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { isAllowedMvpCategory, isAllowedMvpSubcategory } from '@/lib/data/categories'
import { computeSessionBounds, getAppBaseUrl, resolveExpertContact } from '@/lib/email/scheduler'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import {
  renderBookingReceivedEmail,
  renderBookingConfirmationEmail,
  renderEventRegistrationReceivedEmail,
  renderEventWaitlistJoinedEmail,
} from '@/lib/email/templates'
import { getBookingRoleLinks } from '@/lib/booking/access'
import { ensureEventServiceMeetLink, configureMeetSpaceOpenAccess } from '@/lib/google-calendar'
import { createBookingRefundPolicySnapshot } from '@/lib/services/refund-policies'
import { getServerGeo } from '@/lib/geo/server'
import {
  isServiceAvailableInMarket,
  getServicePriceForMarket,
  type MarketCode,
} from '@/lib/geo/markets'

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

    const session = await getSession()
    const clientObjId =
      session?.userId && ObjectId.isValid(session.userId)
        ? new ObjectId(session.userId)
        : undefined
    const normalizedClientEmail = (clientEmail || session?.email || '').trim().toLowerCase()

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

      // Resolve visitor's market and lock verified price/currency
      const geo = await getServerGeo(request)
      const requestedMarket: MarketCode = (body.market as MarketCode) || geo.market

      if (!isServiceAvailableInMarket(serviceDoc, requestedMarket)) {
        return NextResponse.json(
          {
            success: false,
            error: 'This service is not available in your country/region.',
          },
          { status: 400 },
        )
      }

      const marketPrice = getServicePriceForMarket(serviceDoc, requestedMarket)
      if (marketPrice) {
        verifiedCurrency = marketPrice.currency
        verifiedAmount = marketPrice.amount
      } else {
        verifiedCurrency = serviceDoc.pricing?.baseCurrency || 'EGP'
        verifiedAmount =
          serviceDoc.pricing?.prices?.[verifiedCurrency] ??
          serviceDoc.pricing?.prices?.EGP ??
          500
      }

      // If it's a WORKSHOP or WEBINAR, event registration logic applies
      if (serviceDoc.bookingType === 'WORKSHOP' || serviceDoc.bookingType === 'WEBINAR') {
        const eventMeta = serviceDoc.event
        const eventStatus = eventMeta?.eventStatus || 'open'
        const eventDate = eventMeta?.date || date
        const eventTime = eventMeta?.startTime || '18:00'
        const capacity = eventMeta?.capacity || 20
        const allowWaitlist = eventMeta?.allowWaitlist !== false
        const isFreeEvent = verifiedAmount <= 0
        const finalDuration = serviceDoc.durationMinutes || 60
        const eventTimezone = eventMeta?.timezone || 'Africa/Cairo'

        if (eventStatus === 'closed') {
          return NextResponse.json(
            { success: false, error: 'Registration for this event is closed.' },
            { status: 400 },
          )
        }

        const bounds = computeSessionBounds(eventDate, eventTime, finalDuration, eventTimezone)
        if (eventStatus !== 'coming_soon' && bounds.sessionStartAt.getTime() < Date.now()) {
          return NextResponse.json(
            { success: false, error: 'This event has already started or ended.' },
            { status: 400 },
          )
        }

        const minNotice = Number(serviceDoc.minNoticeHours) || 0
        if (eventStatus !== 'coming_soon' && minNotice > 0) {
          const cutoffMs = bounds.sessionStartAt.getTime() - (minNotice * 60 * 60 * 1000)
          if (Date.now() > cutoffMs) {
            const noticeMsg =
              minNotice === 24
                ? 'Registration for this event closes 24 hours prior to start time.'
                : `Registration for this event closes ${Math.round(minNotice / 24)} days prior to start time.`
            return NextResponse.json(
              { success: false, error: noticeMsg },
              { status: 400 },
            )
          }
        }

        // Duplicate registration guard (case-insensitive email per event)
        if (normalizedClientEmail) {
          const bookingsCol = await getBookingsCollection()
          const escapedEmail = normalizedClientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const duplicate = await bookingsCol.findOne({
            serviceId: serviceDoc._id,
            clientEmail: { $regex: `^${escapedEmail}$`, $options: 'i' },
            status: { $in: ['pending', 'awaiting_payment', 'awaiting_verification', 'confirmed', 'waitlisted'] },
          })
          if (duplicate) {
            return NextResponse.json(
              {
                success: false,
                error:
                  duplicate.status === 'waitlisted'
                    ? 'You are already on the waitlist for this event.'
                    : 'You have already registered for this event.',
              },
              { status: 409 },
            )
          }
        }

        const reference = `EV-${Math.floor(1000 + Math.random() * 9000)}`
        const rescheduleToken = crypto.randomBytes(24).toString('hex')
        const baseUrl = getAppBaseUrl()
        const eventUrl = `${baseUrl}/services/${serviceDoc.slug || serviceDoc._id.toString()}`
        const title = verifiedServiceTitle?.en || verifiedServiceTitle?.ar || 'Event Session'
        const refundPolicySnapshot = createBookingRefundPolicySnapshot(serviceDoc?.refundPolicy)

        // 1. Coming Soon → Early-interest / Notify-Me list (no seat reserved, no payment)
        if (eventStatus === 'coming_soon') {
          const booking = await createExpertBooking({
            reference,
            expertId,
            expertSlug,
            serviceId: serviceDoc._id,
            serviceTitle: verifiedServiceTitle,
            bookingType: serviceDoc.bookingType,
            registrationType: 'interest',
            refundPolicy: refundPolicySnapshot,
            date: eventDate,
            time: eventTime,
            ...(clientObjId ? { clientId: clientObjId } : {}),
            clientName: clientName.trim(),
            clientEmail: normalizedClientEmail,
            clientPhone: (clientPhone || '').trim(),
            durationMinutes: finalDuration,
            amount: verifiedAmount,
            currency: verifiedCurrency,
            deliveryMode: serviceDoc.deliveryMode || 'ONLINE',
            location: serviceDoc.deliveryMode === 'IN_PERSON' ? serviceDoc.location : undefined,
            timezone: eventTimezone,
            sessionStartAt: bounds.sessionStartAt,
            sessionEndAt: bounds.sessionEndAt,
            rescheduleToken,
            attendanceStatus: 'pending',
            status: 'waitlisted',
            ...(Array.isArray(intakeAnswers) ? { intakeAnswers } : {}),
          })

          try {
            const { expertName } = await resolveExpertContact(expertObjId)
            if (normalizedClientEmail) {
              const emailData = renderEventWaitlistJoinedEmail({
                clientName: clientName.trim(),
                expertName,
                serviceTitle: title,
                date: eventDate,
                isComingSoon: true,
                eventUrl,
              })
              await sendTransactionalEmail({
                bookingId: booking._id,
                emailType: 'event_waitlist_joined',
                recipientEmail: normalizedClientEmail,
                recipientName: clientName.trim(),
                recipientRole: 'client',
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
              })
            }
          } catch (emailErr) {
            console.error('Failed to send coming-soon notification email:', emailErr)
          }

          return NextResponse.json({
            success: true,
            booking,
            reference,
            registrationType: 'interest',
          })
        }

        // 2. Atomically attempt to reserve a seat (prevents overbooking race condition)
        const seatUpdate = await servicesCol.updateOne(
          {
            _id: serviceDoc._id,
            $or: [
              { 'event.registeredCount': { $lt: capacity } },
              { 'event.registeredCount': { $exists: false } },
            ],
          },
          { $inc: { 'event.registeredCount': 1 } },
        )

        if (seatUpdate.modifiedCount === 0) {
          // Event is full — route to waitlist if enabled
          if (!allowWaitlist) {
            return NextResponse.json(
              { success: false, error: 'This event has reached full capacity.' },
              { status: 400 },
            )
          }

          const booking = await createExpertBooking({
            reference,
            expertId,
            expertSlug,
            serviceId: serviceDoc._id,
            serviceTitle: verifiedServiceTitle,
            bookingType: serviceDoc.bookingType,
            registrationType: 'waitlist',
            refundPolicy: refundPolicySnapshot,
            date: eventDate,
            time: eventTime,
            ...(clientObjId ? { clientId: clientObjId } : {}),
            clientName: clientName.trim(),
            clientEmail: normalizedClientEmail,
            clientPhone: (clientPhone || '').trim(),
            durationMinutes: finalDuration,
            amount: verifiedAmount,
            currency: verifiedCurrency,
            deliveryMode: serviceDoc.deliveryMode || 'ONLINE',
            location: serviceDoc.deliveryMode === 'IN_PERSON' ? serviceDoc.location : undefined,
            timezone: eventTimezone,
            sessionStartAt: bounds.sessionStartAt,
            sessionEndAt: bounds.sessionEndAt,
            rescheduleToken,
            attendanceStatus: 'pending',
            status: 'waitlisted',
            ...(Array.isArray(intakeAnswers) ? { intakeAnswers } : {}),
          })

          try {
            const { expertName } = await resolveExpertContact(expertObjId)
            if (normalizedClientEmail) {
              const emailData = renderEventWaitlistJoinedEmail({
                clientName: clientName.trim(),
                expertName,
                serviceTitle: title,
                date: eventDate,
                isComingSoon: false,
                eventUrl,
              })
              await sendTransactionalEmail({
                bookingId: booking._id,
                emailType: 'event_waitlist_joined',
                recipientEmail: normalizedClientEmail,
                recipientName: clientName.trim(),
                recipientRole: 'client',
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
              })
            }
          } catch (emailErr) {
            console.error('Failed to send waitlist confirmation email:', emailErr)
          }

          return NextResponse.json({
            success: true,
            booking,
            reference,
            registrationType: 'waitlist',
          })
        }

        // 3. Seat reserved! Validate receipt for PAID events (FREE events never require receipt)
        if (!isFreeEvent && !paymentReceiptUrl) {
          await servicesCol.updateOne(
            { _id: serviceDoc._id, 'event.registeredCount': { $gt: 0 } },
            { $inc: { 'event.registeredCount': -1 } },
          )
          return NextResponse.json(
            { success: false, error: 'Payment receipt is required for paid events.' },
            { status: 400 },
          )
        }

        // Free events default to approval_required (expert or admin approves); instant mode confirms immediately
        const isInstantFree = isFreeEvent && eventMeta?.registrationMode === 'instant'
        const bookingStatus = isInstantFree
          ? 'confirmed'
          : isFreeEvent
            ? 'pending'
            : 'awaiting_verification'

        // Reuse the single shared Google Meet room created on service approval (never create separate rooms per attendee)
        let sharedMeetLink = eventMeta?.joinUrl?.trim() || undefined
        let sharedCalendarEventId = eventMeta?.googleCalendarEventId
        let sharedCalendarEventLink = eventMeta?.googleCalendarEventLink
        let sharedMeetSpaceName = eventMeta?.googleMeetSpaceName

        if (serviceDoc.deliveryMode !== 'IN_PERSON' && !sharedMeetLink && isInstantFree) {
          try {
            const room = await ensureEventServiceMeetLink(serviceDoc)
            if (room?.joinUrl) {
              sharedMeetLink = room.joinUrl
              sharedCalendarEventId = room.googleCalendarEventId
              sharedCalendarEventLink = room.googleCalendarEventLink
              sharedMeetSpaceName = room.googleMeetSpaceName
            }
          } catch (calErr: any) {
            console.error('[Availability] Shared event Meet link fallback failed:', calErr?.message)
          }
        }

        if (serviceDoc.deliveryMode !== 'IN_PERSON' && sharedMeetLink && isInstantFree && normalizedClientEmail) {
          try {
            await configureMeetSpaceOpenAccess({
              meetLinkOrCode: sharedMeetLink,
              spaceName: sharedMeetSpaceName,
              clientEmail: normalizedClientEmail,
            })
          } catch {
            // non-blocking
          }
        }

        const booking = await createExpertBooking({
          reference,
          expertId,
          expertSlug,
          serviceId: serviceDoc._id,
          serviceTitle: verifiedServiceTitle,
          bookingType: serviceDoc.bookingType,
          registrationType: 'seat',
          refundPolicy: refundPolicySnapshot,
          date: eventDate,
          time: eventTime,
          ...(clientObjId ? { clientId: clientObjId } : {}),
          clientName: clientName.trim(),
          clientEmail: normalizedClientEmail,
          clientPhone: (clientPhone || '').trim(),
          durationMinutes: finalDuration,
          amount: verifiedAmount,
          currency: verifiedCurrency,
          deliveryMode: serviceDoc.deliveryMode || 'ONLINE',
          location: serviceDoc.deliveryMode === 'IN_PERSON' ? serviceDoc.location : undefined,
          timezone: eventTimezone,
          sessionStartAt: bounds.sessionStartAt,
          sessionEndAt: bounds.sessionEndAt,
          rescheduleToken,
          rescheduleDeadlineHours: expertDoc?.rescheduleDeadlineHours || 24,
          attendanceStatus: 'pending',
          googleMeetLink:
            serviceDoc.deliveryMode !== 'IN_PERSON'
              ? sharedMeetLink || undefined
              : undefined,
          ...(serviceDoc.deliveryMode !== 'IN_PERSON' && sharedCalendarEventId
            ? { googleCalendarEventId: sharedCalendarEventId }
            : {}),
          ...(serviceDoc.deliveryMode !== 'IN_PERSON' && sharedCalendarEventLink
            ? { googleCalendarEventLink: sharedCalendarEventLink }
            : {}),
          ...(serviceDoc.deliveryMode !== 'IN_PERSON' && sharedMeetSpaceName
            ? { googleMeetSpaceName: sharedMeetSpaceName }
            : {}),
          ...(isFreeEvent ? {} : { paymentMethod: 'instapay' }),
          paymentStatus: isFreeEvent ? 'verified' : paymentReceiptUrl ? 'receipt_uploaded' : 'pending',
          paymentReceiptUrl: isFreeEvent ? undefined : paymentReceiptUrl || undefined,
          paymentReceiptPublicId: isFreeEvent ? undefined : paymentReceiptPublicId || undefined,
          status: bookingStatus,
          ...(Array.isArray(intakeAnswers) ? { intakeAnswers } : {}),
        })

        // Trigger email notifications to registrant and expert
        try {
          const { expertName, expertEmail } = await resolveExpertContact(expertObjId)
          const { clientPageUrl, clientJoinUrl } = await getBookingRoleLinks(baseUrl, booking)

          if (normalizedClientEmail) {
            if (isInstantFree) {
              const confirmEmail = renderBookingConfirmationEmail({
                booking,
                expertName,
                clientName: clientName.trim(),
                serviceTitle: title,
                recipientRole: 'client',
                rescheduleUrl: clientPageUrl,
                bookingUrl: clientPageUrl,
                meetLink: clientJoinUrl,
              })
              await sendTransactionalEmail({
                bookingId: booking._id,
                emailType: 'booking_confirmed',
                recipientEmail: normalizedClientEmail,
                recipientName: clientName.trim(),
                recipientRole: 'client',
                subject: confirmEmail.subject,
                html: confirmEmail.html,
                text: confirmEmail.text,
              })
            } else {
              const reqEmail = renderEventRegistrationReceivedEmail({
                booking,
                expertName,
                clientName: clientName.trim(),
                serviceTitle: title,
                isFree: isFreeEvent,
                bookingUrl: clientPageUrl,
              })
              await sendTransactionalEmail({
                bookingId: booking._id,
                emailType: 'event_registration_received',
                recipientEmail: normalizedClientEmail,
                recipientName: clientName.trim(),
                recipientRole: 'client',
                subject: reqEmail.subject,
                html: reqEmail.html,
                text: reqEmail.text,
              })
            }
          }

          if (isFreeEvent && expertEmail) {
            const expertEmailData = renderBookingReceivedEmail({
              booking,
              expertName,
              clientName: clientName.trim(),
              serviceTitle: title,
              recipientRole: 'expert',
              bookingUrl: `${baseUrl}/dashboard/bookings`,
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

          if (!isFreeEvent) {
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'omarwagih95@gmail.com'
            const adminEmailData = renderBookingReceivedEmail({
              booking,
              expertName,
              clientName: clientName.trim(),
              serviceTitle: title,
              recipientRole: 'admin',
              bookingUrl: `${baseUrl}/admin/bookings`,
            })
            await sendTransactionalEmail({
              bookingId: booking._id,
              emailType: 'booking_received',
              recipientEmail: adminEmail,
              recipientName: 'Bok Bok Admin',
              recipientRole: 'admin',
              subject: adminEmailData.subject,
              html: adminEmailData.html,
              text: adminEmailData.text,
            })
          }
        } catch (emailErr) {
          console.error('Failed to send event booking notification email:', emailErr)
        }

        return NextResponse.json({
          success: true,
          booking,
          reference,
          registrationType: 'seat',
          status: bookingStatus,
        })
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
    const refundPolicySnapshot = createBookingRefundPolicySnapshot(serviceDoc?.refundPolicy)

    const booking = await createExpertBooking({
      reference,
      expertId,
      expertSlug,
      serviceId: serviceDoc ? serviceDoc._id : undefined,
      serviceTitle: verifiedServiceTitle,
      refundPolicy: refundPolicySnapshot,
      date,
      time,
      ...(clientObjId ? { clientId: clientObjId } : {}),
      clientName: clientName.trim(),
      clientEmail: normalizedClientEmail,
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

    // Trigger booking received email notification to Admin for InstaPay review
    // (Expert and Client are notified once Admin confirms the booking)
    try {
      const baseUrl = getAppBaseUrl()
      const { expertName } = await resolveExpertContact(expertObjId)
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'omarwagih95@gmail.com'
      const adminBookingUrl = `${baseUrl}/admin/bookings`
      const title = verifiedServiceTitle?.en || verifiedServiceTitle?.ar || 'Consultation Session'

      const adminEmailData = renderBookingReceivedEmail({
        booking,
        expertName,
        clientName: clientName.trim(),
        serviceTitle: title,
        recipientRole: 'admin',
        bookingUrl: adminBookingUrl,
      })
      await sendTransactionalEmail({
        bookingId: booking._id,
        emailType: 'booking_received',
        recipientEmail: adminEmail,
        recipientName: 'Bok Bok Admin',
        recipientRole: 'admin',
        subject: adminEmailData.subject,
        html: adminEmailData.html,
        text: adminEmailData.text,
      })
    } catch (emailErr) {
      console.error('Failed to send admin booking notification email:', emailErr)
    }

    return NextResponse.json({ success: true, booking, reference })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to book slot' },
      { status: 500 },
    )
  }
}
