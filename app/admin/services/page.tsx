'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { CloudinaryUploadWidget } from '@/components/ui/cloudinary-upload-widget'

interface ServiceItem {
  _id: string
  expertId: string
  expertName?: string
  expertRole?: string
  expertSlug?: string
  expertImage?: string
  slug?: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  thumbnailUrl?: string
  intendedAudience?: { en: string; ar: string }
  adultsOnly?: boolean
  minimumAge?: number
  categorySlug?: string
  subcategorySlug?: string
  categoryLabel?: string
  subcategoryLabel?: string
  isMvpTaxonomyValid?: boolean
  excludedPolicyViolation?: string | null
  isStructuredVocationalProgramme?: boolean
  requiresLicensingReview?: boolean
  licensingReviewStatus?:
  | 'not_required'
  | 'pending_licensing_review'
  | 'licensing_approved'
  | 'licensing_rejected'
  licensingReviewReason?: string
  hasVerifiedAccreditationAuthorization?: boolean
  adminReviewNote?: string
  bookingType?: 'APPOINTMENT' | 'WORKSHOP' | 'WEBINAR'
  serviceKind?: 'CONSULTATION' | 'GENERAL_SERVICE'
  deliveryMode?: 'ONLINE' | 'IN_PERSON' | 'HYBRID'
  location?: {
    address?: string
    city?: string
    googleMapsUrl?: string
    meetingInstructions?: string
  }
  event?: {
    startDate?: string
    date?: string
    capacity?: number
    enrolledCount?: number
    registeredCount?: number
  }
  tags?: string[]
  durationMinutes: number
  breakAfterMinutes: number
  pricing: {
    baseCurrency: string
    prices: Record<string, number>
  }
  isActive?: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  createdAt: string
}

export default function AdminServicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  )

  // Edit Service Modal
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [editServiceTitleEn, setEditServiceTitleEn] = useState('')
  const [editServiceTitleAr, setEditServiceTitleAr] = useState('')
  const [editServiceDescEn, setEditServiceDescEn] = useState('')
  const [editServiceDescAr, setEditServiceDescAr] = useState('')
  const [editServiceThumbnailUrl, setEditServiceThumbnailUrl] = useState('')
  const [editServicePrice, setEditServicePrice] = useState(0)
  const [editServiceDuration, setEditServiceDuration] = useState(30)
  const [editServiceKind, setEditServiceKind] = useState<'CONSULTATION' | 'GENERAL_SERVICE'>(
    'CONSULTATION'
  )
  const [editServiceBookingType, setEditServiceBookingType] = useState<
    'APPOINTMENT' | 'WORKSHOP' | 'WEBINAR'
  >('APPOINTMENT')
  const [editServiceApproval, setEditServiceApproval] = useState<
    'pending' | 'approved' | 'rejected'
  >('pending')
  const [editServiceActive, setEditServiceActive] = useState(true)
  const [savingService, setSavingService] = useState(false)
  const [editServiceFeedback, setEditServiceFeedback] = useState('')

  const loadServices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/services')
      const json = await res.json()
      if (json.success) {
        setServices(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load services:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  const handleServiceAction = async (
    serviceId: string,
    action: 'approve' | 'reject' | 'unpublish' | 'approve_licensing' | 'reject_licensing'
  ) => {
    let rejectionReason = ''
    let adminReviewNote = ''
    if (action === 'reject' || action === 'reject_licensing') {
      const reason = prompt('Rejection reason for this offering:')
      if (reason === null) return
      rejectionReason = reason
    } else if (action === 'unpublish') {
      const note = prompt(
        'Admin note for unpublishing this offering for review:',
        'Unpublished for MVP taxonomy/scope review.'
      )
      if (note === null) return
      adminReviewNote = note
    } else if (action === 'approve_licensing') {
      if (!confirm('Approve separate vocational/licensing review for this programme?')) return
    } else {
      if (!confirm('Approve this offering and publish it to the marketplace?')) return
    }

    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, action, rejectionReason, adminReviewNote }),
      })
      const json = await res.json()
      if (json.success) {
        await loadServices()
        router.refresh()
      } else {
        alert(json.error || 'Failed to update service')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating service')
    }
  }

  const handleOpenEditService = (srv: ServiceItem) => {
    setEditingService(srv)
    setEditServiceTitleEn(srv.title?.en || '')
    setEditServiceTitleAr(srv.title?.ar || '')
    setEditServiceDescEn(srv.description?.en || '')
    setEditServiceDescAr(srv.description?.ar || '')
    setEditServiceThumbnailUrl(srv.thumbnailUrl || '')
    const baseCur = srv.pricing?.baseCurrency || 'EGP'
    setEditServicePrice(srv.pricing?.prices?.[baseCur] ?? srv.pricing?.prices?.EGP ?? 0)
    setEditServiceDuration(srv.durationMinutes || 30)
    setEditServiceKind(srv.serviceKind || 'CONSULTATION')
    setEditServiceBookingType(srv.bookingType || 'APPOINTMENT')
    setEditServiceApproval(srv.approvalStatus || 'pending')
    setEditServiceActive(srv.isActive !== false)
    setEditServiceFeedback('')
  }

  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingService) return
    setSavingService(true)
    setEditServiceFeedback('')
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: editingService._id,
          action: 'edit',
          updates: {
            title: { en: editServiceTitleEn.trim(), ar: editServiceTitleAr.trim() },
            description: { en: editServiceDescEn.trim(), ar: editServiceDescAr.trim() },
            thumbnailUrl: editServiceThumbnailUrl.trim() || null,
            priceNumber: Number(editServicePrice) || 0,
            durationMinutes: Number(editServiceDuration) || 30,
            serviceKind: editServiceKind,
            bookingType: editServiceBookingType,
            approvalStatus: editServiceApproval,
            isActive: editServiceActive,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        setServices((prev) =>
          prev.map((s) =>
            s._id === editingService._id
              ? {
                ...s,
                title: { en: editServiceTitleEn.trim(), ar: editServiceTitleAr.trim() },
                description: { en: editServiceDescEn.trim(), ar: editServiceDescAr.trim() },
                thumbnailUrl: editServiceThumbnailUrl.trim() || undefined,
                durationMinutes: Number(editServiceDuration) || 30,
                serviceKind: editServiceKind,
                bookingType: editServiceBookingType,
                approvalStatus: editServiceApproval,
                isActive: editServiceActive,
                pricing: {
                  ...s.pricing,
                  baseCurrency: s.pricing?.baseCurrency || 'EGP',
                  prices: {
                    ...(s.pricing?.prices || {}),
                    [s.pricing?.baseCurrency || 'EGP']: Number(editServicePrice) || 0,
                  },
                },
              }
              : s
          )
        )
        setEditingService(null)
        router.refresh()
      } else {
        setEditServiceFeedback(json.error || 'Failed to update service')
      }
    } catch (err: any) {
      setEditServiceFeedback(err.message || 'Error updating service')
    } finally {
      setSavingService(false)
    }
  }

  const handleDeleteService = async (srv: ServiceItem) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete service "${srv.title?.en}"? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/admin/services?serviceId=${srv._id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setServices((prev) => prev.filter((s) => s._id !== srv._id))
        router.refresh()
      } else {
        alert(json.error || 'Failed to delete service')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting service')
    }
  }

  const pendingCount = services.filter((s) => s.approvalStatus === 'pending').length
  const filteredServices =
    statusFilter === 'all'
      ? services
      : services.filter((s) => (s.approvalStatus || 'pending') === statusFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeeae4] pb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Marketplace Offerings
          </span>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
            Offers &amp; Licensing Review
          </h1>
          <p className="text-xs text-[#637084] mt-0.5">
            Review, approve, edit, or unpublish Consultations, Workshops, and Webinars across the marketplace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-[#dedbd5] bg-white p-1">
            {[
              { id: 'all', label: `All (${services.length})` },
              { id: 'pending', label: `Pending (${pendingCount})` },
              {
                id: 'approved',
                label: `Approved (${services.filter((s) => s.approvalStatus === 'approved').length})`,
              },
              {
                id: 'rejected',
                label: `Rejected (${services.filter((s) => s.approvalStatus === 'rejected').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${statusFilter === tab.id
                  ? 'bg-[#14243b] text-white'
                  : 'text-[#637084] hover:text-[#14243b]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadServices()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Loading Offers...
            </p>
          </div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-3xl border border-[#e7e2da] bg-white p-12 text-center shadow-xs">
          <p className="text-base font-bold text-[#14243b]">No Matching Offers Found</p>
          <p className="mt-1 text-xs text-[#637084]">
            No service offerings match the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((srv) => {
            const bType = srv.bookingType || 'APPOINTMENT'
            const sKind = srv.serviceKind || 'CONSULTATION'
            const dMode = srv.deliveryMode || 'ONLINE'

            let typeLabel = 'Consultation'
            let typeColor = 'bg-blue-50 text-blue-700 border border-blue-200'
            if (bType === 'APPOINTMENT') {
              typeLabel =
                sKind === 'GENERAL_SERVICE' ? 'General Service (Outside MVP)' : 'Consultation'
              typeColor =
                sKind === 'GENERAL_SERVICE'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
            } else if (bType === 'WORKSHOP') {
              typeLabel = 'Workshop'
              typeColor = 'bg-purple-50 text-purple-700 border border-purple-200'
            } else if (bType === 'WEBINAR') {
              typeLabel = 'Webinar'
              typeColor = 'bg-amber-50 text-amber-800 border border-amber-200'
            }

            return (
              <div
                key={srv._id}
                className={`rounded-2xl border bg-white p-5 sm:p-6 space-y-3 shadow-xs ${srv.approvalStatus === 'pending'
                  ? 'border-amber-300 bg-amber-50/20'
                  : srv.approvalStatus === 'rejected'
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-[#e7e2da]'
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                    <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-[#e7e2da] bg-gradient-to-br from-[#101F49] via-[#1c3575] to-[#2855C5]">
                      {srv.thumbnailUrl ? (
                        <img
                          src={srv.thumbnailUrl}
                          alt={srv.title.en}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-white/75">
                          <ImageIcon size={18} className="text-[#F8C15C] mb-1" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">No Thumbnail</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{srv.title.en}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${typeColor}`}>
                          {typeLabel}
                        </span>
                        <span className="rounded-full bg-neutral-100 border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {dMode === 'ONLINE'
                            ? '🌐 Online'
                            : dMode === 'IN_PERSON'
                              ? '📍 In-Person'
                              : '🔄 Hybrid'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${srv.approvalStatus === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : srv.approvalStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                        >
                          {srv.approvalStatus === 'pending'
                            ? 'Pending Admin Review'
                            : srv.approvalStatus || 'pending'}
                        </span>
                        {!srv.isActive && (
                          <span className="rounded-full bg-neutral-100 border border-border px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Unpublished / Inactive
                          </span>
                        )}
                        {srv.requiresLicensingReview && (
                          <span className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                            {srv.licensingReviewStatus === 'licensing_approved'
                              ? '✓ Licensing Review Approved'
                              : srv.licensingReviewStatus === 'licensing_rejected'
                                ? '✕ Licensing Review Rejected'
                                : '⚠ Separate Licensing Review Required'}
                          </span>
                        )}
                        {srv.isMvpTaxonomyValid === false && (
                          <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                            ⚠ Outside Approved MVP Taxonomy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium" dir="rtl">
                        {srv.title.ar}
                      </p>

                      <p className="text-xs text-muted-foreground pt-1">
                        Expert: <strong className="text-foreground">{srv.expertName}</strong> • Category:{' '}
                        <strong className="text-primary">
                          {srv.categoryLabel || srv.categorySlug || 'None'} /{' '}
                          {srv.subcategoryLabel || srv.subcategorySlug || 'None'}
                        </strong>
                        {bType === 'APPOINTMENT' ? (
                          <>
                            {' '}
                            • {srv.durationMinutes} min session{' '}
                            {srv.breakAfterMinutes ? `(${srv.breakAfterMinutes}m break)` : ''}
                          </>
                        ) : (
                          <>
                            {' '}
                            • {srv.event?.date || srv.event?.startDate || 'Date TBD'} •{' '}
                            {srv.event?.registeredCount || srv.event?.enrolledCount || 0} /{' '}
                            {srv.event?.capacity || 0} seats booked
                          </>
                        )}
                      </p>

                      {srv.intendedAudience?.en && (
                        <p className="text-xs text-muted-foreground">
                          Intended Audience:{' '}
                          <strong className="text-foreground">{srv.intendedAudience.en}</strong>
                          {srv.intendedAudience.ar ? ` (${srv.intendedAudience.ar})` : ''}
                        </p>
                      )}

                      {srv.adminReviewNote && (
                        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                          <strong>Review Scope Note:</strong> {srv.adminReviewNote}
                        </p>
                      )}

                      {srv.excludedPolicyViolation && (
                        <p className="text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                          <strong>Excluded Service Alert:</strong> {srv.excludedPolicyViolation}
                        </p>
                      )}

                      <p className="text-xs font-mono text-muted-foreground font-semibold">
                        Pricing: {srv.pricing?.prices?.EGP ?? 0} EGP • ${srv.pricing?.prices?.USD ?? 0} •{' '}
                        {srv.pricing?.prices?.SAR ?? 0} SAR
                      </p>

                      {srv.description?.en && (
                        <p className="text-xs text-muted-foreground pt-1 max-w-2xl">
                          {srv.description.en}
                        </p>
                      )}

                      {srv.rejectionReason && (
                        <p className="text-xs text-rose-700 pt-1">
                          <strong>Rejection reason:</strong> {srv.rejectionReason}
                        </p>
                      )}

                      <div className="pt-2 flex flex-wrap items-center gap-4">
                        <Link
                          href={`/dashboard?expertId=${srv.expertId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Edit / Reassign in Expert Workspace ↗
                        </Link>
                        {srv.isActive && srv.approvalStatus === 'approved' && (
                          <a
                            href={`/services/${srv.slug || srv._id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                          >
                            Open Public Shareable Page ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleOpenEditService(srv)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
                    >
                      <Edit2 size={13} /> Edit Offer
                    </button>

                    <button
                      onClick={() => handleDeleteService(srv)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition"
                    >
                      <Trash2 size={13} /> Delete
                    </button>

                    {srv.requiresLicensingReview &&
                      srv.licensingReviewStatus !== 'licensing_approved' && (
                        <>
                          <button
                            onClick={() => handleServiceAction(srv._id, 'approve_licensing')}
                            className="rounded-full bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shadow-xs transition"
                          >
                            Approve Licensing ✓
                          </button>
                          <button
                            onClick={() => handleServiceAction(srv._id, 'reject_licensing')}
                            className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-800 hover:bg-purple-100 transition"
                          >
                            Reject Licensing
                          </button>
                        </>
                      )}
                    {srv.approvalStatus !== 'approved' && (
                      <button
                        onClick={() => handleServiceAction(srv._id, 'approve')}
                        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition"
                      >
                        Approve Offer ✓
                      </button>
                    )}
                    {srv.isActive && (
                      <button
                        onClick={() => handleServiceAction(srv._id, 'unpublish')}
                        className="rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                      >
                        Unpublish for Review
                      </button>
                    )}
                    {srv.approvalStatus !== 'rejected' && (
                      <button
                        onClick={() => handleServiceAction(srv._id, 'reject')}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEditService}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Service / Offering</h3>
                <p className="text-xs text-muted-foreground">Expert: {editingService.expertName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {editServiceFeedback && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                {editServiceFeedback}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-foreground">
                Title (English) *
                <input
                  required
                  value={editServiceTitleEn}
                  onChange={(e) => setEditServiceTitleEn(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                />
              </label>

              <label className="block text-xs font-bold text-foreground">
                Title (Arabic) *
                <input
                  required
                  dir="rtl"
                  value={editServiceTitleAr}
                  onChange={(e) => setEditServiceTitleAr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-neutral-50/70 p-3.5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="block text-xs font-bold text-foreground">Service Card Thumbnail</span>
                  <span className="text-[11px] text-muted-foreground">16:9 cover image displayed on service cards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CloudinaryUploadWidget
                    onSuccess={(res) => setEditServiceThumbnailUrl(res.secureUrl || res.url)}
                    folder="bokbok/service_thumbnails"
                    fallbackType="service_thumbnail"
                    cropping={true}
                    croppingAspectRatio={16 / 9}
                    buttonText={editServiceThumbnailUrl ? 'Change Thumbnail' : 'Upload Thumbnail'}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover"
                  />
                  {editServiceThumbnailUrl && (
                    <button
                      type="button"
                      onClick={() => setEditServiceThumbnailUrl('')}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
              {editServiceThumbnailUrl && (
                <div className="mt-3 relative h-32 w-56 overflow-hidden rounded-xl border border-border bg-[#101F49]">
                  <img
                    src={editServiceThumbnailUrl}
                    alt="Thumbnail preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-foreground">
                Description (English)
                <textarea
                  rows={3}
                  value={editServiceDescEn}
                  onChange={(e) => setEditServiceDescEn(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                />
              </label>

              <label className="block text-xs font-bold text-foreground">
                Description (Arabic)
                <textarea
                  rows={3}
                  dir="rtl"
                  value={editServiceDescAr}
                  onChange={(e) => setEditServiceDescAr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-foreground">
                Price (EGP) *
                <input
                  type="number"
                  min={0}
                  required
                  value={editServicePrice}
                  onChange={(e) => setEditServicePrice(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                />
              </label>

              <label className="block text-xs font-bold text-foreground">
                Duration (Minutes) *
                <input
                  type="number"
                  min={5}
                  required
                  value={editServiceDuration}
                  onChange={(e) => setEditServiceDuration(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-xs font-bold text-foreground">
                Booking Type *
                <select
                  value={editServiceBookingType}
                  onChange={(e) => setEditServiceBookingType(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                >
                  <option value="APPOINTMENT">1-on-1 Consultation</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="WEBINAR">Webinar</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-foreground">
                Service Kind *
                <select
                  value={editServiceKind}
                  onChange={(e) => setEditServiceKind(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                >
                  <option value="CONSULTATION">Consultation</option>
                  <option value="GENERAL_SERVICE">General Service</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-foreground">
                Approval Status *
                <select
                  value={editServiceApproval}
                  onChange={(e) => setEditServiceApproval(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editServiceActive"
                checked={editServiceActive}
                onChange={(e) => setEditServiceActive(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              <label
                htmlFor="editServiceActive"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Active &amp; published (visible to clients on expert profile)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingService}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs disabled:opacity-50"
              >
                {savingService ? 'Saving...' : 'Save Offering Changes ✓'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

