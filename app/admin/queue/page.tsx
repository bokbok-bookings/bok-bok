'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ExpertVerificationCard,
  type ExpertAdminItem,
} from '@/components/admin/expert-verification-card'
import { RefreshCw } from 'lucide-react'

export default function AdminQueuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [experts, setExperts] = useState<ExpertAdminItem[]>([])
  const [docModal, setDocModal] = useState<{ title: string; url: string } | null>(null)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/experts')
      const json = await res.json()
      if (json.success) {
        setExperts(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load expert queue:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const handleExpertAction = async (
    expertId: string,
    action: 'approve' | 'reject' | 'suspend' | 'approve_info_update' | 'reject_info_update'
  ) => {
    let rejectionReason = ''
    if (action === 'reject' || action === 'reject_info_update') {
      const reason = prompt('Rejection reason or required improvements for the expert:')
      if (reason === null) return
      rejectionReason = reason
    } else if (action === 'approve_info_update') {
      if (!confirm('Approve and publish these requested Info changes?')) return
    } else {
      if (!confirm(`Are you sure you want to ${action} this expert?`)) return
    }

    try {
      const res = await fetch('/api/admin/experts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, action, rejectionReason }),
      })
      const json = await res.json()
      if (json.success) {
        await loadQueue()
        router.refresh()
      } else {
        alert(json.error || 'Failed to update expert')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating expert')
    }
  }

  const pendingExperts = experts.filter(
    (e) => e.status === 'pending_review' || Boolean(e.hasPendingInfoUpdate)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeeae4] pb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Expert Verification
          </span>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
            Experts Pending Activation ({pendingExperts.length})
          </h1>
          <p className="text-xs text-[#637084] mt-0.5">
            Review National ID / Commercial Register documents, payout details, and profile update requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadQueue()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition self-start sm:self-auto"
        >
          <RefreshCw size={13} /> Refresh Queue
        </button>
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Loading Verification Queue...
            </p>
          </div>
        </div>
      ) : pendingExperts.length === 0 ? (
        <div className="rounded-3xl border border-[#e7e2da] bg-white p-12 text-center shadow-xs">
          <p className="text-base font-bold text-[#14243b]">Expert Queue is Clear</p>
          <p className="mt-1 text-xs text-[#637084]">
            No expert profiles are waiting for activation or info edit approval at this moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingExperts.map((exp) => (
            <ExpertVerificationCard
              key={exp._id}
              exp={exp}
              onAction={handleExpertAction}
              onPreviewDoc={(doc) => setDocModal(doc)}
            />
          ))}
        </div>
      )}

      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative max-w-2xl w-full rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">{docModal.title}</h3>
              <button
                onClick={() => setDocModal(null)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Close ✕
              </button>
            </div>
            <div className="relative h-96 w-full overflow-hidden rounded-2xl bg-neutral-100 border border-border">
              <Image src={docModal.url} alt={docModal.title} fill className="object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

