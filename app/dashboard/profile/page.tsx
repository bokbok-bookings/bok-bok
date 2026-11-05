'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BokBok } from '@/components/brand/bok-bok'
import {
  CATEGORIES,
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
} from '@/lib/data/categories'
import { CloudinaryUploadWidget } from '@/components/ui/cloudinary-upload-widget'
import { Lock, Plus, Trash2, FileText, Building2, UserCheck, CreditCard, CheckCircle2, Clock } from 'lucide-react'

interface CertificateItem {
  title: string
  fileUrl: string
  fileType: 'pdf' | 'image'
}

export default function ExpertProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [savedPendingReview, setSavedPendingReview] = useState(false)

  const [profile, setProfile] = useState<any>(null)
  const [accountType, setAccountType] = useState<'expert' | 'organization'>('expert')
  const [fName, setFName] = useState('')
  const [lName, setLName] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [categorySlug, setCategorySlug] = useState('marketing')
  const [subcategorySlug, setSubcategorySlug] = useState('marketing-strategy')
  const [bio, setBio] = useState('')
  const [about, setAbout] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [image, setImage] = useState('')

  // Payout Preferences
  const [preferredPayoutMethod, setPreferredPayoutMethod] = useState<'instapay' | 'bank_account'>('instapay')
  const [instapayUsername, setInstapayUsername] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [iban, setIban] = useState('')

  // Verification Documents
  const [nationalIdFrontUrl, setNationalIdFrontUrl] = useState('')
  const [nationalIdBackUrl, setNationalIdBackUrl] = useState('')
  const [commercialRegisterNumber, setCommercialRegisterNumber] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [commercialRegisterUrl, setCommercialRegisterUrl] = useState('')
  const [taxIdDocumentUrl, setTaxIdDocumentUrl] = useState('')

  // Optional Certificates
  const [certificates, setCertificates] = useState<CertificateItem[]>([])
  const [newCertTitle, setNewCertTitle] = useState('')
  const [newCertUrl, setNewCertUrl] = useState('')
  const [newCertType, setNewCertType] = useState<'pdf' | 'image'>('image')

  // Admin-Only Social Media Links
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [website, setWebsite] = useState('')

  // Suggested Category
  const [showSuggestCategory, setShowSuggestCategory] = useState(false)
  const [suggestedCategoryName, setSuggestedCategoryName] = useState('')
  const [suggestedSubcategoryName, setSuggestedSubcategoryName] = useState('')
  const [suggestedCategoryNotes, setSuggestedCategoryNotes] = useState('')

  const [categoriesList, setCategoriesList] = useState<any[]>(CATEGORIES)

  const selectedCategory =
    categoriesList.find((c) => c.slug === categorySlug) || categoriesList[0] || CATEGORIES[0]

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

    fetch('/api/dashboard/profile')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const raw = json.data
          const d = raw.hasPendingInfoUpdate && raw.pendingInfoUpdate
            ? { ...raw, ...raw.pendingInfoUpdate }
            : raw
          setProfile(raw)
          if (d.accountType === 'organization' || d.accountType === 'expert') {
            setAccountType(d.accountType)
          }
          if (d.fName || d.lName) {
            setFName(d.fName || '')
            setLName(d.lName || '')
          } else if (d.name) {
            const parts = String(d.name).trim().split(/\s+/)
            setFName(parts[0] || '')
            setLName(parts.slice(1).join(' ') || '')
          }
          setRole(d.role || '')
          setLocation(d.location || '')
          setPhone(d.phone || '')
          setWhatsapp(d.whatsapp || '')
          const validCat = isAllowedMvpCategory(d.categorySlug) ? d.categorySlug : 'marketing'
          const fallbackCatObj = CATEGORIES.find((c) => c.slug === validCat) || CATEGORIES[0]
          const validSub = isAllowedMvpSubcategory(validCat, d.subcategorySlug)
            ? d.subcategorySlug
            : fallbackCatObj.subcategories[0]?.slug || ''
          setCategorySlug(validCat)
          setSubcategorySlug(validSub)
          setBio(d.bio || '')
          setAbout(d.about || '')
          setTagsStr(d.tags?.join(', ') || '')
          setImage(d.avatarUrl || d.image || '')
          if (d.preferredPayoutMethod === 'bank_account' || d.preferredPayoutMethod === 'instapay') {
            setPreferredPayoutMethod(d.preferredPayoutMethod)
          }
          setInstapayUsername(d.instapayUsername || '')
          if (d.bankAccount) {
            setBankName(d.bankAccount.bankName || '')
            setAccountHolderName(d.bankAccount.accountHolderName || '')
            setAccountNumber(d.bankAccount.accountNumber || '')
            setIban(d.bankAccount.iban || '')
          }
          if (d.nationalIdFrontUrl) setNationalIdFrontUrl(d.nationalIdFrontUrl)
          if (d.nationalIdBackUrl) setNationalIdBackUrl(d.nationalIdBackUrl)
          if (d.commercialRegisterNumber) setCommercialRegisterNumber(d.commercialRegisterNumber)
          if (d.taxNumber) setTaxNumber(d.taxNumber)
          if (d.commercialRegisterUrl) setCommercialRegisterUrl(d.commercialRegisterUrl)
          if (d.taxIdDocumentUrl) setTaxIdDocumentUrl(d.taxIdDocumentUrl)
          if (Array.isArray(d.certificates)) setCertificates(d.certificates)
          if (d.socialLinks) {
            setLinkedin(d.socialLinks.linkedin || '')
            setInstagram(d.socialLinks.instagram || '')
            setFacebook(d.socialLinks.facebook || '')
            setWebsite(d.socialLinks.website || '')
          }
          if (d.suggestedCategory) {
            setShowSuggestCategory(true)
            setSuggestedCategoryName(d.suggestedCategory.categoryName || '')
            setSuggestedSubcategoryName(d.suggestedCategory.subcategoryName || '')
            setSuggestedCategoryNotes(d.suggestedCategory.notes || '')
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleAddCertificate = () => {
    if (!newCertTitle.trim() || !newCertUrl) {
      alert('Please enter a certificate title and upload the file (PDF or image).')
      return
    }
    setCertificates((prev) => [
      ...prev,
      {
        title: newCertTitle.trim(),
        fileUrl: newCertUrl,
        fileType: newCertType,
      },
    ])
    setNewCertTitle('')
    setNewCertUrl('')
    setNewCertType('image')
  }

  const handleRemoveCertificate = (index: number) => {
    setCertificates((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setErrorMessage('')

    const hasInstapay = Boolean(instapayUsername.trim())
    const hasBank = Boolean(accountNumber.trim() || iban.trim())

    if (!hasInstapay && !hasBank) {
      setErrorMessage('Please provide at least one payout method (InstaPay or Bank Account).')
      setSaving(false)
      return
    }
    if (preferredPayoutMethod === 'instapay' && !hasInstapay) {
      setErrorMessage('Please enter your InstaPay handle or phone number since InstaPay is selected as preferred.')
      setSaving(false)
      return
    }
    if (preferredPayoutMethod === 'bank_account' && !hasBank) {
      setErrorMessage('Please enter your Bank Account Number or IBAN since Bank Account is selected as preferred.')
      setSaving(false)
      return
    }

    const finalCertificates = [...certificates]
    if (newCertTitle.trim() && newCertUrl) {
      finalCertificates.push({
        title: newCertTitle.trim(),
        fileUrl: newCertUrl,
        fileType: newCertType,
      })
      setCertificates(finalCertificates)
      setNewCertTitle('')
      setNewCertUrl('')
    }

    try {
      const fullName = `${fName.trim()} ${lName.trim()}`.trim()
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          fName: fName.trim(),
          lName: lName.trim(),
          name: fullName,
          role: role.trim(),
          location: location.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          categorySlug,
          subcategorySlug,
          suggestedCategory:
            showSuggestCategory && (suggestedCategoryName.trim() || suggestedSubcategoryName.trim())
              ? {
                categoryName: suggestedCategoryName.trim(),
                subcategoryName: suggestedSubcategoryName.trim(),
                notes: suggestedCategoryNotes.trim(),
              }
              : null,
          bio,
          about,
          tags: tagsStr
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          image,
          avatarUrl: image,
          nationalIdFrontUrl,
          nationalIdBackUrl,
          commercialRegisterNumber: commercialRegisterNumber.trim(),
          taxNumber: taxNumber.trim(),
          commercialRegisterUrl,
          taxIdDocumentUrl,
          certificates: finalCertificates,
          socialLinks: {
            linkedin: linkedin.trim(),
            instagram: instagram.trim(),
            facebook: facebook.trim(),
            website: website.trim(),
          },
          preferredPayoutMethod,
          instapayUsername: instapayUsername.trim(),
          bankAccount: {
            bankName: bankName.trim(),
            accountHolderName: accountHolderName.trim(),
            accountNumber: accountNumber.trim(),
            iban: iban.trim(),
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        const isPending = Boolean(json.pendingReview)
        setSavedPendingReview(isPending)
        setMessage(
          isPending
            ? 'Info saved! Critical changes (name, description, certificates, etc.) have been submitted for admin review.'
            : 'Info saved successfully!'
        )
        setSaveModalOpen(true)
        setProfile((prev: any) =>
          prev
            ? {
              ...prev,
              slug: json.slug || prev.slug,
              hasPendingInfoUpdate: isPending ? true : prev.hasPendingInfoUpdate,
              pendingInfoRejectionReason: isPending ? null : prev.pendingInfoRejectionReason,
            }
            : prev
        )
        router.refresh()
      } else {
        setErrorMessage(json.error || 'Failed to update info')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating info')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Loading info...</div>
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Info</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your <BokBok /> account details, verification documents, payout preferences, and directory info.
          </p>
        </div>
        {profile?.slug && (
          <Link
            href={`/experts/${profile.slug}`}
            target="_blank"
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-primary hover:border-primary"
          >
            Preview Profile ↗
          </Link>
        )}
      </div>

      {profile?.hasPendingInfoUpdate && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
          <Clock size={16} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">Info Update Under Admin Review</p>
            <p className="mt-0.5 text-amber-800/90">
              Your recent edits to critical profile fields (name, description, certificates, or verification documents) are awaiting admin approval before appearing on your public profile.
            </p>
          </div>
        </div>
      )}

      {profile?.pendingInfoRejectionReason && !profile?.hasPendingInfoUpdate && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
          <p className="font-bold">Previous Info Update Feedback:</p>
          <p className="mt-0.5">{profile.pendingInfoRejectionReason}</p>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-6"
      >
        {/* Photo Upload */}
        <div className="flex items-center gap-5 border-b border-border pb-6">
          <div className="relative size-20 overflow-hidden rounded-full border border-border bg-muted">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Profile" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-xs font-black text-muted-foreground">
                PHOTO
              </div>
            )}
          </div>
          <div>
            <CloudinaryUploadWidget
              folder="bokbok/avatars"
              cropping={true}
              croppingAspectRatio={1}
              fallbackType="avatar"
              onSuccess={(result) => {
                setImage(result.url)
                setErrorMessage('')
                setMessage('Photo uploaded. Click "Save Info Changes" below to apply.')
              }}
            >
              <button
                type="button"
                className="inline-block cursor-pointer rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-primary hover:border-primary hover:shadow-sm transition"
              >
                Change Profile Photo
              </button>
            </CloudinaryUploadWidget>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Displayed in your dashboard avatar circle and public directory card.
            </p>
          </div>
        </div>

        {/* Account Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('expert')}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${accountType === 'expert'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-background text-foreground hover:border-primary'
              }`}
          >
            <UserCheck size={16} className={accountType === 'expert' ? 'text-accent' : 'text-primary'} />
            <div>
              <p className="text-xs font-bold">Individual Expert</p>
              <p className={`text-[10px] ${accountType === 'expert' ? 'text-white/75' : 'text-muted-foreground'}`}>
                National ID / Passport
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAccountType('organization')}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${accountType === 'organization'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-background text-foreground hover:border-primary'
              }`}
          >
            <Building2 size={16} className={accountType === 'organization' ? 'text-accent' : 'text-primary'} />
            <div>
              <p className="text-xs font-bold">Organization (مؤسسة)</p>
              <p className={`text-[10px] ${accountType === 'organization' ? 'text-white/75' : 'text-muted-foreground'}`}>
                سجل تجاري & رقم ضريبي
              </p>
            </div>
          </button>
        </div>

        {/* First Name (fName) & Last Name (lName) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-primary">
            First Name (fName) *
            <input
              required
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs font-bold text-primary">
            Last Name (lName) *
            <input
              required
              value={lName}
              onChange={(e) => setLName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-primary">
            Professional Headline *
            <input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Marketing Strategy Consultant"
              className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs font-bold text-primary">
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Cairo, Egypt or Remote"
              className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs outline-none focus:border-accent"
            />
          </label>
        </div>

        {/* Admin-Only Phone & WhatsApp */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Lock size={13} className="text-accent" />
              Admin Contact (Phone & WhatsApp)
            </span>
            <span className="rounded-full bg-secondary border border-accent/40 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              Admin Only • Hidden from Clients
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-primary">
              Phone Number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs font-bold text-primary">
              WhatsApp Number
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+20 100 000 0000"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>
          </div>
        </div>

        {/* Payout Preferences */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <CreditCard size={14} className="text-accent" />
              Payout Preferences (InstaPay or Bank Account)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPreferredPayoutMethod('instapay')}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition text-left ${preferredPayoutMethod === 'instapay'
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-foreground hover:border-primary'
                }`}
            >
              ⚡ Prefer InstaPay
            </button>
            <button
              type="button"
              onClick={() => setPreferredPayoutMethod('bank_account')}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition text-left ${preferredPayoutMethod === 'bank_account'
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-foreground hover:border-primary'
                }`}
            >
              🏦 Prefer Bank Account
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-primary sm:col-span-2">
              InstaPay Address / Phone {preferredPayoutMethod === 'instapay' ? '*' : '(Optional)'}
              <input
                required={preferredPayoutMethod === 'instapay'}
                value={instapayUsername}
                onChange={(e) => setInstapayUsername(e.target.value)}
                placeholder="e.g. yourname@instapay or 010xxxxxxxx"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs font-bold text-primary">
              Bank Name (Optional)
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. CIB, QNB"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs font-bold text-primary">
              Account Holder Name (Optional)
              <input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Account holder name"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs font-bold text-primary">
              Account Number (Optional)
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs font-bold text-primary">
              IBAN (Optional)
              <input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="EG00..."
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>
          </div>
        </div>

        {/* Category & Subcategory + Suggest New */}
        <div className="rounded-2xl border border-border p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-primary">
              Primary Category
              <select
                value={categorySlug}
                onChange={(e) => {
                  setCategorySlug(e.target.value)
                  const cat = categoriesList.find((c) => c.slug === e.target.value)
                  setSubcategorySlug(cat?.subcategories?.[0]?.slug || '')
                }}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              >
                {categoriesList.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title?.en || c.name?.en} — {c.title?.ar || c.name?.ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-primary">
              Primary Subcategory
              <select
                value={subcategorySlug}
                onChange={(e) => setSubcategorySlug(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              >
                {(selectedCategory?.subcategories || []).map((sub: any) => (
                  <option key={sub.slug} value={sub.slug}>
                    {sub.title?.en || sub.name?.en} — {sub.title?.ar || sub.name?.ar}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setShowSuggestCategory(!showSuggestCategory)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <Plus size={14} className="text-accent" />
              {showSuggestCategory
                ? 'Hide category / subcategory suggestion'
                : 'Suggest adding a new category or subcategory'}
            </button>
            {showSuggestCategory && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 rounded-xl border border-border bg-muted/30 p-3.5">
                <label className="text-xs font-bold text-primary">
                  Suggested Category
                  <input
                    value={suggestedCategoryName}
                    onChange={(e) => setSuggestedCategoryName(e.target.value)}
                    placeholder="e.g. Sustainability"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  Suggested Subcategory
                  <input
                    value={suggestedSubcategoryName}
                    onChange={(e) => setSuggestedSubcategoryName(e.target.value)}
                    placeholder="e.g. ESG Advisory"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Verification Documents (Individual vs Organization) */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-primary">
            {accountType === 'organization'
              ? 'Organization Legal Info (سجل تجاري & رقم ضريبي)'
              : 'Verification Documents (National ID / Passport)'}
          </h3>
          {accountType === 'organization' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-primary">
                  سجل تجاري (Commercial Register No.)
                  <input
                    value={commercialRegisterNumber}
                    onChange={(e) => setCommercialRegisterNumber(e.target.value)}
                    placeholder="رقم السجل التجاري"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </label>
                <CloudinaryUploadWidget
                  folder="bokbok/national_ids"
                  fallbackType="id_document"
                  allowPdf={true}
                  onSuccess={(result) => setCommercialRegisterUrl(result.url)}
                >
                  <button
                    type="button"
                    className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-primary hover:border-primary"
                  >
                    {commercialRegisterUrl ? '✓ سجل تجاري Uploaded (Replace)' : 'Upload سجل تجاري'}
                  </button>
                </CloudinaryUploadWidget>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-primary">
                  رقم ضريبي (Tax Number)
                  <input
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="الرقم الضريبي"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </label>
                <CloudinaryUploadWidget
                  folder="bokbok/national_ids"
                  fallbackType="id_document"
                  allowPdf={true}
                  onSuccess={(result) => setTaxIdDocumentUrl(result.url)}
                >
                  <button
                    type="button"
                    className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-primary hover:border-primary"
                  >
                    {taxIdDocumentUrl ? '✓ بطاقة ضريبية Uploaded (Replace)' : 'Upload بطاقة ضريبية'}
                  </button>
                </CloudinaryUploadWidget>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                <span className="text-xs font-bold text-primary">National ID / Passport (Front)</span>
                <CloudinaryUploadWidget
                  folder="bokbok/national_ids"
                  fallbackType="id_document"
                  onSuccess={(result) => setNationalIdFrontUrl(result.url)}
                >
                  <button
                    type="button"
                    className="text-xs font-bold text-primary underline"
                  >
                    {nationalIdFrontUrl ? '✓ Replace Front' : 'Upload Front'}
                  </button>
                </CloudinaryUploadWidget>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                <span className="text-xs font-bold text-primary">National ID (Back)</span>
                <CloudinaryUploadWidget
                  folder="bokbok/national_ids"
                  fallbackType="id_document"
                  onSuccess={(result) => setNationalIdBackUrl(result.url)}
                >
                  <button
                    type="button"
                    className="text-xs font-bold text-primary underline"
                  >
                    {nationalIdBackUrl ? '✓ Replace Back' : 'Upload Back'}
                  </button>
                </CloudinaryUploadWidget>
              </div>
            </div>
          )}
        </div>

        {/* Optional Certificates */}
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-primary">
            Certificates (Optional)
          </h3>
          {certificates.length > 0 && (
            <div className="space-y-2">
              {certificates.map((cert, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary" />
                    <span className="font-bold text-primary">{cert.title}</span>
                    <a
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-muted-foreground underline"
                    >
                      ({cert.fileType.toUpperCase()}) ↗
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCertificate(idx)}
                    className="text-destructive hover:opacity-80"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
            <label className="text-xs font-bold text-primary">
              Certificate Title
              <input
                value={newCertTitle}
                onChange={(e) => setNewCertTitle(e.target.value)}
                placeholder="e.g. PMP Certified"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent"
              />
            </label>
            <CloudinaryUploadWidget
              folder="bokbok/certificates"
              fallbackType="certificate"
              allowPdf={true}
              onSuccess={(result) => {
                setNewCertUrl(result.url)
                const isPdf = result.format === 'pdf' || result.url.toLowerCase().endsWith('.pdf')
                setNewCertType(isPdf ? 'pdf' : 'image')
              }}
            >
              <button
                type="button"
                className="rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-primary hover:border-primary"
              >
                {newCertUrl ? '✓ File Selected' : 'Upload PDF/Image'}
              </button>
            </CloudinaryUploadWidget>
            <button
              type="button"
              onClick={handleAddCertificate}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Social Media Links (Admin Only & Optional) */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Lock size={13} className="text-accent" />
              Social Media Links (Optional • Admin Verification Only)
            </span>
            <span className="rounded-full bg-secondary border border-accent/40 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              Optional • Admin Only
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Adding your social media or portfolio links is optional and helps our admin team verify your profile faster. They are never shown publicly.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-primary">
              LinkedIn Profile URL <span className="font-normal text-muted-foreground">(Optional)</span>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
              />
            </label>
            <label className="block text-xs font-bold text-primary">
              Website / Portfolio URL <span className="font-normal text-muted-foreground">(Optional)</span>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
              />
            </label>
            <label className="block text-xs font-bold text-primary">
              Instagram URL <span className="font-normal text-muted-foreground">(Optional)</span>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/yourhandle"
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
              />
            </label>
            <label className="block text-xs font-bold text-primary">
              Facebook / Other URL <span className="font-normal text-muted-foreground">(Optional)</span>
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/yourpage"
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
              />
            </label>
          </div>
        </div>

        {/* Short Bio */}
        <label className="block text-xs font-bold text-primary">
          Short Bio (Card snippet)
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="1 sentence summary shown on directory cards"
            className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs outline-none focus:border-accent"
          />
        </label>

        {/* In-depth About */}
        <label className="block text-xs font-bold text-primary">
          Detailed About Section
          <textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Share your background, achievements, and session approach..."
            className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs outline-none focus:border-accent"
          />
        </label>

        {/* Tags */}
        <label className="block text-xs font-bold text-primary">
          Specialty Tags (Comma separated)
          <input
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="e.g. Marketing, Growth, Brand, Content"
            className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">
            Note: Changes to critical fields (Name, Headline, Bio/Description, Certificates, Categories) are reviewed by an admin before going live.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-accent-hover transition disabled:opacity-50 shrink-0"
          >
            {saving ? 'Saving changes...' : 'Save Info Changes'}
          </button>
        </div>
      </form>

      {/* Saved Confirmation Popup Modal */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-primary">
              {savedPendingReview ? 'Submitted for Admin Review!' : 'Saved Successfully!'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {savedPendingReview
                ? 'Your info has been saved. Private contact and payout updates were applied immediately, while changes to critical profile fields (name, certificates, description, etc.) have been requested and sent to our admin team for review.'
                : 'Your info changes have been saved and updated successfully.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="w-full rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white hover:opacity-95 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
