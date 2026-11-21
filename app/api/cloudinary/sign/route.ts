import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_SIGN_PARAMS = new Set([
  'timestamp',
  'folder',
  'public_id',
  'upload_preset',
  'source',
  'eager',
  'transformation',
  'format',
])

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const body = await request.json()
    const { paramsToSign } = body

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary API secret is not configured' },
        { status: 500 }
      )
    }

    if (!paramsToSign || typeof paramsToSign !== 'object' || Array.isArray(paramsToSign)) {
      return NextResponse.json(
        { error: 'Invalid or missing paramsToSign' },
        { status: 400 }
      )
    }

    // Reject arbitrary payload keys that are not allowed for client signing
    const paramKeys = Object.keys(paramsToSign)
    for (const key of paramKeys) {
      if (!ALLOWED_SIGN_PARAMS.has(key)) {
        return NextResponse.json(
          { error: `Unauthorized signing parameter: ${key}` },
          { status: 403 }
        )
      }
    }

    // Require folder matching allowed prefix
    if (!paramsToSign.folder || !String(paramsToSign.folder).startsWith('bokbok/') || String(paramsToSign.folder).includes('..')) {
      return NextResponse.json(
        { error: 'Unauthorized target folder. Must start with bokbok/' },
        { status: 403 }
      )
    }

    // Validate timestamp freshness if present
    if (paramsToSign.timestamp) {
      const now = Math.floor(Date.now() / 1000)
      const ts = Number(paramsToSign.timestamp)
      if (isNaN(ts) || Math.abs(now - ts) > 3600) {
        return NextResponse.json(
          { error: 'Expired or invalid timestamp' },
          { status: 400 }
        )
      }
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)
    return NextResponse.json({ signature })
  } catch (error: any) {
    console.error('Signature generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Signature generation failed' },
      { status: 500 }
    )
  }
}
