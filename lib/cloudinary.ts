import { v2 as cloudinary } from 'cloudinary'

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
}

export async function uploadBuffer(
  buffer: Buffer,
  folder = 'bokbok/uploads'
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured) {
    // Graceful fallback for development before user supplies Cloudinary keys:
    // Store as data URI so the application remains 100% testable
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
        resource_type: 'auto',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'))
        } else {
          resolve({
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
          })
        }
      }
    )
    uploadStream.end(buffer)
  })
}

export async function uploadReceiptBuffer(buffer: Buffer): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/receipts')
}

export async function uploadAvatarBuffer(buffer: Buffer): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/avatars')
}

export default cloudinary
