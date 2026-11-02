'use client'

import React, { useEffect, useRef, useState } from 'react'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-client'

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, any>,
        callback: (error: any, result: any) => void
      ) => {
        open: () => void
        close: () => void
        destroy: () => void
      }
    }
  }
}

export interface CloudinaryUploadSuccess {
  url: string
  secureUrl: string
  publicId: string
  format?: string
  bytes?: number
  width?: number
  height?: number
  originalFilename?: string
}

export interface CloudinaryUploadWidgetProps {
  onSuccess: (result: CloudinaryUploadSuccess) => void
  onError?: (error: any) => void
  folder?: string
  cropping?: boolean
  croppingAspectRatio?: number
  maxImageWidth?: number
  maxImageHeight?: number
  sources?: ('local' | 'camera' | 'url')[]
  buttonText?: string
  className?: string
  disabled?: boolean
  children?: React.ReactNode
  fallbackType?: 'avatar' | 'receipt' | 'id_document' | 'general'
}

export function CloudinaryUploadWidget({
  onSuccess,
  onError,
  folder = 'bokbok/uploads',
  cropping = false,
  croppingAspectRatio,
  maxImageWidth = 1800,
  maxImageHeight = 1800,
  sources = ['local', 'camera', 'url'],
  buttonText = 'Upload Image',
  className = '',
  disabled = false,
  children,
  fallbackType = 'receipt',
}: CloudinaryUploadWidgetProps) {
  const [widgetReady, setWidgetReady] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const widgetRef = useRef<any>(null)

  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'tqcuwb96'
  const uploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  // Load Cloudinary Widget script once
  useEffect(() => {
    if (window.cloudinary) {
      setWidgetReady(true)
      return
    }

    const scriptId = 'cloudinary-upload-widget-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://upload-widget.cloudinary.com/latest/global/all.js'
      script.async = true
      script.onload = () => setWidgetReady(true)
      script.onerror = () => {
        console.warn('Cloudinary widget script failed to load. Will fallback to direct upload.')
      }
      document.body.appendChild(script)
    } else {
      script.addEventListener('load', () => setWidgetReady(true))
    }
  }, [])

  const openWidget = () => {
    if (disabled || isUploading) return

    // If widget script is loaded on window, open official Cloudinary modal
    if (window.cloudinary) {
      try {
        const widget = window.cloudinary.createUploadWidget(
          {
            cloudName,
            uploadPreset,
            folder,
            sources,
            multiple: false,
            maxFiles: 1,
            clientAllowedFormats: ['png', 'jpeg', 'jpg', 'webp', 'heic', 'avif'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            // High compression constraints on upload:
            maxImageWidth,
            maxImageHeight,
            // Cropping options:
            cropping,
            croppingAspectRatio,
            croppingShowDimensions: true,
            showSkipCropButton: true,
            // Automatic compression & format transformation:
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
            // Custom branding palette matching BokBok
            styles: {
              palette: {
                window: '#FFFFFF',
                windowBorder: '#E6E4DF',
                tabIcon: '#ef5b4c',
                menuIcons: '#14243b',
                textDark: '#14243b',
                textLight: '#FFFFFF',
                link: '#ef5b4c',
                action: '#ef5b4c',
                inactiveTabIcon: '#8b94a1',
                error: '#ef4444',
                inProgress: '#ef5b4c',
                complete: '#10b981',
                sourceBg: '#FAF8F5',
              },
            },
          },
          (error: any, result: any) => {
            if (error) {
              console.error('Cloudinary widget error:', error)
              onError?.(error)
              return
            }

            if (result && result.event === 'success') {
              const info = result.info
              // Ensure delivery URL is compressed with f_auto,q_auto
              const compressedUrl = optimizeCloudinaryUrl(info.secure_url || info.url)
              onSuccess({
                url: compressedUrl,
                secureUrl: compressedUrl,
                publicId: info.public_id,
                format: info.format,
                bytes: info.bytes,
                width: info.width,
                height: info.height,
                originalFilename: info.original_filename,
              })
            }
          }
        )
        widgetRef.current = widget
        widget.open()
        return
      } catch (err) {
        console.error('Failed to initialize Cloudinary widget:', err)
      }
    }

    // Fallback: If widget script was blocked by adblocker or not yet loaded, trigger native input
    fallbackInputRef.current?.click()
  }

  // Handle fallback file upload via /api/upload
  const handleFallbackFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/upload?type=${fallbackType}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success && data.url) {
        const compressedUrl = optimizeCloudinaryUrl(data.url)
        onSuccess({
          url: compressedUrl,
          secureUrl: compressedUrl,
          publicId: data.publicId,
          format: data.format,
          bytes: data.bytes,
          width: data.width,
          height: data.height,
          originalFilename: file.name,
        })
      } else {
        throw new Error(data.error || 'Failed to upload image')
      }
    } catch (err: any) {
      console.error('Direct fallback upload error:', err)
      onError?.(err)
      alert(err.message || 'Error uploading image')
    } finally {
      setIsUploading(false)
      if (fallbackInputRef.current) {
        fallbackInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      {/* Hidden file input for fallback */}
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFallbackFileChange}
        disabled={disabled || isUploading}
      />

      {children ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openWidget}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openWidget()
            }
          }}
          className={className}
        >
          {children}
        </div>
      ) : (
        <button
          type="button"
          onClick={openWidget}
          disabled={disabled || isUploading}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-[#14243b] shadow-sm transition-all hover:border-[#14243b] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
          {isUploading ? (
            <>
              <svg className="size-4 animate-spin text-[#ef5b4c]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg className="size-4 text-[#ef5b4c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{buttonText}</span>
            </>
          )}
        </button>
      )}
    </>
  )
}
