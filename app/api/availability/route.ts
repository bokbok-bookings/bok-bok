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
import { computeSessionBounds } from '@/lib/email/scheduler'

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

    if (action === 'days') {
      const count = parseInt(searchParams.get('count') || '14', 10)
      const days = await getExpertUpcomingDays(expertId, count, duration)
      return NextResponse.json({ success: true, expertId, days })
    }

    if (action === 'slots') {
      const date = searchParams.get('date')
      if (!date) {
        return NextResponse.json(
          { success: false, error: 'Date parameter is required' },
          { status: 400 }
        )
      }
      const slots = await getExpertSlotsForDate(expertId, date, duration, breakAfter)
      return NextResponse.json({ success: true, expertId, date, slots })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Availability API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch availability' },
      { status: 500 }
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
    } = body

    if (!rawExpertId || !clientName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'expertId and clientName are required' },
        { status: 400 }
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
      } catch (err) {
        // ignore invalid objectId
      }

      if (serviceDoc) {
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
              { status: 400 }
            )
          }

          // Atomically increment registeredCount
          await servicesCol.updateOne(
            { _id: serviceDoc._id, 'event.registeredCount': { $lt: capacity } },
            { $inc: { 'event.registeredCount': 1 } }
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
          })

          return NextResponse.json({ success: true, booking, reference })
        }
      }
    }

    // For standard appointment-based services (Consultations & General Services):
    // MUST have valid date & time
    if (!date || !time) {
      return NextResponse.json(
        { success: false, error: 'Date and time slot are required for appointment booking.' },
        { status: 400 }
      )
    }

    // Fallback expert pricing if no serviceDoc
    if (!serviceDoc) {
      const exp = await expertsCol.findOne({ _id: expertObjId })
      if (exp) {
        verifiedAmount = exp.priceNumber || 500
        verifiedDuration = exp.durationMinutes || 45
      }
    }

    // Backend verification of Slot Availability to prevent double-booking
    const availableSlots = await getExpertSlotsForDate(
      expertId,
      date,
      verifiedDuration,
      verifiedBreak
    )
    const slotObj = availableSlots.find((s) => s.time === time)

    if (!slotObj || !slotObj.available) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The requested time slot is no longer available. Please select another time.',
        },
        { status: 409 }
      )
    }

    const reference = `BK-${Math.floor(1000 + Math.random() * 9000)}`
    const deliveryMode = serviceDoc?.deliveryMode || 'ONLINE'
    const bounds = computeSessionBounds(date, time, verifiedDuration, 'Africa/Cairo')
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
    })

    return NextResponse.json({ success: true, booking, reference })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to book slot' },
      { status: 500 }
    )
  }
}
