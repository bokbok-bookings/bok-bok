'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-client'
import { useLanguage } from '@/lib/i18n/language-context'

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
  fallbackType?: 'avatar' | 'receipt' | 'id_document' | 'certificate' | 'service_thumbnail' | 'general'
  allowPdf?: boolean
}

const VIEWPORT_SIZE = 320
const OUTPUT_SIZE = 600

export function CloudinaryUploadWidget({
  onSuccess,
  onError,
  folder = 'bokbok/uploads',
  cropping = false,
  croppingAspectRatio = 1,
  maxImageWidth = 1800,
  maxImageHeight = 1800,
  sources = ['local', 'camera', 'url'],
  buttonText = 'Upload Image',
  className = '',
  disabled = false,
  children,
  fallbackType = 'receipt',
  allowPdf = false,
}: CloudinaryUploadWidgetProps) {
  const { isAr } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Crop modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [isSavingCrop, setIsSavingCrop] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const viewportCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgElementRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close modal on Escape
  useEffect(() => {
    if (!isCropModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSavingCrop) {
        closeCropModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCropModalOpen, isSavingCrop])

  // Clamp pan so image never leaves transparent empty space inside crop area
  const clampPan = useCallback(
    (
      x: number,
      y: number,
      currentZoom: number,
      rot: number,
      size: { width: number; height: number }
    ) => {
      if (!size.width || !size.height) return { x: 0, y: 0 }
      const isSwapped = rot === 90 || rot === 270
      const effW = isSwapped ? size.height : size.width
      const effH = isSwapped ? size.width : size.height

      const baseScale = Math.max(VIEWPORT_SIZE / effW, VIEWPORT_SIZE / effH)
      const currentScale = baseScale * currentZoom
      const dispW = effW * currentScale
      const dispH = effH * currentScale

      const maxPanX = Math.max(0, (dispW - VIEWPORT_SIZE) / 2)
      const maxPanY = Math.max(0, (dispH - VIEWPORT_SIZE) / 2)

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, y)),
      }
    },
    []
  )

  // Render to both viewport and preview canvas whenever view parameters change
  const renderCanvases = useCallback(() => {
    if (!cropImageSrc || !imgElementRef.current || !imgElementRef.current.complete) return
    const img = imgElementRef.current
    if (!img.naturalWidth || !img.naturalHeight) return

    const isSwapped = rotation === 90 || rotation === 270
    const effW = isSwapped ? img.naturalHeight : img.naturalWidth
    const effH = isSwapped ? img.naturalWidth : img.naturalHeight
    const baseScale = Math.max(VIEWPORT_SIZE / effW, VIEWPORT_SIZE / effH)

    // 1. Draw Viewport Canvas
    const canvas = viewportCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)
        ctx.fillStyle = '#0a0f1d'
        ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)

        ctx.save()
        ctx.translate(VIEWPORT_SIZE / 2 + pan.x, VIEWPORT_SIZE / 2 + pan.y)
        ctx.rotate((rotation * Math.PI) / 180)
        const scale = baseScale * zoom
        ctx.scale(scale, scale)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
        ctx.restore()
      }
    }

    // 2. Draw Mini Preview Canvas (72x72)
    const pCanvas = previewCanvasRef.current
    if (pCanvas) {
      const pCtx = pCanvas.getContext('2d')
      if (pCtx) {
        const PREVIEW_SIZE = 72
        pCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
        pCtx.fillStyle = '#0a0f1d'
        pCtx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)

        const pFactor = PREVIEW_SIZE / VIEWPORT_SIZE
        pCtx.save()
        pCtx.translate(PREVIEW_SIZE / 2 + pan.x * pFactor, PREVIEW_SIZE / 2 + pan.y * pFactor)
        pCtx.rotate((rotation * Math.PI) / 180)
        const pScale = baseScale * zoom * pFactor
        pCtx.scale(pScale, pScale)
        pCtx.imageSmoothingEnabled = true
        pCtx.imageSmoothingQuality = 'high'
        pCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
        pCtx.restore()
      }
    }
  }, [cropImageSrc, rotation, zoom, pan])

  useEffect(() => {
    renderCanvases()
  }, [renderCanvases])

  const openPicker = () => {
    if (disabled || isUploading || isSavingCrop) return
    fileInputRef.current?.click()
  }

  const closeCropModal = () => {
    setIsCropModalOpen(false)
    setCropImageSrc(null)
    setCropFile(null)
    setCropError(null)
    setIsSavingCrop(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (cropping) {
      // Interactive Crop Workflow
      if (!file.type.startsWith('image/')) {
        const errMsg = isAr ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file'
        alert(errMsg)
        onError?.(new Error(errMsg))
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const resultUrl = reader.result as string
        const img = new Image()
        img.onload = () => {
          imgElementRef.current = img
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
          setZoom(1.0)
          setPan({ x: 0, y: 0 })
          setRotation(0)
          setCropFile(file)
          setCropImageSrc(resultUrl)
          setCropError(null)
          setIsCropModalOpen(true)
        }
        img.src = resultUrl
      }
      reader.readAsDataURL(file)
      return
    }

    // Direct Upload Workflow (cropping === false)
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
        throw new Error(data.error || 'Failed to upload file')
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      onError?.(err)
      alert(err.message || 'Error uploading file')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Pointer drag events for panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setStartPan({ ...pan })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault()
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    const targetX = startPan.x + dx
    const targetY = startPan.y + dy
    setPan(clampPan(targetX, targetY, zoom, rotation, naturalSize))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch { }
  }

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    const nextZoom = Math.max(1.0, Math.min(3.0, Number((zoom + delta).toFixed(2))))
    setZoom(nextZoom)
    setPan((prev) => clampPan(prev.x, prev.y, nextZoom, rotation, naturalSize))
  }

  // Zoom slider change
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(1.0, Math.min(3.0, newZoom))
    setZoom(clamped)
    setPan((prev) => clampPan(prev.x, prev.y, clamped, rotation, naturalSize))
  }

  // Rotate 90 degrees
  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360
    setRotation(nextRot)
    setPan({ x: 0, y: 0 })
  }

  // Reset
  const handleReset = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
    setRotation(0)
  }

  // Perform final high-res crop and upload
  const handleCropAndSave = async () => {
    const img = imgElementRef.current
    if (!img || !img.naturalWidth || !img.naturalHeight) return

    setIsSavingCrop(true)
    setCropError(null)

    try {
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = OUTPUT_SIZE
      exportCanvas.height = OUTPUT_SIZE
      const ctx = exportCanvas.getContext('2d')
      if (!ctx) throw new Error('Could not initialize canvas context')

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const isSwapped = rotation === 90 || rotation === 270
      const effW = isSwapped ? img.naturalHeight : img.naturalWidth
      const effH = isSwapped ? img.naturalWidth : img.naturalHeight
      const baseScale = Math.max(VIEWPORT_SIZE / effW, VIEWPORT_SIZE / effH)

      const factor = OUTPUT_SIZE / VIEWPORT_SIZE
      ctx.save()
      ctx.translate(OUTPUT_SIZE / 2 + pan.x * factor, OUTPUT_SIZE / 2 + pan.y * factor)
      ctx.rotate((rotation * Math.PI) / 180)
      const scale = baseScale * zoom * factor
      ctx.scale(scale, scale)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      ctx.restore()

      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, 'image/jpeg', 0.92)
      })

      if (!blob) throw new Error('Could not generate cropped image blob')

      const originalBaseName = (cropFile?.name || 'avatar.jpg').replace(/\.[^.]+$/, '')
      const fileName = `${originalBaseName}-crop.jpg`
      const fileToUpload = new File([blob], fileName, { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', fileToUpload)

      const res = await fetch(`/api/upload?type=${fallbackType}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Failed to upload cropped photo')
      }

      const optimized = optimizeCloudinaryUrl(data.url)
      onSuccess({
        url: optimized,
        secureUrl: optimized,
        publicId: data.publicId,
        format: data.format,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        originalFilename: fileName,
      })

      closeCropModal()
    } catch (err: any) {
      console.error('Crop and save error:', err)
      setCropError(err.message || (isAr ? 'حدث خطأ أثناء حفظ الصورة' : 'Error saving cropped image'))
      onError?.(err)
    } finally {
      setIsSavingCrop(false)
    }
  }

  // Interactive Crop Modal Element
  const modalContent = isCropModalOpen && mounted ? (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="relative flex w-full max-w-md flex-col rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-primary">
              {isAr ? 'تعديل وقص الصورة الشخصية' : 'Crop & Position Photo'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isAr
                ? 'اسحب الصورة لتحديد الموضع واستخدم شريط التكبير لضبط الحجم'
                : 'Drag to reposition, use slider to zoom for perfect circle'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCropModal}
            disabled={isSavingCrop}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary transition disabled:opacity-50"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Viewport Canvas & Crop Guide */}
        <div className="relative mt-4 flex justify-center">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, touchAction: 'none' }}
            className={`relative overflow-hidden rounded-2xl bg-neutral-950 select-none shadow-inner border border-neutral-800 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
          >
            {/* Main Interactive Canvas */}
            <canvas
              ref={viewportCanvasRef}
              width={VIEWPORT_SIZE}
              height={VIEWPORT_SIZE}
              className="size-full block"
            />

            {/* SVG Mask & Circular Guide Overlay */}
            <svg
              className="pointer-events-none absolute inset-0 size-full"
              viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
            >
              <defs>
                <mask id="avatar-crop-cutout">
                  <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill="white" />
                  <circle
                    cx={VIEWPORT_SIZE / 2}
                    cy={VIEWPORT_SIZE / 2}
                    r={VIEWPORT_SIZE / 2 - 8}
                    fill="black"
                  />
                </mask>
              </defs>

              {/* Darkened mask outside the circle */}
              <rect
                width={VIEWPORT_SIZE}
                height={VIEWPORT_SIZE}
                fill="rgba(10, 15, 29, 0.65)"
                mask="url(#avatar-crop-cutout)"
              />

              {/* Circle outline */}
              <circle
                cx={VIEWPORT_SIZE / 2}
                cy={VIEWPORT_SIZE / 2}
                r={VIEWPORT_SIZE / 2 - 8}
                fill="none"
                stroke="#FCAD35"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="opacity-90"
              />

              {/* Subtle rule-of-thirds grid inside the circle */}
              <g opacity="0.18" stroke="#FFFFFF" strokeWidth="1">
                <line
                  x1={VIEWPORT_SIZE * 0.35}
                  y1={VIEWPORT_SIZE * 0.15}
                  x2={VIEWPORT_SIZE * 0.35}
                  y2={VIEWPORT_SIZE * 0.85}
                  strokeDasharray="2 3"
                />
                <line
                  x1={VIEWPORT_SIZE * 0.65}
                  y1={VIEWPORT_SIZE * 0.15}
                  x2={VIEWPORT_SIZE * 0.65}
                  y2={VIEWPORT_SIZE * 0.85}
                  strokeDasharray="2 3"
                />
                <line
                  x1={VIEWPORT_SIZE * 0.15}
                  y1={VIEWPORT_SIZE * 0.35}
                  x2={VIEWPORT_SIZE * 0.85}
                  y2={VIEWPORT_SIZE * 0.35}
                  strokeDasharray="2 3"
                />
                <line
                  x1={VIEWPORT_SIZE * 0.15}
                  y1={VIEWPORT_SIZE * 0.65}
                  x2={VIEWPORT_SIZE * 0.85}
                  y2={VIEWPORT_SIZE * 0.65}
                  strokeDasharray="2 3"
                />
              </g>
            </svg>
          </div>
        </div>

        {/* Controls Bar: Zoom Slider + Live Preview Badge */}
        <div className="mt-4 space-y-3">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.1)}
              disabled={zoom <= 1.0 || isSavingCrop}
              aria-label="Zoom Out"
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/50 text-xs font-bold text-primary hover:bg-muted disabled:opacity-40 transition"
            >
              -
            </button>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                disabled={isSavingCrop}
                aria-label="Zoom slider"
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#14243b] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.1)}
              disabled={zoom >= 3.0 || isSavingCrop}
              aria-label="Zoom In"
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/50 text-xs font-bold text-primary hover:bg-muted disabled:opacity-40 transition"
            >
              +
            </button>
            <span className="w-11 text-center text-[11px] font-bold text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Quick Tools & Live Preview */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-2.5">
            {/* Buttons: Rotate & Reset & Change */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleRotate}
                disabled={isSavingCrop}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-muted transition"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isAr ? 'تدوير' : 'Rotate'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isSavingCrop}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-muted transition"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2m0 0l-3-3m3 3l3-3" />
                </svg>
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSavingCrop}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary hover:bg-muted transition"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{isAr ? 'صورة أخرى' : 'Change'}</span>
              </button>
            </div>

            {/* Live circular avatar preview */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground hidden sm:inline">
                {isAr ? 'المعاينة:' : 'Preview:'}
              </span>
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full border-2 border-[#FCAD35] shadow-sm bg-neutral-900">
                <canvas
                  ref={previewCanvasRef}
                  width={72}
                  height={72}
                  className="size-full block"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error notice if saving fails */}
        {cropError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
            {cropError}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-border pt-4">
          <button
            type="button"
            onClick={closeCropModal}
            disabled={isSavingCrop}
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-primary transition disabled:opacity-50"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleCropAndSave}
            disabled={isSavingCrop}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14243b] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1f3654] transition disabled:opacity-50"
          >
            {isSavingCrop ? (
              <>
                <svg className="size-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <svg className="size-3.5 text-[#FCAD35]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{isAr ? 'قص وحفظ الصورة' : 'Crop & Save'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={
          cropping
            ? 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/avif'
            : allowPdf
              ? 'image/*,application/pdf'
              : 'image/*'
        }
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading || isSavingCrop}
      />

      {/* Trigger element (custom children or default button) */}
      {children ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          className={className}
        >
          {children}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || isUploading || isSavingCrop}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-[#14243b] shadow-sm transition-all hover:border-[#14243b] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
          {isUploading ? (
            <>
              <svg className="size-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>{isAr ? 'جاري الرفع...' : 'Uploading...'}</span>
            </>
          ) : (
            <>
              <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{buttonText}</span>
            </>
          )}
        </button>
      )}

      {/* Portal Crop Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  )
}
