import { NextResponse } from 'next/server'
import { uploadBuffer } from '@/lib/cloudinary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'receipt' // 'avatar' | 'receipt' | 'id_document' | 'general'

    let folder = 'bokbok/receipts'
    let maxWidth = 1600
    let maxHeight = 2000

    if (type === 'avatar') {
      folder = 'bokbok/avatars'
      maxWidth = 800
      maxHeight = 800
    } else if (type === 'id_document') {
      folder = 'bokbok/national_ids'
      maxWidth = 1800
      maxHeight = 1800
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image size must be under 10MB' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await uploadBuffer(buffer, folder, {
      maxWidth,
      maxHeight,
      quality: 'auto:good',
    })

    return NextResponse.json({
      success: true,
      url: result.secure_url || result.url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload image' },
      { status: 500 }
    )
  }
}
