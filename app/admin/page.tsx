'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BrandLogo } from '@/components/brand/logo'
import { useRouter } from 'next/navigation'
import { BookingsManager } from '@/components/dashboard/bookings-manager'
import { CategoriesManager } from '@/components/dashboard/categories-manager'

interface ExpertItem {
  _id: string
  name: string
  slug: string
  role: string
  location: string
  image?: string
  avatarUrl?: string
  nationalIdFrontUrl?: string
  nationalIdBackUrl?: string
  categories?: Array<{ categorySlug: string; subcategories: string[] }>
  status?: string
  categorySlug?: string
  subcategorySlug?: string
  price: string
  rejectionReason?: string
  createdAt?: string
}

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
  categorySlug?: string
  subcategorySlug?: string
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
    capacity?: number
    enrolledCount?: number
  }
  tags?: string[]
  durationMinutes: number
  breakAfterMinutes: number
  pricing: {
    baseCurrency: string
    prices: Record<string, number>
  }
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  createdAt: string
}

interface TagItem {
  _id: string
  id: string
  slug: string
  name: { en: string; ar: string }
  isActive: boolean
}

interface UserItem {
  _id: string
  email: string
  displayName: string
  role: string
  status: string
  createdAt: string
}

export default function AdminConsolePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    'queue' | 'services' | 'bookings' | 'categories' | 'experts' | 'users' | 'tags'
  >('queue')
  const [loading, setLoading] = useState(true)

  // Data states
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [experts, setExperts] = useState<ExpertItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [newTagEn, setNewTagEn] = useState('')
  const [newTagAr, setNewTagAr] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [stats, setStats] = useState({
    pendingExperts: 0,
    pendingServices: 0,
    approvedExperts: 0,
    totalExperts: 0,
    totalUsers: 0,
  })

  // Document preview modal
  const [docModal, setDocModal] = useState<{ title: string; url: string } | null>(null)

  // Create User Modal
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'expert' | 'client'>('admin')
  const [creatingUser, setCreatingUser] = useState(false)
  const [modalFeedback, setModalFeedback] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Check me
      const meRes = await fetch('/api/auth/me')
      const meJson = await meRes.json()
      if (!meJson.success || meJson.user?.role !== 'admin') {
        router.push('/login?callbackUrl=/admin')
        return
      }
      setCurrentUser(meJson.user)

      // 2. Load experts
      const expRes = await fetch('/api/admin/experts')
      const expJson = await expRes.json()
      let pendingExpCount = 0
      let approvedExpCount = 0

      if (expJson.success) {
        setExperts(expJson.data)
        pendingExpCount = expJson.data.filter((e: ExpertItem) => e.status === 'pending_review').length
        approvedExpCount = expJson.data.filter((e: ExpertItem) => e.status === 'approved' || !e.status).length
      }

      // 3. Load services
      const srvRes = await fetch('/api/admin/services')
      const srvJson = await srvRes.json()
      let pendingSrvCount = 0
      if (srvJson.success) {
        setServices(srvJson.data)
        pendingSrvCount = srvJson.data.filter((s: ServiceItem) => s.approvalStatus === 'pending').length
      }

      // 4. Load users
      const usersRes = await fetch('/api/admin/users')
      const usersJson = await usersRes.json()
      let userCount = 0
      if (usersJson.success) {
        setUsers(usersJson.data)
        userCount = usersJson.data.length
      }

      // 5. Load tags
      const tagsRes = await fetch('/api/tags?includeInactive=true')
      const tagsJson = await tagsRes.json()
      if (tagsJson.success) {
        setTags(tagsJson.data)
      }

      setStats({
        pendingExperts: pendingExpCount,
        pendingServices: pendingSrvCount,
        approvedExperts: approvedExpCount,
        totalExperts: expJson.data?.length || 0,
        totalUsers: userCount,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab')
      if (
        urlTab &&
        ['queue', 'services', 'bookings', 'categories', 'experts', 'users', 'tags'].includes(urlTab)
      ) {
        setActiveTab(urlTab as any)
      }
    }
  }, [])

  const handleExpertAction = async (expertId: string, action: 'approve' | 'reject' | 'suspend') => {
    let rejectionReason = ''
    if (action === 'reject') {
      const reason = prompt('Rejection reason or required improvements for the expert:')
      if (reason === null) return
      rejectionReason = reason
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
        loadData()
      } else {
        alert(json.error || 'Failed to update expert')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating expert')
    }
  }

  const handleServiceAction = async (serviceId: string, action: 'approve' | 'reject') => {
    let rejectionReason = ''
    if (action === 'reject') {
      const reason = prompt('Rejection reason for this consultation service offering:')
      if (reason === null) return
      rejectionReason = reason
    } else {
      if (!confirm('Approve this consultation service offering and publish to the expert profile?')) return
    }

    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, action, rejectionReason }),
      })
      const json = await res.json()
      if (json.success) {
        loadData()
      } else {
        alert(json.error || 'Failed to update service')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating service')
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagEn.trim() || !newTagAr.trim()) return
    setCreatingTag(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: { en: newTagEn.trim(), ar: newTagAr.trim() },
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewTagEn('')
        setNewTagAr('')
        loadData()
      } else {
        alert(json.error || 'Failed to create tag')
      }
    } catch (err: any) {
      alert(err.message || 'Error creating tag')
    } finally {
      setCreatingTag(false)
    }
  }

  const handleToggleTag = async (tagId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tagId, isActive: !currentActive }),
      })
      const json = await res.json()
      if (json.success) {
        loadData()
      } else {
        alert(json.error || 'Failed to toggle tag')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating tag')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    setModalFeedback('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          displayName: newName,
          role: newRole,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setUserModalOpen(false)
        setNewEmail('')
        setNewPassword('')
        setNewName('')
        loadData()
        alert(`User created successfully: ${json.data.email}`)
      } else {
        setModalFeedback(json.error || 'Failed to create user')
      }
    } catch (err: any) {
      setModalFeedback(err.message || 'Error creating user')
    } finally {
      setCreatingUser(false)
    }
  }

  const pendingExperts = experts.filter((e) => e.status === 'pending_review')
  const pendingServicesList = services.filter((s) => s.approvalStatus === 'pending')

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#0d1624] text-white">
        <p className="text-xs font-bold tracking-widest uppercase text-white/50">
          Loading Admin Console...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d1624] text-slate-100 selection:bg-[#2855C5]">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#121d2f]/80 backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8">
        <div className="mx-auto max-w-7xl h-16 flex items-center justify-between">
          <BrandLogo href="/admin" size="sm" variant="dark" subtitle="Administrator Console" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setUserModalOpen(true)}
              className="rounded-full bg-[#2855C5] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-white hover:text-[#0d1624] transition"
            >
              + Create User
            </button>
            <Link
              href="/"
              target="_blank"
              className="rounded-full border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500"
            >
              Public Site ↗
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                router.push('/login')
              }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/40"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Pending Experts
            </span>
            <p className="mt-2 text-3xl font-black text-amber-300">{pendingExperts.length}</p>
            <p className="mt-1 text-xs text-amber-200/70">Awaiting ID verification</p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Pending Services
            </span>
            <p className="mt-2 text-3xl font-black text-amber-300">{pendingServicesList.length}</p>
            <p className="mt-1 text-xs text-amber-200/70">Offerings awaiting review</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Live Experts
            </span>
            <p className="mt-2 text-3xl font-bold text-white">{stats.approvedExperts}</p>
            <p className="mt-1 text-xs text-slate-400">Public directory experts</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Experts
            </span>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalExperts}</p>
            <p className="mt-1 text-xs text-slate-400">All registered profiles</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Platform Users
            </span>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalUsers}</p>
            <p className="mt-1 text-xs text-slate-400">Admins, experts, & clients</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
          {[
            { id: 'queue', label: `Expert Queue (${pendingExperts.length})` },
            { id: 'services', label: `Services Review (${pendingServicesList.length})` },
            { id: 'bookings', label: 'All Bookings & Receipts' },
            { id: 'categories', label: 'Categories & Subcategories' },
            { id: 'experts', label: `Directory Experts (${experts.length})` },
            { id: 'users', label: `Users & Staff (${users.length})` },
            { id: 'tags', label: `Tags & Taxonomy (${tags.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#2855C5] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Expert Verification Queue */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {pendingExperts.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-12 text-center">
                <p className="text-base font-bold text-white">Expert Queue is Clear</p>
                <p className="mt-1 text-xs text-slate-400">
                  No expert profiles are waiting for verification at this moment.
                </p>
              </div>
            ) : (
              pendingExperts.map((exp) => (
                <div
                  key={exp._id}
                  className="rounded-2xl border border-amber-500/20 bg-[#121d2f] p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-slate-800 border border-slate-700">
                        {exp.image || exp.avatarUrl ? (
                          <Image
                            src={exp.image || exp.avatarUrl || ''}
                            alt={exp.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-xs text-slate-500">Photo</div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{exp.name}</h3>
                          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                            Verification Pending
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 font-medium">{exp.role}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {exp.location} • Slug: <span className="font-mono text-slate-300">/{exp.slug}</span>
                        </p>

                        {/* Categories badges */}
                        {exp.categories && exp.categories.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {exp.categories.map((c) => (
                              <span
                                key={c.categorySlug}
                                className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300"
                              >
                                {c.categorySlug} ({c.subcategories?.length || 0} subcategories)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link
                        href={`/dashboard?expertId=${exp._id}`}
                        target="_blank"
                        className="rounded-full border border-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500"
                      >
                        Inspect Dashboard ↗
                      </Link>
                      <button
                        onClick={() => handleExpertAction(exp._id, 'reject')}
                        className="rounded-full px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-950/40"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleExpertAction(exp._id, 'approve')}
                        className="rounded-full bg-emerald-500 px-5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                      >
                        Approve Expert ✓
                      </button>
                    </div>
                  </div>

                  {/* National ID Documents Verification Section */}
                  <div className="border-t border-slate-800/80 pt-4">
                    <p className="text-xs font-bold text-slate-300 mb-2">Submitted Identification Documents:</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-800 bg-[#0d1624] p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">National ID (Front Face)</p>
                          <p className="text-[10px] text-slate-400">
                            {exp.nationalIdFrontUrl ? 'Uploaded image ready' : 'Not uploaded'}
                          </p>
                        </div>
                        {exp.nationalIdFrontUrl ? (
                          <button
                            onClick={() => setDocModal({ title: `${exp.name} — National ID Front`, url: exp.nationalIdFrontUrl! })}
                            className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                          >
                            Inspect ID Front ↗
                          </button>
                        ) : (
                          <span className="text-[11px] text-rose-400 font-bold">Missing</span>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#0d1624] p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">National ID (Back Face)</p>
                          <p className="text-[10px] text-slate-400">
                            {exp.nationalIdBackUrl ? 'Uploaded image ready' : 'Not uploaded'}
                          </p>
                        </div>
                        {exp.nationalIdBackUrl ? (
                          <button
                            onClick={() => setDocModal({ title: `${exp.name} — National ID Back`, url: exp.nationalIdBackUrl! })}
                            className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                          >
                            Inspect ID Back ↗
                          </button>
                        ) : (
                          <span className="text-[11px] text-rose-400 font-bold">Missing</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Services Approval Review */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-12 text-center">
                <p className="text-base font-bold text-white">No Services Found</p>
                <p className="mt-1 text-xs text-slate-400">No services or offerings have been created yet.</p>
              </div>
            ) : (
              services.map((srv) => {
                const bType = srv.bookingType || 'APPOINTMENT'
                const sKind = srv.serviceKind || 'CONSULTATION'
                const dMode = srv.deliveryMode || 'ONLINE'

                let typeLabel = 'Consultation'
                let typeColor = 'bg-blue-500/20 text-blue-300'
                if (bType === 'APPOINTMENT') {
                  typeLabel = sKind === 'GENERAL_SERVICE' ? 'General Service' : 'Consultation'
                  typeColor = sKind === 'GENERAL_SERVICE' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-500/20 text-blue-300'
                } else if (bType === 'WORKSHOP') {
                  typeLabel = 'Workshop'
                  typeColor = 'bg-purple-500/20 text-purple-300'
                } else if (bType === 'WEBINAR') {
                  typeLabel = 'Webinar'
                  typeColor = 'bg-amber-500/20 text-amber-300'
                }

                return (
                  <div
                    key={srv._id}
                    className={`rounded-2xl border bg-[#121d2f] p-5 sm:p-6 space-y-3 ${
                      srv.approvalStatus === 'pending'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : srv.approvalStatus === 'rejected'
                        ? 'border-rose-500/30'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white">{srv.title.en}</h3>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${typeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                            {dMode === 'ONLINE' ? '🌐 Online' : dMode === 'IN_PERSON' ? '📍 In-Person' : '🔄 Hybrid'}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              srv.approvalStatus === 'pending'
                                ? 'bg-amber-500/20 text-amber-300'
                                : srv.approvalStatus === 'approved' || !srv.approvalStatus
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {srv.approvalStatus === 'pending' ? 'Pending Review' : srv.approvalStatus || 'approved'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium" dir="rtl">{srv.title.ar}</p>

                        <p className="text-xs text-slate-300 pt-1">
                          Expert: <strong className="text-white">{srv.expertName}</strong>
                          {bType === 'APPOINTMENT' ? (
                            <> • {srv.durationMinutes} min session {srv.breakAfterMinutes ? `(${srv.breakAfterMinutes}m break)` : ''}</>
                          ) : (
                            <> • {srv.event?.startDate ? new Date(srv.event.startDate).toLocaleString() : 'Date TBD'} • {srv.event?.enrolledCount || 0} / {srv.event?.capacity || 0} seats booked</>
                          )}
                        </p>

                        {dMode !== 'ONLINE' && srv.location?.address && (
                          <p className="text-xs text-slate-400">
                            📍 Location: {srv.location.address}{srv.location.city ? `, ${srv.location.city}` : ''}
                          </p>
                        )}

                        <p className="text-xs font-mono text-slate-400">
                          Pricing: {srv.pricing?.prices?.EGP ?? 0} EGP • ${srv.pricing?.prices?.USD ?? 0} • {srv.pricing?.prices?.SAR ?? 0} SAR
                        </p>

                        {srv.tags && srv.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {srv.tags.map((t) => (
                              <span key={t} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {srv.description?.en && (
                          <p className="text-xs text-slate-400 pt-1 line-clamp-2 max-w-2xl">{srv.description.en}</p>
                        )}

                        {srv.rejectionReason && (
                          <p className="text-xs text-rose-400 pt-1">
                            <strong>Rejection reason:</strong> {srv.rejectionReason}
                          </p>
                        )}

                        <div className="pt-2">
                          <a
                            href={`/services/${srv.slug || srv._id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                          >
                            Open Public Shareable Page ↗
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {srv.approvalStatus !== 'approved' && (
                          <button
                            onClick={() => handleServiceAction(srv._id, 'approve')}
                            className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                          >
                            Approve Service ✓
                          </button>
                        )}
                        {srv.approvalStatus !== 'rejected' && (
                          <button
                            onClick={() => handleServiceAction(srv._id, 'reject')}
                            className="rounded-full border border-rose-500/30 px-3.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-950/40"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* TAB 3: Bookings & Receipts */}
        {activeTab === 'bookings' && (
          <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-6">
            <BookingsManager isAdmin={true} />
          </div>
        )}

        {/* TAB: Categories & Subcategories Taxonomy */}
        {activeTab === 'categories' && <CategoriesManager />}

        {/* TAB 4: Directory Experts */}
        {activeTab === 'experts' && (
          <div className="rounded-2xl border border-slate-800 bg-[#121d2f] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4 font-semibold">Expert</th>
                  <th className="py-3 px-4 font-semibold">Headline</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {experts.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{exp.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">/{exp.slug}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{exp.role}</td>
                    <td className="py-3 px-4 text-slate-400">{exp.categorySlug || 'General'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          exp.status === 'approved' || !exp.status
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : exp.status === 'pending_review'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {exp.status || 'approved'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/experts/${exp.slug}`}
                          target="_blank"
                          className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-300 hover:text-white"
                        >
                          Public Page ↗
                        </Link>
                        <Link
                          href={`/dashboard?expertId=${exp._id}`}
                          target="_blank"
                          className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-300 hover:text-white"
                        >
                          Workspace ↗
                        </Link>
                        {exp.status !== 'suspended' && (
                          <button
                            onClick={() => handleExpertAction(exp._id, 'suspend')}
                            className="rounded-full px-2 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-950/40"
                          >
                            Suspend
                          </button>
                        )}
                        {exp.status === 'suspended' && (
                          <button
                            onClick={() => handleExpertAction(exp._id, 'approve')}
                            className="rounded-full px-2 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-950/40"
                          >
                            Unsuspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: Platform Users */}
        {activeTab === 'users' && (
          <div className="rounded-2xl border border-slate-800 bg-[#121d2f] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{u.displayName}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-rose-500/20 text-rose-300'
                            : u.role === 'expert'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{u.status}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 7: Tags Management */}
        {activeTab === 'tags' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-6">
              <h3 className="text-base font-bold text-white mb-1">Add New Discovery Tag</h3>
              <p className="text-xs text-slate-400 mb-4">
                Tags help clients search and filter across Consultations, General Services, Workshops, and Webinars.
              </p>
              <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row gap-3 items-end">
                <label className="block text-xs font-bold text-slate-300 flex-1">
                  Tag Name (English)
                  <input
                    required
                    value={newTagEn}
                    onChange={(e) => setNewTagEn(e.target.value)}
                    placeholder="e.g. Wedding Photography"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-300 flex-1">
                  Tag Name (Arabic)
                  <input
                    required
                    dir="rtl"
                    value={newTagAr}
                    onChange={(e) => setNewTagAr(e.target.value)}
                    placeholder="مثال: تصوير حفلات الزفاف"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={creatingTag}
                  className="rounded-xl bg-[#2855C5] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#ff7568] transition disabled:opacity-50 shrink-0"
                >
                  {creatingTag ? 'Creating...' : '+ Add Tag'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Tag Name</th>
                    <th className="py-3 px-4">Arabic Name</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {tags.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No tags found. Create one above to get started.
                      </td>
                    </tr>
                  ) : (
                    tags.map((tag) => (
                      <tr key={tag._id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-white">{tag.name?.en}</td>
                        <td className="py-3 px-4" dir="rtl">{tag.name?.ar}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{tag.slug}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              tag.isActive
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {tag.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleTag(tag.id || tag._id, tag.isActive)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
                          >
                            {tag.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-2xl w-full rounded-3xl bg-[#121d2f] border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">{docModal.title}</h3>
              <button
                onClick={() => setDocModal(null)}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            <div className="relative h-96 w-full overflow-hidden rounded-2xl bg-black">
              <Image
                src={docModal.url}
                alt={docModal.title}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-3xl bg-[#121d2f] border border-slate-700 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create New User</h3>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {modalFeedback && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-semibold">
                {modalFeedback}
              </div>
            )}

            <label className="block text-xs font-bold text-slate-300">
              Display Name
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Omar Wagih"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
              />
            </label>

            <label className="block text-xs font-bold text-slate-300">
              Email Address
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@bokbok.com"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
              />
            </label>

            <label className="block text-xs font-bold text-slate-300">
              Password
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
              />
            </label>

            <label className="block text-xs font-bold text-slate-300">
              Role
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
              >
                <option value="expert">Expert</option>
                <option value="admin">Administrator</option>
                <option value="client">Client</option>
              </select>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingUser}
                className="rounded-full bg-[#2855C5] px-5 py-2 text-xs font-bold text-white hover:bg-white hover:text-[#0d1624] disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create Account ✓'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

