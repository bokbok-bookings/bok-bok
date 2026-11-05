'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BrandLogo } from '@/components/brand/logo'
import { useRouter } from 'next/navigation'
import { BookingsManager } from '@/components/dashboard/bookings-manager'
import { CategoriesManager } from '@/components/dashboard/categories-manager'
import { AttendanceManager } from '@/components/dashboard/attendance-manager'
import { Edit2, Trash2, X, Plus, AlertCircle, ExternalLink, Check, Eye } from 'lucide-react'

interface ExpertItem {
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
  phone?: string
  createdAt: string
}

export default function AdminConsolePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    'queue' | 'services' | 'bookings' | 'attendance' | 'categories' | 'experts' | 'users' | 'tags'
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
  const [newPhone, setNewPhone] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'expert' | 'client'>('admin')
  const [creatingUser, setCreatingUser] = useState(false)
  const [modalFeedback, setModalFeedback] = useState('')

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserPhone, setEditUserPhone] = useState('')
  const [editUserRole, setEditUserRole] = useState<'admin' | 'expert' | 'client'>('client')
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'pending' | 'disabled'>('active')
  const [editUserNewPassword, setEditUserNewPassword] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  const [editUserFeedback, setEditUserFeedback] = useState('')

  // Edit Service Modal
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [editServiceTitleEn, setEditServiceTitleEn] = useState('')
  const [editServiceTitleAr, setEditServiceTitleAr] = useState('')
  const [editServiceDescEn, setEditServiceDescEn] = useState('')
  const [editServiceDescAr, setEditServiceDescAr] = useState('')
  const [editServicePrice, setEditServicePrice] = useState(0)
  const [editServiceDuration, setEditServiceDuration] = useState(30)
  const [editServiceKind, setEditServiceKind] = useState<'CONSULTATION' | 'GENERAL_SERVICE'>('CONSULTATION')
  const [editServiceBookingType, setEditServiceBookingType] = useState<'APPOINTMENT' | 'WORKSHOP' | 'WEBINAR'>('APPOINTMENT')
  const [editServiceApproval, setEditServiceApproval] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [editServiceActive, setEditServiceActive] = useState(true)
  const [savingService, setSavingService] = useState(false)
  const [editServiceFeedback, setEditServiceFeedback] = useState('')

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
        pendingExpCount = expJson.data.filter((e: ExpertItem) => e.status === 'pending_review' || Boolean(e.hasPendingInfoUpdate)).length
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
        ['queue', 'services', 'bookings', 'attendance', 'categories', 'experts', 'users', 'tags'].includes(urlTab)
      ) {
        setActiveTab(urlTab as any)
      }
    }
  }, [])

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
        loadData()
      } else {
        alert(json.error || 'Failed to update expert')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating expert')
    }
  }

  const handleToggleFeatured = async (expertId: string) => {
    try {
      const res = await fetch('/api/admin/experts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, action: 'toggle_featured' }),
      })
      const json = await res.json()
      if (json.success) {
        setExperts((prev) =>
          prev.map((e) =>
            e._id === expertId ? { ...e, featuredHome: !e.featuredHome } : e
          )
        )
      } else {
        alert(json.error || 'Failed to update featured status')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating featured status')
    }
  }

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
      const note = prompt('Admin note for unpublishing this offering for review:', 'Unpublished for MVP taxonomy/scope review.')
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
        loadData()
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
    const baseCur = srv.pricing?.baseCurrency || 'EGP'
    setEditServicePrice(
      srv.pricing?.prices?.[baseCur] ??
      srv.pricing?.prices?.EGP ??
      0
    )
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
    if (!confirm(`Are you sure you want to permanently delete service "${srv.title?.en}"? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/services?serviceId=${srv._id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setServices((prev) => prev.filter((s) => s._id !== srv._id))
        setStats((prev) => ({
          ...prev,
          pendingServices: srv.approvalStatus === 'pending' ? Math.max(0, prev.pendingServices - 1) : prev.pendingServices,
        }))
      } else {
        alert(json.error || 'Failed to delete service')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting service')
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
          phone: newPhone,
          role: newRole,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setUserModalOpen(false)
        setNewEmail('')
        setNewPassword('')
        setNewName('')
        setNewPhone('')
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

  const handleOpenEditUser = (u: UserItem) => {
    setEditingUser(u)
    setEditUserName(u.displayName || '')
    setEditUserEmail(u.email || '')
    setEditUserPhone(u.phone || '')
    setEditUserRole((u.role as any) || 'client')
    setEditUserStatus((u.status as any) || 'active')
    setEditUserNewPassword('')
    setEditUserFeedback('')
  }

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSavingUser(true)
    setEditUserFeedback('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser._id,
          displayName: editUserName.trim(),
          email: editUserEmail.trim().toLowerCase(),
          phone: editUserPhone.trim(),
          role: editUserRole,
          status: editUserStatus,
          ...(editUserNewPassword.trim() ? { password: editUserNewPassword.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === editingUser._id
              ? {
                ...u,
                displayName: editUserName.trim(),
                email: editUserEmail.trim().toLowerCase(),
                phone: editUserPhone.trim(),
                role: editUserRole,
                status: editUserStatus,
              }
              : u
          )
        )
        setEditingUser(null)
      } else {
        setEditUserFeedback(json.error || 'Failed to update user')
      }
    } catch (err: any) {
      setEditUserFeedback(err.message || 'Error updating user')
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async (u: UserItem) => {
    if (currentUser?._id === u._id || currentUser?.email === u.email) {
      alert('You cannot delete your own administrative account.')
      return
    }
    if (!confirm(`Are you sure you want to permanently delete user "${u.displayName}" (${u.email})? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users?userId=${u._id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) => prev.filter((user) => user._id !== u._id))
        setStats((prev) => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }))
      } else {
        alert(json.error || 'Failed to delete user')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting user')
    }
  }

  const pendingExperts = experts.filter(
    (e) => e.status === 'pending_review' || Boolean(e.hasPendingInfoUpdate)
  )
  const pendingServicesList = services.filter((s) => s.approvalStatus === 'pending')

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#FAFAF7] text-[#14243b]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
            Loading Admin Console...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#14243b] selection:bg-accent/30">
      {/* Top Navigation */}
      <header className="border-b border-border bg-white/95 backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8 shadow-xs">
        <div className="mx-auto max-w-7xl h-16 flex items-center justify-between">
          <BrandLogo href="/admin" size="sm" variant="light" subtitle="Administrator Console" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setUserModalOpen(true)}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition"
            >
              + Create User
            </button>
            <Link
              href="/"
              target="_blank"
              className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-neutral-50 shadow-2xs transition"
            >
              Public Site ↗
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                router.push('/login')
              }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              Pending Experts
            </span>
            <p className="mt-2 text-3xl font-black text-amber-900">{pendingExperts.length}</p>
            <p className="mt-1 text-xs text-amber-700/80">Awaiting ID verification</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              Pending Offers
            </span>
            <p className="mt-2 text-3xl font-black text-amber-900">{pendingServicesList.length}</p>
            <p className="mt-1 text-xs text-amber-700/80">Awaiting admin / licensing review</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Live Experts
            </span>
            <p className="mt-2 text-3xl font-bold text-foreground">{stats.approvedExperts}</p>
            <p className="mt-1 text-xs text-muted-foreground">Public directory experts</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Experts
            </span>
            <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalExperts}</p>
            <p className="mt-1 text-xs text-muted-foreground">All registered profiles</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Platform Users
            </span>
            <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalUsers}</p>
            <p className="mt-1 text-xs text-muted-foreground">Admins, experts, & clients</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border gap-1 overflow-x-auto">
          {[
            { id: 'queue', label: `Expert Queue (${pendingExperts.length})` },
            { id: 'services', label: `Offers Review (${pendingServicesList.length})` },
            { id: 'bookings', label: 'All Bookings & Receipts' },
            { id: 'attendance', label: 'Attendance & Disputes' },
            { id: 'categories', label: 'MVP Categories & Subcategories' },
            { id: 'experts', label: `Directory Experts (${experts.length})` },
            { id: 'users', label: `Users & Staff (${users.length})` },
            { id: 'tags', label: `Tags & Taxonomy (${tags.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${activeTab === tab.id
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
              <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-xs">
                <p className="text-base font-bold text-foreground">Expert Queue is Clear</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No expert profiles are waiting for verification at this moment.
                </p>
              </div>
            ) : (
              pendingExperts.map((exp) => (
                <div
                  key={exp._id}
                  className="rounded-2xl border border-border bg-white p-5 sm:p-6 space-y-4 shadow-xs"
                >
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
                          <div className="grid size-full place-items-center text-xs text-muted-foreground">Photo</div>
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">{exp.name}</h3>
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {exp.status === 'pending_review' ? 'Verification Pending' : 'Live Expert'}
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
                          {exp.location} • Slug: <span className="font-mono text-foreground font-semibold">/{exp.slug}</span>
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
                            <strong className="uppercase">
                              {exp.preferredPayoutMethod || 'instapay'}
                            </strong>
                            {exp.instapayUsername ? ` (InstaPay: ${exp.instapayUsername})` : ''}
                            {exp.bankAccount?.accountNumber || exp.bankAccount?.iban
                              ? ` (Bank: ${exp.bankAccount?.bankName || ''} ${exp.bankAccount?.accountNumber || exp.bankAccount?.iban || ''})`
                              : ''}
                          </span>
                        </div>

                        {/* Admin-Only Social Media Links */}
                        {exp.socialLinks &&
                          Object.values(exp.socialLinks).some((v) => Boolean(v)) && (
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

                        {/* Categories badges */}
                        {exp.categories && exp.categories.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {exp.categories.map((c) => (
                              <span
                                key={c.categorySlug}
                                className="rounded-md bg-neutral-100 border border-border px-2 py-0.5 text-[10px] text-muted-foreground font-medium"
                              >
                                {c.categorySlug} ({c.subcategories?.length || 0} subcategories)
                              </span>
                            ))}
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
                        Inspect Dashboard ↗
                      </Link>
                      {exp.hasPendingInfoUpdate && exp.status !== 'pending_review' ? (
                        <>
                          <button
                            onClick={() => handleExpertAction(exp._id, 'reject_info_update')}
                            className="rounded-full px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                          >
                            Reject Info Changes
                          </button>
                          <button
                            onClick={() => handleExpertAction(exp._id, 'approve_info_update')}
                            className="rounded-full bg-indigo-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition"
                          >
                            Approve Info Changes ✓
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleExpertAction(exp._id, 'reject')}
                            className="rounded-full px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleExpertAction(exp._id, 'approve')}
                            className="rounded-full bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition"
                          >
                            Approve Expert ✓
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
                              onClick={() => handleExpertAction(exp._id, 'reject_info_update')}
                              className="rounded-full border border-rose-300 bg-white px-2.5 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50 shadow-2xs"
                            >
                              Discard Edits
                            </button>
                            <button
                              onClick={() => handleExpertAction(exp._id, 'approve_info_update')}
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
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Requested Name</span>
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
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Requested Headline / Role</span>
                            <span className="font-semibold text-foreground">{exp.pendingInfoUpdate.role}</span>
                          </div>
                        )}
                        {exp.pendingInfoUpdate.bio !== undefined && (
                          <div className="rounded-lg bg-white p-2.5 border border-indigo-100 sm:col-span-2 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Requested Short Bio</span>
                            <p className="text-foreground mt-0.5">{exp.pendingInfoUpdate.bio || '—'}</p>
                          </div>
                        )}
                        {exp.pendingInfoUpdate.about !== undefined && (
                          <div className="rounded-lg bg-white p-2.5 border border-indigo-100 sm:col-span-2 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Requested Detailed Description (About)</span>
                            <p className="text-foreground mt-0.5 whitespace-pre-line">{exp.pendingInfoUpdate.about || '—'}</p>
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
                                setDocModal({
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
                                setDocModal({
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
              ))
            )}
          </div>
        )}

        {/* TAB 2: Services / Offers Approval & Licensing Review */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-xs">
                <p className="text-base font-bold text-foreground">No Offers Found</p>
                <p className="mt-1 text-xs text-muted-foreground">No offers have been created yet.</p>
              </div>
            ) : (
              services.map((srv) => {
                const bType = srv.bookingType || 'APPOINTMENT'
                const sKind = srv.serviceKind || 'CONSULTATION'
                const dMode = srv.deliveryMode || 'ONLINE'

                let typeLabel = 'Consultation'
                let typeColor = 'bg-blue-50 text-blue-700 border border-blue-200'
                if (bType === 'APPOINTMENT') {
                  typeLabel = sKind === 'GENERAL_SERVICE' ? 'General Service (Outside MVP)' : 'Consultation'
                  typeColor = sKind === 'GENERAL_SERVICE' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
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
                          : 'border-border'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">{srv.title.en}</h3>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${typeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="rounded-full bg-neutral-100 border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {dMode === 'ONLINE' ? '🌐 Online' : dMode === 'IN_PERSON' ? '📍 In-Person' : '🔄 Hybrid'}
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
                            Intended Audience: <strong className="text-foreground">{srv.intendedAudience.en}</strong>
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
                          <p className="text-xs text-muted-foreground pt-1 max-w-2xl">{srv.description.en}</p>
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

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditService(srv)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
                          title="Edit Service Details"
                        >
                          <Edit2 size={13} /> Edit Offer
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteService(srv)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition"
                          title="Delete Service"
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
              })
            )}
          </div>
        )}

        {/* TAB 3: Bookings & Receipts */}
        {activeTab === 'bookings' && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
            <BookingsManager isAdmin={true} />
          </div>
        )}

        {/* TAB: Attendance Tracking & Disputes */}
        {activeTab === 'attendance' && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
            <AttendanceManager />
          </div>
        )}

        {/* TAB: Categories & Subcategories Taxonomy */}
        {activeTab === 'categories' && <CategoriesManager />}

        {/* TAB 4: Directory Experts */}
        {activeTab === 'experts' && (
          <div className="rounded-2xl border border-border bg-white overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-neutral-50/80 text-muted-foreground font-semibold">
                  <th className="py-3.5 px-4 font-semibold">Expert</th>
                  <th className="py-3.5 px-4 font-semibold">Headline</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Home Feature</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {experts.map((exp) => (
                  <tr key={exp._id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-foreground">{exp.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">/{exp.slug}</p>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{exp.role}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{exp.categorySlug || 'marketing'}</td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(exp._id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${exp.featuredHome
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-200'
                            : 'bg-neutral-100 text-muted-foreground border border-border hover:bg-neutral-200 hover:text-foreground'
                          }`}
                        title={
                          exp.featuredHome
                            ? 'Featured on Home Page (click to remove)'
                            : 'Click to feature on Home Page'
                        }
                      >
                        <span>{exp.featuredHome ? '⭐ Featured' : '☆ Not featured'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${exp.status === 'approved' || !exp.status
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : exp.status === 'pending_review'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                      >
                        {exp.status || 'approved'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/experts/${exp.slug}`}
                          target="_blank"
                          className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
                        >
                          Public Page ↗
                        </Link>
                        <Link
                          href={`/dashboard?expertId=${exp._id}`}
                          target="_blank"
                          className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
                        >
                          Workspace ↗
                        </Link>
                        {exp.status !== 'suspended' && (
                          <button
                            onClick={() => handleExpertAction(exp._id, 'suspend')}
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition"
                          >
                            Suspend
                          </button>
                        )}
                        {exp.status === 'suspended' && (
                          <button
                            onClick={() => handleExpertAction(exp._id, 'approve')}
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition"
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
          <div className="rounded-2xl border border-border bg-white overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-neutral-50/80 text-muted-foreground font-semibold">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-foreground">{u.displayName}</td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{u.email}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{u.phone || '—'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${u.role === 'admin'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : u.role === 'expert'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-neutral-100 text-muted-foreground border border-border'
                          }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : u.status === 'disabled'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-neutral-100 shadow-2xs transition"
                          title="Edit User"
                        >
                          ✏ Edit
                        </button>
                        {currentUser?._id !== u._id && currentUser?.email !== u.email && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs transition"
                            title="Delete User"
                          >
                            🗑 Delete
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

        {/* TAB 7: Tags Management */}
        {activeTab === 'tags' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
              <h3 className="text-base font-bold text-foreground mb-1">Add New Discovery Tag</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Tags help clients search and filter across Consultations, Workshops, and Webinars.
              </p>
              <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row gap-3 items-end">
                <label className="block text-xs font-bold text-foreground flex-1">
                  Tag Name (English)
                  <input
                    required
                    value={newTagEn}
                    onChange={(e) => setNewTagEn(e.target.value)}
                    placeholder="e.g. SEO Strategy"
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                  />
                </label>
                <label className="block text-xs font-bold text-foreground flex-1">
                  Tag Name (Arabic)
                  <input
                    required
                    dir="rtl"
                    value={newTagAr}
                    onChange={(e) => setNewTagAr(e.target.value)}
                    placeholder="مثال: استراتيجية تحسين محركات البحث"
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                  />
                </label>
                <button
                  type="submit"
                  disabled={creatingTag}
                  className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-primary hover:bg-accent-hover transition disabled:opacity-50 shrink-0 shadow-xs"
                >
                  {creatingTag ? 'Creating...' : '+ Add Tag'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-neutral-50/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Tag Name</th>
                    <th className="py-3 px-4">Arabic Name</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {tags.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No tags found. Create one above to get started.
                      </td>
                    </tr>
                  ) : (
                    tags.map((tag) => (
                      <tr key={tag._id} className="hover:bg-neutral-50/60 transition">
                        <td className="py-3 px-4 font-bold text-foreground">{tag.name?.en}</td>
                        <td className="py-3 px-4" dir="rtl">
                          {tag.name?.ar}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">{tag.slug}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${tag.isActive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-neutral-100 text-muted-foreground border border-border'
                              }`}
                          >
                            {tag.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleTag(tag.id || tag._id, tag.isActive)}
                            className="rounded-lg border border-border bg-white px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-neutral-50 shadow-2xs transition"
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

      {/* Create User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Create New User</h3>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {modalFeedback && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                {modalFeedback}
              </div>
            )}

            <label className="block text-xs font-bold text-foreground">
              Display Name *
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Omar Wagih"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Email Address *
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@bokbok.com"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Phone Number (Optional)
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Password *
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Role *
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              >
                <option value="expert">Expert</option>
                <option value="admin">Administrator</option>
                <option value="client">Client</option>
              </select>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingUser}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create Account ✓'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEditUser}
            className="w-full max-w-md rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit User Account</h3>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {editUserFeedback && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                {editUserFeedback}
              </div>
            )}

            <label className="block text-xs font-bold text-foreground">
              Display Name *
              <input
                required
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Email Address *
              <input
                required
                type="email"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Phone Number
              <input
                type="tel"
                value={editUserPhone}
                onChange={(e) => setEditUserPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-foreground">
                Role *
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                >
                  <option value="expert">Expert</option>
                  <option value="admin">Administrator</option>
                  <option value="client">Client</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-foreground">
                Account Status *
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
            </div>

            <label className="block text-xs font-bold text-foreground">
              Reset Password (Optional)
              <input
                type="password"
                value={editUserNewPassword}
                onChange={(e) => setEditUserNewPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs disabled:opacity-50"
              >
                {savingUser ? 'Saving...' : 'Save Changes ✓'}
              </button>
            </div>
          </form>
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
              <label htmlFor="editServiceActive" className="text-xs font-semibold text-foreground cursor-pointer">
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
    </main>
  )
}
