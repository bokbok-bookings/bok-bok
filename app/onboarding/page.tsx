'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/data/categories'
import { AvailabilityManager } from '@/components/dashboard/availability-manager'

interface SelectedCategoryItem {
  categorySlug: string
  subcategories: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(true)
  const [expertId, setExpertId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Profile & Identity
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('Cairo, Egypt')
  const [bio, setBio] = useState('')
  const [about, setAbout] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [instapayUsername, setInstapayUsername] = useState('')

  // Uploads
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [nationalIdFrontUrl, setNationalIdFrontUrl] = useState('')
  const [uploadingIdFront, setUploadingIdFront] = useState(false)
  const [nationalIdBackUrl, setNationalIdBackUrl] = useState('')
  const [uploadingIdBack, setUploadingIdBack] = useState(false)

  // Categories Selection (Maximum 3 Categories & their subcategories)
  const [categoriesList, setCategoriesList] = useState<any[]>(CATEGORIES)
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategoryItem[]>([
    {
      categorySlug: 'marketing',
      subcategories: ['branding-positioning', 'digital-marketing'],
    },
  ])

  // Step 2: First Service
  const [serviceTitleEn, setServiceTitleEn] = useState('1-on-1 Strategy & Advisory')
  const [serviceTitleAr, setServiceTitleAr] = useState('جلسة استشارية فردية واستراتيجية')
  const [serviceDescEn, setServiceDescEn] = useState('Detailed assessment and actionable guidance tailored to your goals.')
  const [serviceDescAr, setServiceDescAr] = useState('تقييم مفصل وتوجيه عملي مصمم خصيصاً لأهدافك.')
  const [serviceDuration, setServiceDuration] = useState(45)
  const [serviceBreak, setServiceBreak] = useState(10)
  const [priceEGP, setPriceEGP] = useState(500)
  const [priceUSD, setPriceUSD] = useState(20)
  const [priceSAR, setPriceSAR] = useState(75)

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const normalized = json.data.map((c: any) => ({
            ...c,
            title: c.name || c.title,
            subcategories: (c.subcategories || []).map((s: any) => ({
              ...s,
              title: s.name || s.title,
            })),
          }))
          setCategoriesList(normalized)
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !json.user) {
          router.push('/login?callbackUrl=/onboarding')
          return
        }
        if (json.user.role !== 'expert' && json.user.role !== 'admin') {
          router.push('/')
          return
        }
        if (json.user.expertId) {
          setExpertId(json.user.expertId)
          // Load existing draft
          fetch(`/api/dashboard/profile?expertId=${json.user.expertId}`)
            .then((r) => r.json())
            .then((pj) => {
              if (pj.success && pj.data) {
                const d = pj.data
                if (d.name) setName(d.name)
                if (d.role && d.role !== 'Consultant') setRole(d.role)
                if (d.location) setLocation(d.location)
                if (d.bio) setBio(d.bio)
                if (d.about) setAbout(d.about)
                if (d.image || d.avatarUrl) setAvatarUrl(d.image || d.avatarUrl)
                if (d.nationalIdFrontUrl) setNationalIdFrontUrl(d.nationalIdFrontUrl)
                if (d.nationalIdBackUrl) setNationalIdBackUrl(d.nationalIdBackUrl)
                if (d.tags?.length) setTagsStr(d.tags.join(', '))
                if (d.instapayUsername) setInstapayUsername(d.instapayUsername)
                if (Array.isArray(d.categories) && d.categories.length > 0) {
                  setSelectedCategories(d.categories)
                } else if (d.categorySlug) {
                  setSelectedCategories([
                    {
                      categorySlug: d.categorySlug,
                      subcategories: d.subcategorySlug ? [d.subcategorySlug] : [],
                    },
                  ])
                }
              }
            })
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  // Category toggle logic (Max 3)
  const toggleCategory = (catSlug: string) => {
    const exists = selectedCategories.some((c) => c.categorySlug === catSlug)
    if (exists) {
      if (selectedCategories.length === 1) {
        alert('You must have at least 1 primary category selected.')
        return
      }
      setSelectedCategories((prev) => prev.filter((c) => c.categorySlug !== catSlug))
    } else {
      if (selectedCategories.length >= 3) {
        alert('You can select a maximum of 3 primary categories.')
        return
      }
      const catObj = CATEGORIES.find((c) => c.slug === catSlug)
      const defaultSub = catObj?.subcategories[0]?.slug ? [catObj.subcategories[0].slug] : []
      setSelectedCategories((prev) => [...prev, { categorySlug: catSlug, subcategories: defaultSub }])
    }
  }

  // Subcategory toggle logic
  const toggleSubcategory = (catSlug: string, subSlug: string) => {
    setSelectedCategories((prev) =>
      prev.map((c) => {
        if (c.categorySlug !== catSlug) return c
        const hasSub = c.subcategories.includes(subSlug)
        return {
          ...c,
          subcategories: hasSub
            ? c.subcategories.filter((s) => s !== subSlug)
            : [...c.subcategories, subSlug],
        }
      })
    )
  }

  // Upload helpers
  const handleUploadFile = async (
    file: File,
    type: 'avatar' | 'id_document',
    onSuccess: (url: string) => void,
    setLoadingState: (val: boolean) => void
  ) => {
    setLoadingState(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/upload?type=${type}`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success && json.url) {
        onSuccess(json.url)
      } else {
        alert(json.error || 'Failed to upload document')
      }
    } catch {
      alert('Error uploading document. Please try again.')
    } finally {
      setLoadingState(false)
    }
  }

  const handleSaveStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !role.trim()) {
      alert('Full Name and Professional Headline are required')
      return
    }

    if (!avatarUrl) {
      alert('Please upload your profile photo')
      return
    }

    if (!nationalIdFrontUrl || !nationalIdBackUrl) {
      alert('Please upload both Front and Back sides of your National ID for verification')
      return
    }

    if (selectedCategories.length === 0) {
      alert('Please select at least 1 primary category')
      return
    }

    try {
      const primaryCat = selectedCategories[0]
      await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId,
          name,
          role,
          location,
          categorySlug: primaryCat.categorySlug,
          subcategorySlug: primaryCat.subcategories[0] || '',
          categories: selectedCategories,
          bio,
          about,
          tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
          image: avatarUrl,
          avatarUrl,
          nationalIdFrontUrl,
          nationalIdBackUrl,
          instapayUsername,
        }),
      })
      setStep(2)
    } catch (err: any) {
      alert(err.message || 'Error saving profile')
    }
  }

  const handleSaveStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceTitleEn || !serviceTitleAr) {
      alert('Service titles in English and Arabic are required')
      return
    }

    try {
      const primaryCat = selectedCategories[0] || { categorySlug: 'marketing-growth', subcategories: [] }
      await fetch(`/api/dashboard/services?expertId=${expertId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: { en: serviceTitleEn, ar: serviceTitleAr },
          description: { en: serviceDescEn, ar: serviceDescAr },
          categorySlug: primaryCat.categorySlug,
          subcategorySlug: primaryCat.subcategories[0] || '',
          durationMinutes: serviceDuration,
          breakAfterMinutes: serviceBreak,
          pricing: {
            baseCurrency: 'EGP',
            prices: { EGP: priceEGP, USD: priceUSD, SAR: priceSAR },
          },
          isActive: true,
          isMostBooked: true,
        }),
      })
      setStep(3)
    } catch (err: any) {
      alert(err.message || 'Error creating service')
    }
  }

  const handleSubmitForReview = async () => {
    if (!avatarUrl || !nationalIdFrontUrl || !nationalIdBackUrl) {
      alert('Please ensure your profile photo and both National ID sides are uploaded.')
      setStep(1)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId }),
      })
      const json = await res.json()
      if (json.success) {
        router.push('/dashboard')
      } else {
        alert(json.error || 'Failed to submit onboarding')
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting for review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-20 text-center text-xs text-[#8b94a1]">Loading onboarding wizard...</div>
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#14243b] py-12 px-5 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eeeae4] pb-6">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#ef5b4c] text-sm font-black text-white">
              B
            </span>
            Bok Bok Onboarding
          </Link>
          <span className="text-xs font-bold text-[#8b94a1]">
            Step {step} of 4
          </span>
        </div>

        {/* Stepper bar */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {['Profile & Identity', 'First Service', 'Working Schedule', 'Review & Submit'].map((title, idx) => {
            const stepNum = idx + 1
            const isDone = step > stepNum
            const isCurrent = step === stepNum
            return (
              <div key={title} className="text-center">
                <div
                  className={`h-1.5 rounded-full transition ${
                    isDone || isCurrent ? 'bg-[#ef5b4c]' : 'bg-[#e7e2da]'
                  }`}
                />
                <p className={`mt-2 text-[11px] font-bold truncate ${isCurrent ? 'text-[#14243b]' : 'text-[#8b94a1]'}`}>
                  {title}
                </p>
              </div>
            )
          })}
        </div>

        {/* Step 1: Profile & Identity */}
        {step === 1 && (
          <form onSubmit={handleSaveStep1} className="mt-8 rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#14243b]">Create your verified expert profile</h2>
              <p className="mt-1 text-xs text-[#637084]">
                Upload your credentials and specify up to 3 primary areas of expertise.
              </p>
            </div>

            {/* Profile Picture & National ID Uploads */}
            <div className="rounded-2xl border border-[#e7e2da] bg-[#faf8f5] p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#14243b]">
                Identity & Verification Documents *
              </h3>

              {/* Profile Photo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[#eeeae4] pb-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-[#e7e2da]">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-xs font-bold text-[#8b94a1]">
                      Photo
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#14243b]">Profile Picture *</p>
                  <p className="text-[11px] text-[#8b94a1]">Professional, high-resolution headshot.</p>
                </div>
                <label className="cursor-pointer rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b]">
                  {uploadingAvatar ? 'Uploading...' : avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUploadFile(f, 'avatar', setAvatarUrl, setUploadingAvatar)
                    }}
                  />
                </label>
              </div>

              {/* National ID Front & Back */}
              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                {/* ID Front */}
                <div className="rounded-xl border border-[#e7e2da] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#14243b]">National ID (Front) *</p>
                    {nationalIdFrontUrl ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        ✓ Uploaded
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-[#8b94a1]">Front face of National ID card or passport.</p>
                  <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-[#dedbd5] p-2.5 text-center text-xs font-bold text-[#14243b] hover:border-[#ef5b4c]">
                    {uploadingIdFront ? 'Uploading...' : nationalIdFrontUrl ? 'Replace Front ID' : 'Select Front ID Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUploadFile(f, 'id_document', setNationalIdFrontUrl, setUploadingIdFront)
                      }}
                    />
                  </label>
                </div>

                {/* ID Back */}
                <div className="rounded-xl border border-[#e7e2da] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#14243b]">National ID (Back) *</p>
                    {nationalIdBackUrl ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        ✓ Uploaded
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-[#8b94a1]">Back side of National ID card.</p>
                  <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-[#dedbd5] p-2.5 text-center text-xs font-bold text-[#14243b] hover:border-[#ef5b4c]">
                    {uploadingIdBack ? 'Uploading...' : nationalIdBackUrl ? 'Replace Back ID' : 'Select Back ID Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUploadFile(f, 'id_document', setNationalIdBackUrl, setUploadingIdBack)
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <label className="text-xs font-bold text-[#14243b]">
                Full Name *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Omar Wagih"
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
              <label className="text-xs font-bold text-[#14243b]">
                Professional Headline *
                <input
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Product & Growth Consultant"
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
            </div>

            {/* Categories & Subcategories (Max 3) */}
            <div className="rounded-2xl border border-[#e7e2da] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#14243b]">
                    Specialty Categories (Max 3) *
                  </h3>
                  <p className="text-[11px] text-[#8b94a1] mt-0.5">
                    Select up to 3 main categories and customize their subcategories.
                  </p>
                </div>
                <span className="rounded-full bg-[#f4f2ee] px-2.5 py-1 text-xs font-bold text-[#14243b]">
                  {selectedCategories.length} / 3 selected
                </span>
              </div>

              {/* Main Categories Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {categoriesList.map((cat) => {
                  const isSelected = selectedCategories.some((c) => c.categorySlug === cat.slug)
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => toggleCategory(cat.slug)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? 'bg-[#14243b] text-white shadow-sm'
                          : 'border border-[#dedbd5] bg-white text-[#637084] hover:border-[#14243b]'
                      }`}
                    >
                      {cat.title?.en || cat.name?.en} {isSelected ? '✓' : '+'}
                    </button>
                  )
                })}
              </div>

              {/* Subcategories for Selected Categories */}
              <div className="space-y-4 pt-3 border-t border-[#eeeae4]">
                {selectedCategories.map((selCat) => {
                  const fullCat = categoriesList.find((c) => c.slug === selCat.categorySlug)
                  if (!fullCat) return null
                  return (
                    <div key={selCat.categorySlug} className="rounded-xl border border-[#eeeae4] bg-[#faf8f5] p-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-[#14243b]">
                          {fullCat.title?.en || fullCat.name?.en} — <span className="text-[#8b94a1] font-normal" dir="rtl">{fullCat.title?.ar || fullCat.name?.ar}</span>
                        </span>
                        <span className="text-[10px] text-[#8b94a1]">
                          {selCat.subcategories.length} subcategories selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(fullCat.subcategories || []).map((sub: any) => {
                          const isSubSelected = selCat.subcategories.includes(sub.slug)
                          return (
                            <button
                              key={sub.slug}
                              type="button"
                              onClick={() => toggleSubcategory(selCat.categorySlug, sub.slug)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                                isSubSelected
                                  ? 'bg-[#ef5b4c] text-white'
                                  : 'border border-[#dedbd5] bg-white text-[#637084] hover:border-[#ef5b4c]'
                              }`}
                            >
                              {sub.title.en}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#14243b]">
                Location
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Cairo, Egypt"
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
              <label className="text-xs font-bold text-[#14243b]">
                InstaPay Handle or Phone Number
                <input
                  value={instapayUsername}
                  onChange={(e) => setInstapayUsername(e.target.value)}
                  placeholder="e.g. username@instapay"
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
            </div>

            <label className="block text-xs font-bold text-[#14243b]">
              One-Sentence Card Bio
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I help founders build clear roadmaps and scalable brands."
                className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
              />
            </label>

            <label className="block text-xs font-bold text-[#14243b]">
              In-Depth About Section
              <textarea
                rows={3}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Share your background, achievements, and how your consultation sessions work..."
                className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2 text-xs outline-none focus:border-[#ef5b4c]"
              />
            </label>

            <label className="block text-xs font-bold text-[#14243b]">
              Specialty Tags (Comma separated)
              <input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Marketing, Growth, Strategy, Product"
                className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
              />
            </label>

            <div className="flex items-center justify-end border-t border-[#eeeae4] pt-5">
              <button
                type="submit"
                className="rounded-full bg-[#ef5b4c] px-7 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#14243b]"
              >
                Continue to Services →
              </button>
            </div>
          </form>
        )}

        {/* Step 2: First Service */}
        {step === 2 && (
          <form onSubmit={handleSaveStep2} className="mt-8 rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-10 shadow-sm space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-[#14243b]">Define your first consultation offering</h2>
              <p className="mt-1 text-xs text-[#637084]">
                Create your primary offering. New services are submitted for admin approval before going live to clients.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <label className="text-xs font-bold text-[#14243b]">
                Service Title (English) *
                <input
                  required
                  value={serviceTitleEn}
                  onChange={(e) => setServiceTitleEn(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
              <label className="text-xs font-bold text-[#14243b]">
                Service Title (Arabic) *
                <input
                  required
                  dir="rtl"
                  value={serviceTitleAr}
                  onChange={(e) => setServiceTitleAr(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#14243b]">
                Description (English)
                <textarea
                  rows={2}
                  value={serviceDescEn}
                  onChange={(e) => setServiceDescEn(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
              <label className="text-xs font-bold text-[#14243b]">
                Description (Arabic)
                <textarea
                  rows={2}
                  dir="rtl"
                  value={serviceDescAr}
                  onChange={(e) => setServiceDescAr(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#14243b]">
                Duration (Minutes)
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
              <label className="text-xs font-bold text-[#14243b]">
                Buffer Break After (Minutes)
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={serviceBreak}
                  onChange={(e) => setServiceBreak(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
                />
              </label>
            </div>

            {/* Pricing */}
            <div className="rounded-2xl border border-[#e7e2da] bg-[#faf8f5] p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#14243b]">Multi-Currency Pricing</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-bold text-[#14243b]">
                  Price in EGP *
                  <input
                    type="number"
                    value={priceEGP}
                    onChange={(e) => setPriceEGP(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-white px-3 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
                <label className="text-xs font-bold text-[#14243b]">
                  Price in USD ($)
                  <input
                    type="number"
                    value={priceUSD}
                    onChange={(e) => setPriceUSD(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-white px-3 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
                <label className="text-xs font-bold text-[#14243b]">
                  Price in SAR (ريال)
                  <input
                    type="number"
                    value={priceSAR}
                    onChange={(e) => setPriceSAR(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-white px-3 py-2 text-xs outline-none focus:border-[#ef5b4c]"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#eeeae4] pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-[#dedbd5] px-5 py-2.5 text-xs font-bold text-[#637084] hover:border-[#14243b]"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#ef5b4c] px-7 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#14243b]"
              >
                Continue to Working Hours →
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Availability */}
        {step === 3 && (
          <div className="mt-8 rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#14243b]">Set your regular working hours</h2>
              <p className="mt-1 text-xs text-[#637084]">
                Clients will only be able to book during times you specify here. You can fine-tune holidays anytime later.
              </p>
            </div>

            <AvailabilityManager
              initialExpertId={expertId}
              showExpertPicker={false}
            />

            <div className="flex items-center justify-between border-t border-[#eeeae4] pt-5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full border border-[#dedbd5] px-5 py-2.5 text-xs font-bold text-[#637084] hover:border-[#14243b]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-full bg-[#ef5b4c] px-7 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#14243b]"
              >
                Proceed to Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="mt-8 rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#14243b]">Ready to submit for review</h2>
              <p className="mt-1 text-xs text-[#637084]">
                Once submitted, your profile and initial offering will be reviewed by an administrator.
              </p>
            </div>

            <div className="rounded-2xl border border-[#eeeae4] bg-[#faf8f5] p-5 space-y-3 text-xs">
              <div className="flex items-center gap-4 border-b border-[#eeeae4] pb-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-[#e7e2da]">
                  {avatarUrl && <Image src={avatarUrl} alt={name} fill className="object-cover" />}
                </div>
                <div>
                  <strong className="text-sm text-[#14243b]">{name}</strong>
                  <p className="text-xs text-[#637084]">{role}</p>
                </div>
              </div>

              <div className="flex justify-between border-b border-[#eeeae4] pb-2">
                <span className="text-[#8b94a1]">National ID (Front & Back):</span>
                <strong className={nationalIdFrontUrl && nationalIdBackUrl ? 'text-emerald-700' : 'text-red-600'}>
                  {nationalIdFrontUrl && nationalIdBackUrl ? '✓ Both sides uploaded' : 'Missing required ID documents'}
                </strong>
              </div>

              <div className="flex justify-between border-b border-[#eeeae4] pb-2">
                <span className="text-[#8b94a1]">Selected Categories:</span>
                <strong className="text-[#14243b] text-right">
                  {selectedCategories.map((c) => {
                    const found = CATEGORIES.find((cat) => cat.slug === c.categorySlug)
                    return found?.title.en
                  }).join(', ')}
                </strong>
              </div>

              <div className="flex justify-between border-b border-[#eeeae4] pb-2">
                <span className="text-[#8b94a1]">Primary Offering:</span>
                <strong className="text-[#14243b]">{serviceTitleEn} ({serviceDuration} min — {priceEGP} EGP)</strong>
              </div>

              <div className="flex justify-between">
                <span className="text-[#8b94a1]">InstaPay Handle:</span>
                <strong className="text-[#14243b]">{instapayUsername || 'Not provided yet'}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#eeeae4] pt-5">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-full border border-[#dedbd5] px-5 py-2.5 text-xs font-bold text-[#637084] hover:border-[#14243b]"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={submitting || !avatarUrl || !nationalIdFrontUrl || !nationalIdBackUrl}
                onClick={handleSubmitForReview}
                className="rounded-full bg-[#14243b] px-8 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#ef5b4c] disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Profile for Admin Approval ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
