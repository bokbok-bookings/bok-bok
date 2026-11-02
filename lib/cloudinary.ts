import 'server-only'
import { v2 as cloudinary } from 'cloudinary'
import { optimizeCloudinaryUrl } from './cloudinary-client'

export * from './cloudinary-client'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const apiKey = process.env.CLOUDINARY_API_KEY || ''
const apiSecret = process.env.CLOUDINARY_API_SECRET || ''

export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret)

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export interface CloudinaryUploadResult {
  url: string
  secure_url: string
  public_id: string
  format: string
  bytes: number
  width?: number
  height?: number
}

export async function uploadBuffer(
  buffer: Buffer,
  folder = 'bokbok/uploads',
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: 'auto' | 'auto:good' | 'auto:eco'
  } = {}
): Promise<CloudinaryUploadResult> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 'auto:good' } = options

  if (!isCloudinaryConfigured) {
    // Graceful fallback for development before Cloudinary keys are supplied
    const base64 = buffer.toString('base64')
    const mime = 'image/jpeg'
    const dataUrl = `data:${mime};base64,${base64}`
    return {
      url: dataUrl,
      secure_url: dataUrl,
      public_id: `fallback_${Date.now()}`,
      format: 'jpg',
      bytes: buffer.length,
    }
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // High compression + automatic next-gen formatting upon upload
        transformation: [
          { width: maxWidth, height: maxHeight, crop: 'limit' },
          { quality },
          { fetch_format: 'auto' },
        ],
        // Strip unnecessary EXIF metadata to minimize byte weight
        flags: 'strip_profile',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'))
        } else {
          const compressedSecureUrl = optimizeCloudinaryUrl(result.secure_url, {
            quality,
          })
          resolve({
            url: compressedSecureUrl,
            secure_url: compressedSecureUrl,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          })
        }
      }
    )
    uploadStream.end(buffer)
  })
}

export async function uploadReceiptBuffer(buffer: Buffer): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/receipts', { maxWidth: 1600, quality: 'auto:good' })
}

export async function uploadAvatarBuffer(buffer: Buffer): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/avatars', { maxWidth: 800, maxHeight: 800, quality: 'auto:good' })
}

export default cloudinary
