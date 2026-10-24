import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCurrentUser } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, user: null }, { status: 401 })
  }
  const fullUser = await getCurrentUser()
  return NextResponse.json({
    success: true,
    user: {
      ...session,
      phone: fullUser?.phone,
      status: fullUser?.status,
    },
  })
}
