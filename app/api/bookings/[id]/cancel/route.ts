import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import {
  getBookingsCollection,
  getServicesCollection,
  getUsersCollection,
  toObjectId,
  type BookingCancellationInfo,
} from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { resolveTokenRole, getBookingRoleLinks } from '@/lib/booking/access'
import {
  computeSessionBounds,
  resolveExpertContact,
  getAppBaseUrl,
} from '@/lib/email/scheduler'
import { sendTransactionalEmail } from '@/lib/email/mailer'
import {
  renderBookingCancelledEmail,
  renderAdminRefundRequestEmail,
} from '@/lib/email/templates'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import {
  calculateEligibleRefund,
  createBookingRefundPolicySnapshot,
} from '@/lib/services/refund-policies'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const unwrappedParams =
      typeof (context.params as any)?.then === 'function'
        ? await (context.params as Promise<{ id: string }>)
        : (context.params as { id: string })
    const { id } = unwrappedParams

    const { searchParams } = new URL(request.url)
    const queryToken = searchParams.get('token')

    const body = await request.json().catch(() => ({}))
    const { reason, instapayAddress, token: bodyToken } = body
    const token = queryToken || bodyToken

    let bookingObjId: ObjectId
    try {
      bookingObjId = toObjectId(id)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 })
    }

    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // Authorization check
    const session = await getSession()
    const tokenRole = resolveTokenRole(booking, token)
    const isAdmin = session?.role === 'admin'
    const isExpertOwner =
      tokenRole === 'expert' ||
      Boolean(
        session?.role === 'expert' &&
          session?.expertId &&
          session.expertId === booking.expertId.toString(),
      )
    const isClientOwner =
      tokenRole === 'client' ||
      Boolean(
        (session?.userId && booking.clientId && session.userId === booking.clientId.toString()) ||
          (session?.email &&
            booking.clientEmail &&
            session.email.toLowerCase().trim() === booking.clientEmail.toLowerCase().trim()),
      )

    let callerRole: 'client' | 'expert' | 'admin' | null = null
    if (isAdmin) {
      callerRole = 'admin'
    } else if (tokenRole === 'client' || isClientOwner) {
      callerRole = 'client'
    } else if (tokenRole === 'expert' || isExpertOwner) {
      callerRole = 'expert'
    }

    if (!callerRole) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to cancel this booking' },
        { status: 403 },
      )
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'This booking is already cancelled or rejected.' },
        { status: 400 },
      )
    }

    // Resolve service (for fallback refund policy & event seat count)
    let serviceDoc: any = null
    if (booking.serviceId) {
      try {
        const servicesCol = await getServicesCollection()
        serviceDoc = await servicesCol.findOne({ _id: toObjectId(booking.serviceId) })
      } catch {
        serviceDoc = null
      }
    }

    // Resolve session start time
    const timezone = booking.timezone || 'Africa/Cairo'
    let sessionStartAt = booking.sessionStartAt
    if (!sessionStartAt) {
      const bounds = computeSessionBounds(
        booking.date,
        booking.time,
        booking.durationMinutes || 45,
        timezone,
      )
      sessionStartAt = bounds.sessionStartAt
    }

    const now = new Date()
    if (callerRole !== 'admin' && now >= sessionStartAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cannot cancel a session that has already started or ended. Please use the dispute/issue reporting window if needed.',
        },
        { status: 400 },
      )
    }

    // Calculate eligible refund based on the immutable booking refund policy snapshot
    const policySnapshot =
      booking.refundPolicy ||
      createBookingRefundPolicySnapshot(serviceDoc?.refundPolicy || null)

    const calculation = calculateEligibleRefund({
      policy: policySnapshot,
      sessionStartAt,
      cancellationTime: now,
      totalAmount: booking.amount || 0,
      maxRefundPercentageCap: booking.maxRefundPercentageCap,
    })

    // Determine if payment was InstaPay and a non-zero refund request must be sent to admin
    const isInstaPay =
      booking.paymentMethod === 'instapay' || Boolean(booking.paymentReceiptUrl)
    const hasPaidAmount =
      (booking.amount || 0) > 0 &&
      booking.paymentStatus !== 'pending' &&
      booking.paymentStatus !== 'rejected' &&
      (booking.paymentStatus === 'verified' ||
        booking.paymentStatus === 'receipt_uploaded' ||
        booking.status === 'confirmed' ||
        booking.status === 'awaiting_verification')

    const requiresAdminRefund = isInstaPay && hasPaidAmount && calculation.refundAmount > 0

    const sanitizedReason =
      typeof reason === 'string' ? reason.trim().slice(0, 1000) : ''
    const sanitizedInstapay =
      typeof instapayAddress === 'string' ? instapayAddress.trim().slice(0, 200) : ''

    const cancellationInfo: BookingCancellationInfo = {
      cancelledAt: now,
      cancelledByRole: callerRole,
      ...(session?.userId && ObjectId.isValid(session.userId)
        ? { cancelledByUserId: new ObjectId(session.userId) }
        : {}),
      ...(sanitizedReason ? { reason: sanitizedReason } : {}),
      policyType: calculation.policyType,
      hoursBeforeSession: Math.round(calculation.hoursRemaining * 100) / 100,
      refundPercentage: calculation.refundPercentage,
      refundAmount: hasPaidAmount ? calculation.refundAmount : 0,
      currency: booking.currency || 'EGP',
      paymentMethod: booking.paymentMethod || (isInstaPay ? 'instapay' : undefined),
      refundStatus: requiresAdminRefund ? 'pending_admin' : 'not_required',
      ...(sanitizedInstapay ? { instapayAddress: sanitizedInstapay } : {}),
    }

    // Atomically mark booking as cancelled (prevents double-cancel race)
    const updateRes = await bookingsCol.updateOne(
      {
        _id: bookingObjId,
        status: { $nin: ['cancelled', 'rejected'] },
      },
      {
        $set: {
          status: 'cancelled',
          attendanceStatus: 'cancelled',
          cancellation: cancellationInfo,
          updatedAt: now,
        },
      },
    )

    if (updateRes.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking was already cancelled.' },
        { status: 409 },
      )
    }

    // Release group event seat if applicable
    const isGroupEvent = Boolean(
      booking.bookingType === 'WORKSHOP' ||
        booking.bookingType === 'WEBINAR' ||
        serviceDoc?.bookingType === 'WORKSHOP' ||
        serviceDoc?.bookingType === 'WEBINAR',
    )

    if (isGroupEvent && booking.status !== 'waitlisted' && booking.serviceId) {
      try {
        const servicesCol = await getServicesCollection()
        await servicesCol.updateOne(
          {
            _id: toObjectId(booking.serviceId),
            'event.registeredCount': { $gt: 0 },
          },
          { $inc: { 'event.registeredCount': -1 } },
        )
      } catch (err) {
        console.error('[Cancel] Failed to decrement event seat:', err)
      }
    }

    // Remove Google Calendar event for 1-on-1 bookings
    if (booking.googleCalendarEventId && !isGroupEvent) {
      try {
        await deleteCalendarEvent(booking.googleCalendarEventId)
      } catch (calErr: any) {
        console.error('[Cancel] Failed to delete Google Calendar event:', calErr?.message)
      }
    }

    // Send email notifications (non-blocking race so UI responds fast)
    try {
      const baseUrl = getAppBaseUrl()
      const { expertName, expertEmail } = await resolveExpertContact(booking.expertId)
      const serviceTitle =
        booking.serviceTitle?.en || booking.serviceTitle?.ar || 'Consultation Session'
      const { clientPageUrl, expertPageUrl } = await getBookingRoleLinks(baseUrl, booking)
      const updatedBooking = { ...booking, status: 'cancelled' as const, cancellation: cancellationInfo }

      const emailTasks: Promise<any>[] = []

      // 1. Notify Client
      if (booking.clientEmail) {
        const clientEmail = renderBookingCancelledEmail({
          booking: updatedBooking,
          expertName,
          clientName: booking.clientName,
          serviceTitle,
          recipientRole: 'client',
          cancelledByRole: callerRole,
          reason: sanitizedReason || undefined,
          refundPercentage: cancellationInfo.refundPercentage,
          refundAmount: cancellationInfo.refundAmount,
          requiresAdminRefund,
          bookingUrl: clientPageUrl,
        })
        emailTasks.push(
          sendTransactionalEmail({
            bookingId: booking._id,
            emailType: 'booking_cancelled',
            recipientEmail: booking.clientEmail,
            recipientName: booking.clientName,
            recipientRole: 'client',
            subject: clientEmail.subject,
            html: clientEmail.html,
            text: clientEmail.text,
          }),
        )
      }

      // 2. Notify Expert
      if (expertEmail) {
        const expEmail = renderBookingCancelledEmail({
          booking: updatedBooking,
          expertName,
          clientName: booking.clientName,
          serviceTitle,
          recipientRole: 'expert',
          cancelledByRole: callerRole,
          reason: sanitizedReason || undefined,
          refundPercentage: cancellationInfo.refundPercentage,
          refundAmount: cancellationInfo.refundAmount,
          requiresAdminRefund: false,
          bookingUrl: expertPageUrl,
        })
        emailTasks.push(
          sendTransactionalEmail({
            bookingId: booking._id,
            emailType: 'booking_cancelled',
            recipientEmail: expertEmail,
            recipientName: expertName,
            recipientRole: 'expert',
            subject: expEmail.subject,
            html: expEmail.html,
            text: expEmail.text,
          }),
        )
      }

      // 3. If InstaPay & Refund > 0 -> Send Cancellation/Refund Request to Admins
      if (requiresAdminRefund) {
        const usersCol = await getUsersCollection()
        const adminUsers = await usersCol
          .find({ role: 'admin' })
          .project({ email: 1, displayName: 1 })
          .toArray()

        const adminEmails = new Set<string>()
        for (const a of adminUsers) {
          if (a.email) adminEmails.add(a.email.toLowerCase().trim())
        }
        if (process.env.ADMIN_EMAIL) {
          adminEmails.add(process.env.ADMIN_EMAIL.toLowerCase().trim())
        }

        const adminBookingsUrl = `${baseUrl}/admin/bookings`
        const adminMail = renderAdminRefundRequestEmail({
          booking: updatedBooking,
          expertName,
          clientName: booking.clientName,
          serviceTitle,
          reason: sanitizedReason || undefined,
          instapayAddress: sanitizedInstapay || booking.clientPhone || undefined,
          policyType: cancellationInfo.policyType,
          hoursBeforeSession: cancellationInfo.hoursBeforeSession,
          refundPercentage: cancellationInfo.refundPercentage,
          refundAmount: cancellationInfo.refundAmount,
          adminBookingsUrl,
        })

        for (const adminEmail of adminEmails) {
          emailTasks.push(
            sendTransactionalEmail({
              bookingId: booking._id,
              emailType: 'refund_request_admin',
              recipientEmail: adminEmail,
              recipientName: 'Bok Bok Admin',
              recipientRole: 'admin',
              subject: adminMail.subject,
              html: adminMail.html,
              text: adminMail.text,
            }),
          )
        }
      }

      await Promise.race([
        Promise.allSettled(emailTasks),
        new Promise((resolve) => setTimeout(resolve, 6000)),
      ])
    } catch (emailErr) {
      console.error('[Cancel] Email dispatch error:', emailErr)
    }

    return NextResponse.json({
      success: true,
      cancellation: cancellationInfo,
      requiresAdminRefund,
      message: requiresAdminRefund
        ? `Booking cancelled. Your InstaPay refund request for ${cancellationInfo.refundAmount} ${cancellationInfo.currency} (${cancellationInfo.refundPercentage}%) has been sent to our admin team.`
        : 'Booking cancelled successfully.',
    })
  } catch (error: any) {
    console.error('[Cancel Booking API Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel booking' },
      { status: 500 },
    )
  }
}
