import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  await deleteSession()
  return NextResponse.json({ success: true, message: 'Logged out successfully' })
}
