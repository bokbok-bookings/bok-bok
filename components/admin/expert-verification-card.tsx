'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/data/categories'

export interface ExpertAdminItem {
  _id: string
  accountType?: 'expert' | 'organization'
  fName?: string
  lName?: string
  name: string
  slug: string
  role: string
  location: string
  phone?: string
  whatsapp?: string
  image?: string
  avatarUrl?: string
  nationalIdFrontUrl?: string
  nationalIdBackUrl?: string
  commercialRegisterNumber?: string
  taxNumber?: string
  commercialRegisterUrl?: string
  taxIdDocumentUrl?: string
  certificates?: Array<{ title: string; fileUrl: string; fileType?: 'pdf' | 'image' }>
  socialLinks?: {
    linkedin?: string
    instagram?: string
    facebook?: string
    twitter?: string
    website?: string
    other?: string
  }
  suggestedCategory?: {
    categoryName?: string
    subcategoryName?: string
    notes?: string
  }
  preferredPayoutMethod?: 'instapay' | 'bank_account'
  instapayUsername?: string
  bankAccount?: {
    bankName?: string
    accountHolderName?: string
    accountNumber?: string
    iban?: string
  }
  categories?: Array<{ categorySlug: string; subcategories: string[] }>
  status?: string
  featuredHome?: boolean
  featuredHomeAt?: string
  hasPendingInfoUpdate?: boolean
  pendingInfoSubmittedAt?: string
  pendingInfoRejectionReason?: string
  pendingInfoUpdate?: Record<string, any>
  bio?: string
  about?: string
  categorySlug?: string
  subcategorySlug?: string
  price: string
  rejectionReason?: string
  createdAt?: string
}

interface ExpertVerificationCardProps {
  exp: ExpertAdminItem
  onAction: (
    expertId: string,
    action: 'approve' | 'reject' | 'suspend' | 'approve_info_update' | 'reject_info_update'
  ) => void
  onPreviewDoc: (doc: { title: string; url: string }) => void
}

export function ExpertVerificationCard({
  exp,
  onAction,
  onPreviewDoc,
}: ExpertVerificationCardProps) {
  return (
    <div className="rounded-2xl border border-[#e7e2da] bg-white p-5 sm:p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 border border-border">
            {exp.image || exp.avatarUrl ? (
              <Image
                src={exp.image || exp.avatarUrl || ''}
                alt={exp.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-xs text-muted-foreground">
                Photo
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{exp.name}</h3>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                {exp.status === 'pending_review' ? 'Pending Activation' : 'Live Expert'}
              </span>
              {exp.hasPendingInfoUpdate && (
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  ✎ Pending Info Edit Request
                </span>
              )}
              <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 uppercase">
                {exp.accountType === 'organization' ? 'Organization (مؤسسة)' : 'Individual Expert'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{exp.role}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {exp.location} • Slug:{' '}
              <span className="font-mono text-foreground font-semibold">/{exp.slug}</span>
            </p>

            {/* Admin-Only Phone, WhatsApp & Payout Info */}
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-foreground">
              {exp.phone && (
                <span className="rounded-md bg-neutral-100 border border-border px-2 py-0.5">
                  📞 Phone: <strong>{exp.phone}</strong>
                </span>
              )}
              {exp.whatsapp && (
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 font-medium">
                  💬 WhatsApp: <strong>{exp.whatsapp}</strong>
                </span>
              )}
              <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-900">
                💳 Preferred Payout:{' '}
                <strong className="uppercase">{exp.preferredPayoutMethod || 'instapay'}</strong>
                {exp.instapayUsername ? ` (InstaPay: ${exp.instapayUsername})` : ''}
                {exp.bankAccount?.accountNumber || exp.bankAccount?.iban
                  ? ` (Bank: ${exp.bankAccount?.bankName || ''} ${exp.bankAccount?.accountNumber || exp.bankAccount?.iban || ''
                  })`
                  : ''}
              </span>
            </div>

            {/* Admin-Only Social Media Links */}
            {exp.socialLinks && Object.values(exp.socialLinks).some((v) => Boolean(v)) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-muted-foreground font-semibold">Social Verification:</span>
                {exp.socialLinks.linkedin && (
                  <a
                    href={exp.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {exp.socialLinks.website && (
                  <a
                    href={exp.socialLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold"
                  >
                    Website ↗
                  </a>
                )}
                {exp.socialLinks.instagram && (
                  <a
                    href={exp.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold"
                  >
                    Instagram ↗
                  </a>
                )}
                {exp.socialLinks.facebook && (
                  <a
                    href={exp.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold"
                  >
                    Facebook ↗
                  </a>
                )}
              </div>
            )}

            {/* Categories & Subcategories section */}
            {((exp.categories && exp.categories.length > 0) || exp.categorySlug) && (
              <div className="mt-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Categories &amp; Subcategories:
                </span>
                <div className="flex flex-col gap-2">
                  {exp.categories && exp.categories.length > 0 ? (
                    exp.categories.map((c) => {
                      const catName = getCategoryLabel(c.categorySlug, 'en') || c.categorySlug
                      const subs = c.subcategories || []
                      return (
                        <div
                          key={c.categorySlug}
                          className="rounded-xl border border-border bg-[#faf8f5] p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#14243b]">
                              📁 {catName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({c.categorySlug})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {subs.length > 0 ? (
                              subs.map((sSlug) => {
                                const subName = getSubcategoryLabel(c.categorySlug, sSlug, 'en') || sSlug
                                return (
                                  <span
                                    key={sSlug}
                                    className="inline-flex items-center gap-1 rounded-md border border-[#e2ddd5] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#14243b] shadow-2xs"
                                  >
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    {subName}
                                  </span>
                                )
                              })
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                No subcategories selected
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl border border-border bg-[#faf8f5] p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#14243b]">
                          📁 {getCategoryLabel(exp.categorySlug, 'en') || exp.categorySlug}
                        </span>
                      </div>
                      {exp.subcategorySlug && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#e2ddd5] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#14243b] shadow-2xs">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {getSubcategoryLabel(exp.categorySlug, exp.subcategorySlug, 'en') || exp.subcategorySlug}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Suggested Category / Subcategory */}
            {exp.suggestedCategory &&
              (exp.suggestedCategory.categoryName || exp.suggestedCategory.subcategoryName) && (
                <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
                  <strong>💡 Suggested New Category/Subcategory:</strong>{' '}
                  {exp.suggestedCategory.categoryName && (
                    <span>Category: &ldquo;{exp.suggestedCategory.categoryName}&rdquo; </span>
                  )}
                  {exp.suggestedCategory.subcategoryName && (
                    <span>Subcategory: &ldquo;{exp.suggestedCategory.subcategoryName}&rdquo; </span>
                  )}
                  {exp.suggestedCategory.notes && (
                    <span className="text-amber-800">({exp.suggestedCategory.notes})</span>
                  )}
                </div>
              )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <Link
            href={`/dashboard?expertId=${exp._id}`}
            target="_blank"
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
          >
            Inspect Workspace ↗
          </Link>
          {exp.hasPendingInfoUpdate && exp.status !== 'pending_review' ? (
            <>
              <button
                onClick={() => onAction(exp._id, 'reject_info_update')}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
              >
                Reject Info Changes
              </button>
              <button
                onClick={() => onAction(exp._id, 'approve_info_update')}
                className="rounded-full bg-indigo-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition"
              >
                Approve Info Changes ✓
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onAction(exp._id, 'reject')}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
              >
                Reject
              </button>
              <button
                onClick={() => onAction(exp._id, 'approve')}
                className="rounded-full bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition"
              >
                Activate Expert ✓
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending Info Update Diff / Preview Box */}
      {exp.hasPendingInfoUpdate && exp.pendingInfoUpdate && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-900">
              ✎ Requested Info Changes (Requires Admin Review)
            </p>
            {exp.status === 'pending_review' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAction(exp._id, 'reject_info_update')}
                  className="rounded-full border border-rose-300 bg-white px-2.5 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50 shadow-2xs"
                >
                  Discard Edits
                </button>
                <button
                  onClick={() => onAction(exp._id, 'approve_info_update')}
                  className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 shadow-xs"
                >
                  Apply Edits ✓
                </button>
              </div>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs text-foreground">
            {exp.pendingInfoUpdate.name && (
              <div className="rounded-lg bg-white p-2.5 border border-indigo-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Requested Name
                </span>
                <span className="font-semibold text-foreground">{exp.pendingInfoUpdate.name}</span>
                {exp.pendingInfoUpdate.slug && (
                  <span className="ml-2 font-mono text-[11px] text-indigo-700">
                    (/{exp.pendingInfoUpdate.slug})
                  </span>
                )}
              </div>
            )}
            {exp.pendingInfoUpdate.role && (
              <div className="rounded-lg bg-white p-2.5 border border-indigo-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Requested Headline / Role
                </span>
                <span className="font-semibold text-foreground">{exp.pendingInfoUpdate.role}</span>
              </div>
            )}
            {exp.pendingInfoUpdate.bio !== undefined && (
              <div className="rounded-lg bg-white p-2.5 border border-indigo-100 sm:col-span-2 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Requested Short Bio
                </span>
                <p className="text-foreground mt-0.5">{exp.pendingInfoUpdate.bio || '—'}</p>
              </div>
            )}
            {exp.pendingInfoUpdate.about !== undefined && (
              <div className="rounded-lg bg-white p-2.5 border border-indigo-100 sm:col-span-2 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Requested Detailed Description (About)
                </span>
                <p className="text-foreground mt-0.5 whitespace-pre-line">
                  {exp.pendingInfoUpdate.about || '—'}
                </p>
              </div>
            )}
            {Array.isArray(exp.pendingInfoUpdate.certificates) && (
              <div className="rounded-lg bg-white p-2.5 border border-indigo-100 sm:col-span-2 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
                  Requested Certificates ({exp.pendingInfoUpdate.certificates.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {exp.pendingInfoUpdate.certificates.map((cert: any, idx: number) => (
                    <a
                      key={idx}
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 hover:underline"
                    >
                      📜 {cert.title} ({cert.fileType || 'file'}) ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
            {(Array.isArray(exp.pendingInfoUpdate.categories) || exp.pendingInfoUpdate.categorySlug) && (
              <div className="rounded-lg bg-white p-2.5 border border-indigo-100 sm:col-span-2 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
                  Requested Categories &amp; Subcategories
                </span>
                <div className="space-y-1.5">
                  {Array.isArray(exp.pendingInfoUpdate.categories) && exp.pendingInfoUpdate.categories.length > 0 ? (
                    exp.pendingInfoUpdate.categories.map((c: any, idx: number) => {
                      const subs: string[] = Array.isArray(c.subcategories) ? c.subcategories : []
                      const catName = getCategoryLabel(c.categorySlug, 'en') || c.categorySlug
                      return (
                        <div key={idx} className="rounded-md border border-indigo-200 bg-indigo-50/50 p-2 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-indigo-950">📁 {catName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({c.categorySlug})</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {subs.length > 0 ? (
                              subs.map((sSlug: string) => {
                                const subName = getSubcategoryLabel(c.categorySlug, sSlug, 'en') || sSlug
                                return (
                                  <span
                                    key={sSlug}
                                    className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-900 shadow-2xs"
                                  >
                                    <span className="size-1.5 rounded-full bg-indigo-500" />
                                    {subName}
                                  </span>
                                )
                              })
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">No subcategories</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-md border border-indigo-200 bg-indigo-50/50 p-2 space-y-1">
                      <span className="text-xs font-bold text-indigo-950">
                        📁 {getCategoryLabel(exp.pendingInfoUpdate.categorySlug, 'en') || exp.pendingInfoUpdate.categorySlug}
                      </span>
                      {exp.pendingInfoUpdate.subcategorySlug && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-900 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-indigo-500" />
                            {getSubcategoryLabel(exp.pendingInfoUpdate.categorySlug, exp.pendingInfoUpdate.subcategorySlug, 'en') || exp.pendingInfoUpdate.subcategorySlug}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Identification / Organization Documents & Certificates Verification Section */}
      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-xs font-bold text-foreground">
          {exp.accountType === 'organization'
            ? 'Submitted Organization Documents (سجل تجاري & رقم ضريبي):'
            : 'Submitted Identification Documents:'}
        </p>

        {exp.accountType === 'organization' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-neutral-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">سجل تجاري (Commercial Register)</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  No: {exp.commercialRegisterNumber || '—'}
                </p>
              </div>
              {exp.commercialRegisterUrl ? (
                <a
                  href={exp.commercialRegisterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white border border-border px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-100 shadow-2xs"
                >
                  Open Document ↗
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground">Number Only</span>
              )}
            </div>

            <div className="rounded-xl border border-border bg-neutral-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">رقم ضريبي (Tax Number)</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  No: {exp.taxNumber || '—'}
                </p>
              </div>
              {exp.taxIdDocumentUrl ? (
                <a
                  href={exp.taxIdDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white border border-border px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-100 shadow-2xs"
                >
                  Open Document ↗
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground">Number Only</span>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-neutral-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">National ID / Passport (Front)</p>
                <p className="text-[10px] text-muted-foreground">
                  {exp.nationalIdFrontUrl ? 'Uploaded image ready' : 'Not uploaded'}
                </p>
              </div>
              {exp.nationalIdFrontUrl ? (
                <button
                  onClick={() =>
                    onPreviewDoc({
                      title: `${exp.name} — National ID Front`,
                      url: exp.nationalIdFrontUrl!,
                    })
                  }
                  className="rounded-full bg-white border border-border px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-100 shadow-2xs"
                >
                  Inspect ID Front ↗
                </button>
              ) : (
                <span className="text-[11px] text-rose-600 font-bold">Missing</span>
              )}
            </div>

            <div className="rounded-xl border border-border bg-neutral-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">National ID (Back)</p>
                <p className="text-[10px] text-muted-foreground">
                  {exp.nationalIdBackUrl ? 'Uploaded image ready' : 'Not uploaded'}
                </p>
              </div>
              {exp.nationalIdBackUrl ? (
                <button
                  onClick={() =>
                    onPreviewDoc({
                      title: `${exp.name} — National ID Back`,
                      url: exp.nationalIdBackUrl!,
                    })
                  }
                  className="rounded-full bg-white border border-border px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-100 shadow-2xs"
                >
                  Inspect ID Back ↗
                </button>
              ) : (
                <span className="text-[11px] text-rose-600 font-bold">Missing</span>
              )}
            </div>
          </div>
        )}

        {/* Optional Certificates */}
        {exp.certificates && exp.certificates.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-bold text-foreground mb-2">
              Uploaded Certificates ({exp.certificates.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {exp.certificates.map((cert, i) => (
                <a
                  key={i}
                  href={cert.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-neutral-100 shadow-2xs"
                >
                  📄 {cert.title} ↗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

