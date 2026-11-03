import { NextResponse } from 'next/server'
import { uploadBuffer } from '@/lib/cloudinary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

function hasValidMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false
  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  // PNG: 89 50 4E 47
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }
  // GIF: 47 49 46 38
  if (mimeType === 'image/gif') {
    return (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    )
  }
  // WEBP: RIFF....WEBP
  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  // PDF: %PDF (25 50 44 46)
  if (mimeType === 'application/pdf') {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    )
  }
  return false
}

// TODO(security): Integrate malware scanning / CDR sanitization for uploaded receipts in production.
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
        { status: 400 },
      )
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only image files (JPEG, PNG, WebP, GIF) and PDFs are allowed' },
        { status: 400 },
      )
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be under 10MB' },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (!hasValidMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or corrupted file content' },
        { status: 400 },
      )
    }

    const result = await uploadBuffer(buffer, folder, {
      maxWidth,
      maxHeight,
      quality: 'auto:good',
      mimeType: file.type,
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
    console.error('Upload error:', error?.message || 'Unknown upload error')
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 },
    )
  }
}
