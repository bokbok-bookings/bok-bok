import dns from 'dns'
import https from 'https'
import { v2 as cloudinary } from 'cloudinary'

// Prefer IPv4 DNS resolution to prevent 10-15s IPv6 AAAA lookup timeouts on Windows/ISP routers
try {
  dns.setDefaultResultOrder('ipv4first')
  https.globalAgent.options.family = 4
} catch (_e) {
  // Ignore if unsupported in current runtime
}

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
    timeout: 120000,
  })
}

export interface CloudinaryUploadResult {
  url: string
  secure_url: string
  public_id: string
  format: string
  bytes: number
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

async function uploadToCloudinaryOnce(
  dataUri: string,
  folder: string
): Promise<CloudinaryUploadResult> {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'auto',
    timeout: 120000,
  })
  return {
    url: result.url,
    secure_url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    bytes: result.bytes,
  }
}

export async function uploadBuffer(
  buffer: Buffer,
  folder = 'bokbok/uploads',
  mimeType = 'image/jpeg'
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured) {
    // Graceful fallback for development before user supplies Cloudinary keys:
    // Store as data URI so the application remains 100% testable
    return buildDataUriFallback(buffer, mimeType)
  }

  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`
  const maxAttempts = 2

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await uploadToCloudinaryOnce(dataUri, folder)
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
          'Cloudinary upload timed out after retry; falling back to inline data URI so upload succeeds.'
        )
        return buildDataUriFallback(buffer, mimeType)
      }

      throw err
    }
  }

  return buildDataUriFallback(buffer, mimeType)
}

export async function uploadReceiptBuffer(buffer: Buffer, mimeType = 'image/jpeg'): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/receipts', mimeType)
}

export async function uploadAvatarBuffer(buffer: Buffer, mimeType = 'image/jpeg'): Promise<CloudinaryUploadResult> {
  return uploadBuffer(buffer, 'bokbok/avatars', mimeType)
}

export default cloudinary
