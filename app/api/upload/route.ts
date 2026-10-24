import { NextResponse } from 'next/server'
import { uploadBuffer } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'receipt' // 'avatar' | 'receipt' | 'id_document' | 'general'
    const folder =
      type === 'avatar'
        ? 'bokbok/avatars'
        : type === 'id_document'
        ? 'bokbok/national_ids'
        : 'bokbok/receipts'

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

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image size must be under 5MB' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await uploadBuffer(buffer, folder)

    return NextResponse.json({
      success: true,
      url: result.secure_url || result.url,
      publicId: result.public_id,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload image' },
      { status: 500 }
    )
  }
}
