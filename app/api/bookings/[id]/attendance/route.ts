import { NextResponse } from 'next/server'
import { getBookingsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { submitAttendanceReport } from '@/lib/booking/attendance'
import { resolveTokenRole } from '@/lib/booking/access'

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

    const body = await request.json()
    const { response, notes, token: bodyToken, adminOverrideStatus } = body
    const token = queryToken || bodyToken

    const bookingObjId = toObjectId(id)
    const bookingsCol = await getBookingsCollection()
    const booking = await bookingsCol.findOne({ _id: bookingObjId })

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const session = await getSession()
    const tokenRole = resolveTokenRole(booking, token)
    const isAdmin = session?.role === 'admin'
    const isExpertOwner =
      session?.role === 'expert' &&
      session?.expertId &&
      session.expertId === booking.expertId.toString()
    const isClientSession =
      session?.userId && booking.clientId && session.userId === booking.clientId.toString()

    let callerRole: 'client' | 'expert' | 'admin' | null = null
    let callerUserId: string | undefined = undefined

    // Token identity takes priority so the expert's booking-page link reports as EXPERT
    if (tokenRole === 'expert') {
      callerRole = 'expert'
      callerUserId = session?.userId
    } else if (tokenRole === 'client') {
      callerRole = 'client'
      callerUserId = session?.userId
    } else if (isAdmin) {
      callerRole = 'admin'
      callerUserId = session?.userId
    } else if (isExpertOwner) {
      callerRole = 'expert'
      callerUserId = session?.userId
    } else if (isClientSession) {
      callerRole = 'client'
      callerUserId = session?.userId
    }

    if (!callerRole) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to submit attendance for this booking' },
        { status: 403 }
      )
    }

    const result = await submitAttendanceReport({
      bookingId: bookingObjId,
      userRole: callerRole,
      userId: callerUserId,
      response,
      notes,
      adminOverrideStatus,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit attendance report' },
      { status: 500 }
    )
  }
}

