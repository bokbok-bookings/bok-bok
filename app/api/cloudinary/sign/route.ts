import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paramsToSign } = body

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary API secret is not configured' },
        { status: 500 }
      )
    }

    if (!paramsToSign) {
      return NextResponse.json(
        { error: 'Missing paramsToSign' },
        { status: 400 }
      )
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
