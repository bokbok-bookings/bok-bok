import 'server-only'
import dns from 'dns'
import https from 'https'
import { v2 as cloudinary } from 'cloudinary'
import { optimizeCloudinaryUrl } from './cloudinary-client'

export * from './cloudinary-client'

// Prefer IPv4 DNS resolution to prevent 10-15s IPv6 AAAA lookup timeouts on Windows/ISP routers
try {
  dns.setDefaultResultOrder('ipv4first')
  https.globalAgent.options.family = 4
} catch (_e) {
  // Ignore if unsupported in current runtime
}

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const apiKey = process.env.CLOUDINARY_API_KEY || ''
const apiSecret = process.env.CLOUDINARY_API_SECRET || ''

export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret)

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
    timeout: 120000,
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

export interface UploadBufferOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: 'auto' | 'auto:good' | 'auto:eco'
  mimeType?: string
}

function buildDataUriFallback(buffer: Buffer, mimeType = 'image/jpeg'): CloudinaryUploadResult {
  const base64 = buffer.toString('base64')
  const ext = mimeType.split('/')[1] || 'jpg'
  const dataUrl = `data:${mimeType};base64,${base64}`
  return {
    url: dataUrl,
    secure_url: dataUrl,
    public_id: `fallback_${Date.now()}`,
    format: ext,
    bytes: buffer.length,
  }
}

function streamUploadOnce(
  buffer: Buffer,
  folder: string,
  options: Required<Pick<UploadBufferOptions, 'maxWidth' | 'maxHeight' | 'quality' | 'mimeType'>>,
): Promise<CloudinaryUploadResult> {
  const { maxWidth, maxHeight, quality, mimeType } = options
  const isPdf = mimeType === 'application/pdf'

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      isPdf
        ? {
            folder,
            resource_type: 'auto',
            timeout: 120000,
          }
        : {
            folder,
            resource_type: 'image',
            timeout: 120000,
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
          const finalSecureUrl = isPdf
            ? result.secure_url
            : optimizeCloudinaryUrl(result.secure_url, { quality })
          resolve({
            url: finalSecureUrl,
            secure_url: finalSecureUrl,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          })
        }
      },
    )
    uploadStream.end(buffer)
  })
}

export async function uploadBuffer(
  buffer: Buffer,
  folder = 'bokbok/uploads',
  optionsOrMimeType: string | UploadBufferOptions = {},
): Promise<CloudinaryUploadResult> {
  const normalizedOptions =
    typeof optionsOrMimeType === 'string'
      ? { mimeType: optionsOrMimeType }
      : optionsOrMimeType || {}

  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 'auto:good',
    mimeType = 'image/jpeg',
  } = normalizedOptions

  if (!isCloudinaryConfigured) {
    // Graceful fallback for development before Cloudinary keys are supplied
    return buildDataUriFallback(buffer, mimeType)
  }

  const maxAttempts = 2
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await streamUploadOnce(buffer, folder, {
        maxWidth,
        maxHeight,
        quality,
        mimeType,
      })
    } catch (err: any) {
      const isTimeoutOrNetwork =
        err?.name === 'TimeoutError' ||
        err?.http_code === 499 ||
        err?.error?.http_code === 499 ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ENOTFOUND' ||
        err?.message?.includes('Timeout') ||
        err?.message?.includes('timeout')

      if (isTimeoutOrNetwork && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400))
        continue
      }

      if (isTimeoutOrNetwork) {
        console.warn(
          'Cloudinary upload timed out after retry; falling back to inline data URI so upload succeeds.',
        )
        return buildDataUriFallback(buffer, mimeType)
      }

      throw err
    }
  }

  return buildDataUriFallback(buffer, mimeType)
}

export async function uploadReceiptBuffer(
  buffer: Buffer,
  mimeType = 'image/jpeg',
): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/receipts', {
    maxWidth: 1600,
    quality: 'auto:good',
    mimeType,
  })
}

export async function uploadAvatarBuffer(
  buffer: Buffer,
  mimeType = 'image/jpeg',
): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/avatars', {
    maxWidth: 800,
    maxHeight: 800,
    quality: 'auto:good',
    mimeType,
  })
}

export default cloudinary
