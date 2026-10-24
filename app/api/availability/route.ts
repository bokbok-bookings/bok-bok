import { NextResponse } from 'next/server'
import {
  getExpertUpcomingDays,
  getExpertSlotsForDate,
  createExpertBooking,
  getCanonicalExpertId,
} from '@/lib/availability-server'
import { toObjectId } from '@/lib/db'

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
      const slots = await getExpertSlotsForDate(expertId, date, duration)
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
      durationMinutes,
      expertSlug,
      serviceId,
      serviceTitle,
      amount,
      currency,
      paymentReceiptUrl,
      paymentReceiptPublicId,
    } = body

    if (!rawExpertId || !date || !time || !clientName) {
      return NextResponse.json(
        { success: false, error: 'expertId, date, time, and clientName are required' },
        { status: 400 }
      )
    }

    const expertId = await getCanonicalExpertId(rawExpertId)
    const reference = `BK-${Math.floor(1000 + Math.random() * 9000)}`

    const booking = await createExpertBooking({
      reference,
      expertId,
      expertSlug,
      serviceId: serviceId ? toObjectId(serviceId) : undefined,
      serviceTitle: serviceTitle || undefined,
      date,
      time,
      clientName,
      clientEmail: clientEmail || '',
      clientPhone: clientPhone || '',
      durationMinutes: Number(durationMinutes) || 45,
      amount: Number(amount) || 0,
      currency: currency || 'EGP',
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
