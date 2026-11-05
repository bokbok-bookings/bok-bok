export interface OptimizeUrlOptions {
  width?: number
  height?: number
  crop?: 'limit' | 'fill' | 'thumb' | 'fit' | 'scale'
  gravity?: 'face' | 'auto' | 'center'
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
}

/**
 * Client-safe Cloudinary URL optimizer.
 * Injects on-the-fly transformations into an image URL to ensure:
 * 1. Automatic format conversion (f_auto -> AVIF / WebP based on user browser)
 * 2. Automatic perceptual compression (q_auto:good -> cuts file size 60-80% without visual loss)
 * 3. Max dimension limits (c_limit) so huge photos don't lag page loads
 * 4. Strips camera EXIF metadata (fl_strip_profile)
 */
export function optimizeCloudinaryUrl(url?: string, options: OptimizeUrlOptions = {}): string {
  if (!url || typeof url !== 'string') return ''
  if (!url.includes('cloudinary.com') || !url.includes('/image/upload/')) {
    return url
  }

  // Preserve custom crop coordinates if already present in URL
  const hasExistingCrop = url.includes('c_crop')

  const {
    width,
    height,
    crop = hasExistingCrop ? undefined : (width && height ? 'limit' : 'limit'),
    gravity,
    quality = 'auto:good',
    format = 'auto',
  } = options

  const transforms: string[] = [`f_${format}`, `q_${quality}`]
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (crop) transforms.push(`c_${crop}`)
  if (gravity) transforms.push(`g_${gravity}`)
  transforms.push('fl_strip_profile')

  const transformString = transforms.join(',')

  // Case 1: URL with existing transformation: /image/upload/<existing_transforms>/v1234/
  const regexWithTransform = /(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:([a-z0-9_,-]+)\/)?(v\d+\/.*)/
  const match = url.match(regexWithTransform)
  if (match) {
    const existingTransforms = match[2]
    if (existingTransforms && existingTransforms.includes('c_crop')) {
      // Preserve existing crop and add format/quality
      return `${match[1]}${existingTransforms},f_${format},q_${quality},fl_strip_profile/${match[3]}`
    }
    return `${match[1]}${transformString}/${match[3]}`
  }

  // Case 2: URL without version: /image/upload/<path>
  const regexDirect = /(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/
  const directMatch = url.match(regexDirect)
  if (directMatch) {
    return `${directMatch[1]}${transformString}/${directMatch[2]}`
  }

  return url
}

/**
 * Returns optimized avatar URL with smart face detection and tight compression.
 */
export function getOptimizedAvatarUrl(url?: string, size = 400): string {
  return optimizeCloudinaryUrl(url, {
    width: size,
    height: size,
    crop: 'thumb',
    gravity: 'face',
    quality: 'auto:good',
  })
}

/**
 * Returns optimized receipt URL with limit compression for fast review.
 */
export function getOptimizedReceiptUrl(url?: string, maxWidth = 1600): string {
  return optimizeCloudinaryUrl(url, {
    width: maxWidth,
    crop: 'limit',
    quality: 'auto:good',
  })
}
