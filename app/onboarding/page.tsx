'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/brand/logo'
import {
  CATEGORIES,
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
} from '@/lib/data/categories'
import { AvailabilityManager } from '@/components/dashboard/availability-manager'
import { CloudinaryUploadWidget } from '@/components/ui/cloudinary-upload-widget'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  Lock,
  Plus,
  Trash2,
  FileText,
  Building2,
  UserCheck,
  CreditCard,
  Sparkles,
} from 'lucide-react'

interface SelectedCategoryItem {
  categorySlug: string
  subcategories: string[]
}

interface CertificateItem {
  title: string
  fileUrl: string
  fileType: 'pdf' | 'image'
}

export default function OnboardingPage() {
  const router = useRouter()
  const { isAr, dir } = useLanguage()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(true)
  const [expertId, setExpertId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [emailVerified, setEmailVerified] = useState<boolean>(true)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendStatus, setResendStatus] = useState<string>('')

  // Account Type: expert or organization
  const [accountType, setAccountType] = useState<'expert' | 'organization'>('expert')

  // Step 1: Info & Identity
  const [fName, setFName] = useState('')
  const [lName, setLName] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('Cairo, Egypt')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [bio, setBio] = useState('')
  const [about, setAbout] = useState('')
  const [tagsStr, setTagsStr] = useState('')

  // Payout Preferences
  const [preferredPayoutMethod, setPreferredPayoutMethod] = useState<'instapay' | 'bank_account'>('instapay')
  const [instapayUsername, setInstapayUsername] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [iban, setIban] = useState('')

  // Uploads: Avatar & Individual National ID / Passport
  const [avatarUrl, setAvatarUrl] = useState('')
  const [nationalIdFrontUrl, setNationalIdFrontUrl] = useState('')
  const [nationalIdBackUrl, setNationalIdBackUrl] = useState('')

  // Organization Verification: سجل تجاري & رقم ضريبي
  const [commercialRegisterNumber, setCommercialRegisterNumber] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [commercialRegisterUrl, setCommercialRegisterUrl] = useState('')
  const [taxIdDocumentUrl, setTaxIdDocumentUrl] = useState('')

  // Optional Certificates { pdf/image, title }
  const [certificates, setCertificates] = useState<CertificateItem[]>([])
  const [newCertTitle, setNewCertTitle] = useState('')
  const [newCertUrl, setNewCertUrl] = useState('')
  const [newCertType, setNewCertType] = useState<'pdf' | 'image'>('image')

  // Admin-Only Social Media Links for Verification
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [website, setWebsite] = useState('')

  // Categories Selection (Max 3) + Suggestion
  const [categoriesList, setCategoriesList] = useState<any[]>(CATEGORIES)
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategoryItem[]>([
    {
      categorySlug: 'marketing',
      subcategories: ['marketing-strategy', 'branding-brand-strategy'],
    },
  ])
  const [showSuggestCategory, setShowSuggestCategory] = useState(false)
  const [suggestedCategoryName, setSuggestedCategoryName] = useState('')
  const [suggestedSubcategoryName, setSuggestedSubcategoryName] = useState('')
  const [suggestedCategoryNotes, setSuggestedCategoryNotes] = useState('')

  const previewSlug = `${fName.trim()}-${lName.trim()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

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
        if (json.user.email) {
          setUserEmail(json.user.email)
        }
        if (json.user.emailVerified !== undefined) {
          setEmailVerified(Boolean(json.user.emailVerified))
        }
        if (json.user.expertId) {
          setExpertId(json.user.expertId)
          fetch(`/api/dashboard/profile?expertId=${json.user.expertId}`)
            .then((r) => r.json())
            .then((pj) => {
              if (pj.success && pj.data) {
                const d = pj.data
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
                if (d.role && d.role !== 'Consultant') setRole(d.role)
                if (d.location) setLocation(d.location)
                if (d.phone) setPhone(d.phone)
                if (d.whatsapp) setWhatsapp(d.whatsapp)
                if (d.bio) setBio(d.bio)
                if (d.about) setAbout(d.about)
                if (d.image || d.avatarUrl) setAvatarUrl(d.image || d.avatarUrl)
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
                if (d.tags?.length) setTagsStr(d.tags.join(', '))
                if (d.preferredPayoutMethod === 'bank_account' || d.preferredPayoutMethod === 'instapay') {
                  setPreferredPayoutMethod(d.preferredPayoutMethod)
                }
                if (d.instapayUsername) setInstapayUsername(d.instapayUsername)
                if (d.bankAccount) {
                  setBankName(d.bankAccount.bankName || '')
                  setAccountHolderName(d.bankAccount.accountHolderName || '')
                  setAccountNumber(d.bankAccount.accountNumber || '')
                  setIban(d.bankAccount.iban || '')
                }
                if (Array.isArray(d.categories) && d.categories.length > 0) {
                  const validCats = d.categories
                    .filter((c: any) => isAllowedMvpCategory(c.categorySlug))
                    .map((c: any) => ({
                      categorySlug: c.categorySlug,
                      subcategories: (c.subcategories || []).filter((sub: string) =>
                        isAllowedMvpSubcategory(c.categorySlug, sub)
                      ),
                    }))
                  if (validCats.length > 0) {
                    setSelectedCategories(validCats)
                  }
                } else if (d.categorySlug && isAllowedMvpCategory(d.categorySlug)) {
                  const validSub = isAllowedMvpSubcategory(d.categorySlug, d.subcategorySlug)
                    ? [d.subcategorySlug]
                    : []
                  setSelectedCategories([
                    {
                      categorySlug: d.categorySlug,
                      subcategories: validSub,
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
        alert(
          isAr
            ? 'يجب اختيار تخصص رئيسي واحد على الأقل.'
            : 'You must have at least 1 primary category selected.'
        )
        return
      }
      setSelectedCategories((prev) => prev.filter((c) => c.categorySlug !== catSlug))
    } else {
      if (selectedCategories.length >= 3) {
        alert(
          isAr
            ? 'يمكنك اختيار بحد أقصى 3 تخصصات رئيسية.'
            : 'You can select a maximum of 3 primary categories.'
        )
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

  const handleAddCertificate = () => {
    if (!newCertTitle.trim() || !newCertUrl) {
      alert(
        isAr
          ? 'يرجى إدخال عنوان الشهادة ورفع الملف (PDF أو صورة).'
          : 'Please enter a certificate title and upload the file (PDF or image).'
      )
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

  const handleSaveStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fName.trim() || !lName.trim() || !role.trim()) {
      alert(
        isAr
          ? 'الاسم الأول واسم العائلة والمسمى المهني مطلوبة.'
          : 'First Name, Last Name, and Professional Headline are required.'
      )
      return
    }

    if (!phone.trim() || !whatsapp.trim()) {
      alert(
        isAr
          ? 'يرجى إدخال رقم الهاتف ورقم الواتساب (للإدارة فقط).'
          : 'Please enter your Phone and WhatsApp numbers (used by Admin only).'
      )
      return
    }

    if (!avatarUrl) {
      alert(
        isAr
          ? 'يرجى رفع الصورة الشخصية أو شعار المؤسسة.'
          : 'Please upload your profile photo / logo.'
      )
      return
    }

    if (accountType === 'organization') {
      const hasCommercialReg = Boolean(commercialRegisterNumber.trim() || commercialRegisterUrl)
      const hasTax = Boolean(taxNumber.trim() || taxIdDocumentUrl)
      if (!hasCommercialReg || !hasTax) {
        alert(
          isAr
            ? 'للمؤسسات والشركات، يرجى توفير السجل التجاري والرقم الضريبي.'
            : 'For organizations, please provide both Commercial Register and Tax Number.'
        )
        return
      }
    } else {
      if (!nationalIdFrontUrl || !nationalIdBackUrl) {
        alert(
          isAr
            ? 'يرجى رفع الوجه الأمامي والخلفي للبطاقة الشخصية أو جواز السفر للتوثيق.'
            : 'Please upload both Front and Back sides of your National ID / Passport for verification.'
        )
        return
      }
    }

    const hasInstapay = Boolean(instapayUsername.trim())
    const hasBank = Boolean(accountNumber.trim() || iban.trim())

    if (!hasInstapay && !hasBank) {
      alert(
        isAr
          ? 'يرجى توفير وسيلة دفع واحدة على الأقل (إنستاباي أو حساب بنكي).'
          : 'Please provide at least one payout method (InstaPay or Bank Account).'
      )
      return
    }
    if (preferredPayoutMethod === 'instapay' && !hasInstapay) {
      alert(
        isAr
          ? 'يرجى إدخال عنوان أو رقم إنستاباي لأنك اخترته كوسيلة الدفع المفضلة.'
          : 'Please enter your InstaPay handle or phone number since InstaPay is selected as preferred.'
      )
      return
    }
    if (preferredPayoutMethod === 'bank_account' && !hasBank) {
      alert(
        isAr
          ? 'يرجى إدخال رقم الحساب البنكي أو الآيبان (IBAN) لأنك اخترت الحساب البنكي كوسيلة مفضلة.'
          : 'Please enter your Bank Account Number or IBAN since Bank Account is selected as preferred.'
      )
      return
    }

    if (selectedCategories.length === 0 || !selectedCategories[0].subcategories.length) {
      alert(
        isAr
          ? 'يرجى اختيار تخصص رئيسي واحد وتخصص فرعي واحد على الأقل.'
          : 'Please select at least 1 approved category and subcategory.'
      )
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
      const primaryCat = selectedCategories[0]
      const fullName = `${fName.trim()} ${lName.trim()}`.trim()
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId,
          isOnboarding: true,
          accountType,
          fName: fName.trim(),
          lName: lName.trim(),
          name: fullName,
          role: role.trim(),
          location: location.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          categorySlug: primaryCat.categorySlug,
          subcategorySlug: primaryCat.subcategories[0] || '',
          categories: selectedCategories,
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
          image: avatarUrl,
          avatarUrl,
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
      if (!json.success) {
        alert(json.error || 'Failed to save profile')
        return
      }
      setStep(2)
    } catch (err: any) {
      alert(err.message || 'Error saving profile')
    }
  }

  const handleSubmitForReview = async () => {
    if (!avatarUrl) {
      alert(isAr ? 'يرجى التأكد من رفع الصورة الشخصية.' : 'Please ensure your profile photo is uploaded.')
      setStep(1)
      return
    }

    if (accountType === 'organization') {
      if (
        (!commercialRegisterNumber.trim() && !commercialRegisterUrl) ||
        (!taxNumber.trim() && !taxIdDocumentUrl)
      ) {
        alert(
          isAr
            ? 'يرجى التأكد من إدخال السجل التجاري والرقم الضريبي.'
            : 'Please ensure both Commercial Register and Tax Number are provided.'
        )
        setStep(1)
        return
      }
    } else {
      if (!nationalIdFrontUrl || !nationalIdBackUrl) {
        alert(
          isAr
            ? 'يرجى التأكد من رفع الوجه الأمامي والخلفي لوثيقة الهوية.'
            : 'Please ensure both Front and Back National ID / Passport documents are uploaded.'
        )
        setStep(1)
        return
      }
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
    return (
      <div className="min-h-screen bg-background p-20 text-center text-xs text-muted-foreground" dir={dir}>
        {isAr ? 'جاري تحميل خطوات التسجيل...' : 'Loading onboarding wizard...'}
      </div>
    )
  }

  const fullNameDisplay = `${fName} ${lName}`.trim()
  const stepTitles = isAr
    ? ['المعلومات والتوثيق', 'ساعات العمل', 'المراجعة والإرسال']
    : ['Info & Verification', 'Working Schedule', 'Review & Submit']

  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-5 sm:px-8" dir={dir}>
      <div className="mx-auto max-w-3xl">
        {/* Header with Language Switcher */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <BrandLogo
            href="/"
            size="sm"
            subtitle={isAr ? 'إعداد الحساب' : 'Onboarding'}
          />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-xs font-bold text-muted-foreground">
              {isAr ? `الخطوة ${step} من 3` : `Step ${step} of 3`}
            </span>
          </div>
        </div>

        {/* Stepper bar */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {stepTitles.map((title, idx) => {
            const stepNum = idx + 1
            const isDone = step > stepNum
            const isCurrent = step === stepNum
            return (
              <div key={title} className="text-center">
                <div
                  className={`h-1.5 rounded-full transition ${isDone || isCurrent ? 'bg-accent' : 'bg-border'
                    }`}
                />
                <p
                  className={`mt-2 text-[11px] font-bold truncate ${isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}
                >
                  {title}
                </p>
              </div>
            )
          })}
        </div>

        {/* Email Verification Banner if not yet verified */}
        {!emailVerified && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">✉️</span>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    {isAr ? 'تأكيد البريد الإلكتروني' : 'Verify your email address'}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    {isAr ? (
                      <>
                        أرسلنا رابط تأكيد إلى <strong className="text-amber-950">{userEmail}</strong>. يرجى التحقق من بريدك لتفعيل حسابك.
                      </>
                    ) : (
                      <>
                        We sent a confirmation link to <strong className="text-amber-950">{userEmail}</strong>. Please check your inbox and verify to activate your profile.
                      </>
                    )}
                  </p>
                  {resendStatus && (
                    <p className="mt-1 text-[11px] font-bold text-emerald-700">{resendStatus}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={resendingEmail}
                onClick={async () => {
                  setResendingEmail(true)
                  setResendStatus('')
                  try {
                    const res = await fetch('/api/auth/resend-verification', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: userEmail }),
                    })
                    const j = await res.json()
                    if (j.success) {
                      setResendStatus(isAr ? '✓ تم إعادة إرسال الرابط!' : '✓ Verification link resent!')
                    } else {
                      setResendStatus(j.error || 'Failed to resend')
                    }
                  } catch {
                    setResendStatus('Failed to resend. Please try again.')
                  } finally {
                    setResendingEmail(false)
                  }
                }}
                className="shrink-0 rounded-full border border-amber-400 bg-surface px-3.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100 transition disabled:opacity-50"
              >
                {resendingEmail
                  ? isAr
                    ? 'جاري الإرسال...'
                    : 'Sending...'
                  : isAr
                    ? 'إعادة إرسال الرابط'
                    : 'Resend Link'}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Info & Verification */}
        {step === 1 && (
          <form
            onSubmit={handleSaveStep1}
            className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-sm space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {isAr ? 'إنشاء حسابك الموثق' : 'Create your verified account'}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAr
                  ? 'أكمل بيانات الهوية وتفضيلات الدفع واختر حتى 3 تخصصات. يمكنك إضافة أول خدمة لك مباشرة من لوحة التحكم بعد التسجيل.'
                  : 'Complete your identity details, payout preferences, and select up to 3 categories. You can add your first service right from your dashboard after onboarding.'}
              </p>
            </div>

            {/* Account Type Selector: Expert vs Organization */}
            <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-primary">
                {isAr ? 'نوع الحساب *' : 'Account Type *'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('expert')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition ${accountType === 'expert'
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-border bg-surface text-foreground hover:border-primary'
                    }`}
                >
                  <UserCheck
                    size={18}
                    className={
                      accountType === 'expert'
                        ? 'text-accent shrink-0 mt-0.5'
                        : 'text-primary shrink-0 mt-0.5'
                    }
                  />
                  <div>
                    <p className="text-xs font-bold">
                      {isAr ? 'خبير فردي' : 'Individual Expert'}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${accountType === 'expert' ? 'text-white/80' : 'text-muted-foreground'
                        }`}
                    >
                      {isAr
                        ? 'التوثيق بالبطاقة الشخصية أو جواز السفر'
                        : 'Verified via National ID or Passport'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('organization')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition ${accountType === 'organization'
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-border bg-surface text-foreground hover:border-primary'
                    }`}
                >
                  <Building2
                    size={18}
                    className={
                      accountType === 'organization'
                        ? 'text-accent shrink-0 mt-0.5'
                        : 'text-primary shrink-0 mt-0.5'
                    }
                  />
                  <div>
                    <p className="text-xs font-bold">
                      {isAr ? 'مؤسسة / شركة' : 'Organization'}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${accountType === 'organization' ? 'text-white/80' : 'text-muted-foreground'
                        }`}
                    >
                      {isAr
                        ? 'التوثيق بالسجل التجاري والرقم الضريبي'
                        : 'Verified via Commercial Register & Tax Number'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Profile Photo & Identity / Organization Documents */}
            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">
                  {accountType === 'organization'
                    ? isAr
                      ? 'مستندات المؤسسة (سجل تجاري ورقم ضريبي) *'
                      : 'Organization Documents (Commercial Register & Tax Number) *'
                    : isAr
                      ? 'مستندات تحقيق الهوية (البطاقة الشخصية أو جواز السفر) *'
                      : 'Identity & Verification Documents (National ID or Passport) *'}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {accountType === 'organization'
                    ? isAr
                      ? 'يقوم فريق الإدارة بمراجعة السجل التجاري والرقم الضريبي قبل تفعيل حساب المؤسسة.'
                      : 'Our administration team verifies your Commercial Register and Tax Number before your profile goes live.'
                    : isAr
                      ? 'يقوم فريق الإدارة بمراجعة وثيقة الهوية الرسمية قبل نشر ملفك الشخصي.'
                      : 'Our administration team verifies your government documents before your expert profile goes live.'}
                </p>
              </div>

              {/* Profile Photo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border pb-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted border border-border">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-xs font-bold text-muted-foreground">
                      {isAr ? 'صورة' : 'Photo'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-primary">
                    {accountType === 'organization'
                      ? isAr
                        ? 'شعار المؤسسة / الصورة الرمزية *'
                        : 'Organization Logo / Profile Picture *'
                      : isAr
                        ? 'الصورة الشخصية *'
                        : 'Profile Picture *'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr
                      ? 'تظهر في دائرة الحساب بلوحة التحكم وفي دليل الخبراء العام.'
                      : 'High-resolution square image shown in your dashboard avatar circle and public directory.'}
                  </p>
                </div>
                <CloudinaryUploadWidget
                  folder="bokbok/avatars"
                  cropping={true}
                  croppingAspectRatio={1}
                  fallbackType="avatar"
                  onSuccess={(result) => setAvatarUrl(result.url)}
                >
                  <button
                    type="button"
                    className="cursor-pointer rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-primary hover:border-primary hover:shadow-sm transition"
                  >
                    {avatarUrl
                      ? isAr
                        ? 'تغيير الصورة'
                        : 'Change Photo'
                      : isAr
                        ? 'رفع صورة'
                        : 'Upload Photo'}
                  </button>
                </CloudinaryUploadWidget>
              </div>

              {/* Conditional Verification: Individual vs Organization */}
              {accountType === 'organization' ? (
                <div className="grid gap-4 sm:grid-cols-2 pt-1">
                  {/* Commercial Register */}
                  <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">
                        {isAr ? 'سجل تجاري *' : 'Commercial Register *'}
                      </p>
                      {commercialRegisterNumber || commercialRegisterUrl ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {isAr ? '✓ مكتمل' : '✓ Provided'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {isAr ? 'مطلوب' : 'Required'}
                        </span>
                      )}
                    </div>
                    <input
                      value={commercialRegisterNumber}
                      onChange={(e) => setCommercialRegisterNumber(e.target.value)}
                      placeholder={
                        isAr ? 'رقم السجل التجاري' : 'Commercial Register Number'
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                    <CloudinaryUploadWidget
                      folder="bokbok/national_ids"
                      fallbackType="id_document"
                      allowPdf={true}
                      onSuccess={(result) => setCommercialRegisterUrl(result.url)}
                      className="block"
                    >
                      <div className="cursor-pointer rounded-xl border border-dashed border-border p-2.5 text-center text-xs font-bold text-primary hover:border-accent transition">
                        {commercialRegisterUrl
                          ? isAr
                            ? '✓ تم رفع المستند (اضغط للاستبدال)'
                            : '✓ Document Uploaded (Click to Replace)'
                          : isAr
                            ? 'رفع صورة أو ملف السجل التجاري'
                            : 'Upload Commercial Register (Image / PDF)'}
                      </div>
                    </CloudinaryUploadWidget>
                  </div>

                  {/* Tax Number */}
                  <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">
                        {isAr ? 'رقم ضريبي *' : 'Tax Number / Card *'}
                      </p>
                      {taxNumber || taxIdDocumentUrl ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {isAr ? '✓ مكتمل' : '✓ Provided'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {isAr ? 'مطلوب' : 'Required'}
                        </span>
                      )}
                    </div>
                    <input
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder={isAr ? 'الرقم الضريبي' : 'Tax Registration Number'}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                    <CloudinaryUploadWidget
                      folder="bokbok/national_ids"
                      fallbackType="id_document"
                      allowPdf={true}
                      onSuccess={(result) => setTaxIdDocumentUrl(result.url)}
                      className="block"
                    >
                      <div className="cursor-pointer rounded-xl border border-dashed border-border p-2.5 text-center text-xs font-bold text-primary hover:border-accent transition">
                        {taxIdDocumentUrl
                          ? isAr
                            ? '✓ تم رفع المستند (اضغط للاستبدال)'
                            : '✓ Document Uploaded (Click to Replace)'
                          : isAr
                            ? 'رفع البطاقة الضريبية (صورة أو PDF)'
                            : 'Upload Tax Card (Image / PDF)'}
                      </div>
                    </CloudinaryUploadWidget>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 pt-1">
                  {/* ID Front */}
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">
                        {isAr
                          ? 'البطاقة الشخصية / جواز السفر (الوجه الأمامي) *'
                          : 'National ID / Passport (Front) *'}
                      </p>
                      {nationalIdFrontUrl ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {isAr ? '✓ تم الرفع' : '✓ Uploaded'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {isAr ? 'مطلوب' : 'Required'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {isAr
                        ? 'الوجه الأمامي لبطاقة الرقم القومي أو الصفحة الرئيسية لجواز السفر.'
                        : 'Front face of National ID card or main passport bio page.'}
                    </p>
                    {nationalIdFrontUrl ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={nationalIdFrontUrl}
                          alt="ID Front"
                          className="size-10 rounded-lg object-cover border border-emerald-200 shrink-0"
                        />
                        <CloudinaryUploadWidget
                          folder="bokbok/national_ids"
                          fallbackType="id_document"
                          onSuccess={(result) => setNationalIdFrontUrl(result.url)}
                        >
                          <button
                            type="button"
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                          >
                            {isAr ? 'استبدال الصورة' : 'Replace Front ID'}
                          </button>
                        </CloudinaryUploadWidget>
                      </div>
                    ) : (
                      <CloudinaryUploadWidget
                        folder="bokbok/national_ids"
                        fallbackType="id_document"
                        onSuccess={(result) => setNationalIdFrontUrl(result.url)}
                        className="mt-3 block"
                      >
                        <div className="cursor-pointer rounded-xl border border-dashed border-border p-2.5 text-center text-xs font-bold text-primary hover:border-accent transition">
                          {isAr ? 'اختر صورة الوجه الأمامي' : 'Select Front ID Image'}
                        </div>
                      </CloudinaryUploadWidget>
                    )}
                  </div>

                  {/* ID Back */}
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">
                        {isAr
                          ? 'البطاقة الشخصية (الوجه الخلفي) *'
                          : 'National ID (Back) / Secondary Proof *'}
                      </p>
                      {nationalIdBackUrl ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {isAr ? '✓ تم الرفع' : '✓ Uploaded'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {isAr ? 'مطلوب' : 'Required'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {isAr
                        ? 'الوجه الخلفي لبطاقة الرقم القومي أو وثيقة إثبات إضافية.'
                        : 'Back side of National ID card, or passport cover/residence permit.'}
                    </p>
                    {nationalIdBackUrl ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={nationalIdBackUrl}
                          alt="ID Back"
                          className="size-10 rounded-lg object-cover border border-emerald-200 shrink-0"
                        />
                        <CloudinaryUploadWidget
                          folder="bokbok/national_ids"
                          fallbackType="id_document"
                          onSuccess={(result) => setNationalIdBackUrl(result.url)}
                        >
                          <button
                            type="button"
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                          >
                            {isAr ? 'استبدال الصورة' : 'Replace Back ID'}
                          </button>
                        </CloudinaryUploadWidget>
                      </div>
                    ) : (
                      <CloudinaryUploadWidget
                        folder="bokbok/national_ids"
                        fallbackType="id_document"
                        onSuccess={(result) => setNationalIdBackUrl(result.url)}
                        className="mt-3 block"
                      >
                        <div className="cursor-pointer rounded-xl border border-dashed border-border p-2.5 text-center text-xs font-bold text-primary hover:border-accent transition">
                          {isAr ? 'اختر صورة الوجه الخلفي' : 'Select Back ID Image'}
                        </div>
                      </CloudinaryUploadWidget>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* First Name (fName), Last Name (lName), Headline & Location */}
            <div className="space-y-4 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'الاسم الأول *' : 'First Name (fName) *'}
                  <input
                    required
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder={isAr ? 'مثال: عمر' : 'e.g. Omar'}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'اسم العائلة *' : 'Last Name (lName) *'}
                  <input
                    required
                    value={lName}
                    onChange={(e) => setLName(e.target.value)}
                    placeholder={isAr ? 'مثال: وجيه' : 'e.g. Wagih'}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
              </div>
              {previewSlug && (
                <p className="text-[11px] text-muted-foreground">
                  {isAr ? 'معاينة رابط صفحتك:' : 'Profile URL slug preview:'}{' '}
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-primary" dir="ltr">
                    /experts/{previewSlug}
                  </code>
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'المسمى المهني / التخصص *' : 'Professional Headline *'}
                  <input
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: استشاري استراتيجيات التسويق والنمو'
                        : 'e.g. Senior Marketing & Growth Consultant'
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'الموقع / المدينة' : 'Location'}
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={isAr ? 'مثال: القاهرة، مصر' : 'e.g. Cairo, Egypt'}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
              </div>
            </div>

            {/* Admin-Only Contact Info: Phone & WhatsApp */}
            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Lock size={13} className="text-accent" />
                    {isAr
                      ? 'أرقام التواصل المباشر (للإدارة فقط) *'
                      : 'Direct Contact Numbers (Admin Only) *'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isAr
                      ? 'تُستخدم فقط من قِبل إدارة المنصة للتواصل معك بخصوص حسابك أو حجوزاتك. لا تظهر للعملاء نهائياً.'
                      : 'Used strictly by Bok Bok administration to reach out regarding your account or bookings. Never displayed to clients.'}
                  </p>
                </div>
                <span className="rounded-full bg-secondary border border-accent/40 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  {isAr ? 'خاص • للإدارة فقط' : 'Private • Admin Only'}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'رقم الواتساب *' : 'WhatsApp Number *'}
                  <input
                    required
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
              </div>
            </div>

            {/* Payout Preferences: InstaPay || Bank Account */}
            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CreditCard size={14} className="text-accent" />
                    {isAr
                      ? 'تفضيلات استلام الأرباح (إنستاباي أو حساب بنكي) *'
                      : 'Payout Preferences (InstaPay or Bank Account) *'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isAr
                      ? 'اختر وسيلة الدفع المفضلة لديك. الحساب البنكي اختياري في حال استخدام إنستاباي.'
                      : 'Select how you prefer to get paid. Bank account is optional if you use InstaPay.'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-primary mb-2">
                  {isAr ? 'الوسيلة المفضلة لاستلام المستحقات *' : 'Preferred way to get paid *'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredPayoutMethod('instapay')}
                    className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition text-start ${preferredPayoutMethod === 'instapay'
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-surface text-foreground hover:border-primary'
                      }`}
                  >
                    {isAr ? '⚡ إنستاباي (InstaPay)' : '⚡ InstaPay (Preferred)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredPayoutMethod('bank_account')}
                    className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition text-start ${preferredPayoutMethod === 'bank_account'
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-surface text-foreground hover:border-primary'
                      }`}
                  >
                    {isAr ? '🏦 تحويل لحساب بنكي' : '🏦 Bank Account Transfer'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-primary sm:col-span-2">
                  {isAr
                    ? `عنوان إنستاباي أو رقم الهاتف المرتبط ${preferredPayoutMethod === 'instapay' ? '*' : '(اختياري)'}`
                    : `InstaPay Handle or Linked Phone ${preferredPayoutMethod === 'instapay' ? '*' : '(Optional)'}`}
                  <input
                    required={preferredPayoutMethod === 'instapay'}
                    value={instapayUsername}
                    onChange={(e) => setInstapayUsername(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: username@instapay أو 010xxxxxxxx'
                        : 'e.g. username@instapay or 010xxxxxxxx'
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>

                <label className="text-xs font-bold text-primary">
                  {isAr
                    ? `اسم البنك ${preferredPayoutMethod === 'bank_account' ? '*' : '(اختياري)'}`
                    : `Bank Name ${preferredPayoutMethod === 'bank_account' ? '*' : '(Optional)'}`}
                  <input
                    required={preferredPayoutMethod === 'bank_account'}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder={isAr ? 'مثال: CIB، QNB، بنك مصر' : 'e.g. CIB, QNB, Banque Misr'}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr
                    ? `اسم صاحب الحساب البنكي ${preferredPayoutMethod === 'bank_account' ? '*' : '(اختياري)'}`
                    : `Account Holder Name ${preferredPayoutMethod === 'bank_account' ? '*' : '(Optional)'}`}
                  <input
                    required={preferredPayoutMethod === 'bank_account'}
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder={
                      isAr ? 'الاسم الثلاثي كما في الحساب البنكي' : 'Full legal name on bank account'
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr
                    ? `رقم الحساب البنكي ${preferredPayoutMethod === 'bank_account' ? '*' : '(اختياري)'}`
                    : `Account Number ${preferredPayoutMethod === 'bank_account' ? '*' : '(Optional)'}`}
                  <input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={isAr ? 'رقم الحساب البنكي' : 'Bank account number'}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'رقم الآيبان IBAN (اختياري)' : 'IBAN (Optional)'}
                  <input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="EG00 0000 0000 0000 0000 0000 00000"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </label>
              </div>
            </div>

            {/* Categories & Subcategories (Max 3) + Prominent Option to Suggest New Category/Subcategory */}
            <div className="rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">
                    {isAr ? 'التخصصات والفئات (بحد أقصى 3) *' : 'Specialty Categories (Max 3) *'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isAr
                      ? 'اختر حتى 3 تخصصات رئيسية والتخصصات الفرعية التابعة لها.'
                      : 'Select up to 3 categories and their corresponding subcategories.'}
                  </p>
                </div>
                <span className="rounded-full bg-secondary border border-accent/40 px-2.5 py-1 text-xs font-bold text-primary">
                  {isAr
                    ? `تم اختيار ${selectedCategories.length} من 3`
                    : `${selectedCategories.length} / 3 selected`}
                </span>
              </div>

              {/* Main Categories Pills — Single Active Language Only */}
              <div className="flex flex-wrap gap-2 pt-1">
                {categoriesList.map((cat) => {
                  const isSelected = selectedCategories.some((c) => c.categorySlug === cat.slug)
                  const catTitle = isAr
                    ? cat.title?.ar || cat.name?.ar || cat.title?.en
                    : cat.title?.en || cat.name?.en || cat.title?.ar
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => toggleCategory(cat.slug)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-border bg-surface text-muted-foreground hover:border-primary'
                        }`}
                    >
                      {catTitle} {isSelected ? '✓' : '+'}
                    </button>
                  )
                })}
              </div>

              {/* Subcategories for Selected Categories — Single Active Language Only */}
              <div className="space-y-4 pt-3 border-t border-border">
                {selectedCategories.map((selCat) => {
                  const fullCat = categoriesList.find((c) => c.slug === selCat.categorySlug)
                  if (!fullCat) return null
                  const fullCatTitle = isAr
                    ? fullCat.title?.ar || fullCat.name?.ar || fullCat.title?.en
                    : fullCat.title?.en || fullCat.name?.en || fullCat.title?.ar
                  return (
                    <div
                      key={selCat.categorySlug}
                      className="rounded-xl border border-border bg-muted/40 p-3.5"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-primary">{fullCatTitle}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {isAr
                            ? `${selCat.subcategories.length} تخصصات فرعية محددة`
                            : `${selCat.subcategories.length} subcategories selected`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(fullCat.subcategories || []).map((sub: any) => {
                          const isSubSelected = selCat.subcategories.includes(sub.slug)
                          const subTitle = isAr
                            ? sub.title?.ar || sub.name?.ar || sub.title?.en
                            : sub.title?.en || sub.name?.en || sub.title?.ar
                          return (
                            <button
                              key={sub.slug}
                              type="button"
                              onClick={() => toggleSubcategory(selCat.categorySlug, sub.slug)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${isSubSelected
                                ? 'bg-accent text-primary font-bold'
                                : 'border border-border bg-surface text-muted-foreground hover:border-primary'
                                }`}
                            >
                              {subTitle}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Prominent Suggest New Category / Subcategory Box */}
              <div className="pt-3 border-t border-border">
                <div className="rounded-2xl border border-accent/40 bg-secondary/40 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div>
                        <p className="text-xs font-bold text-primary">
                          {isAr
                            ? 'لم تجد تخصصك الدقيق؟ اقترح فئة أو تخصصاً فرعياً جديداً'
                            : "Don't see your exact specialty? Suggest a new category or subcategory"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isAr
                            ? 'يمكنك اقتراح إضافة تخصص رئيسي أو فرعي جديد ليقوم فريق الإدارة بمراجعته وإضافته.'
                            : 'Submit a new category or subcategory suggestion for our admin team to review and add.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSuggestCategory(!showSuggestCategory)}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-3.5 py-1.5 text-xs font-bold text-primary hover:border-primary transition"
                    >
                      <Plus size={14} className="text-accent" />
                      {showSuggestCategory
                        ? isAr
                          ? 'إخفاء الاقتراح'
                          : 'Hide Suggestion'
                        : isAr
                          ? '+ اقترح فئة جديدة'
                          : '+ Suggest Category'}
                    </button>
                  </div>

                  {showSuggestCategory && (
                    <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-bold text-primary">
                          {isAr ? 'اسم التخصص الرئيسي المقترح' : 'Suggested Category Name'}
                          <input
                            value={suggestedCategoryName}
                            onChange={(e) => setSuggestedCategoryName(e.target.value)}
                            placeholder={
                              isAr ? 'مثال: الاستدامة والحوكمة' : 'e.g. Sustainability & ESG'
                            }
                            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                          />
                        </label>
                        <label className="text-xs font-bold text-primary">
                          {isAr ? 'اسم التخصص الفرعي المقترح' : 'Suggested Subcategory Name'}
                          <input
                            value={suggestedSubcategoryName}
                            onChange={(e) => setSuggestedSubcategoryName(e.target.value)}
                            placeholder={
                              isAr
                                ? 'مثال: استشارات البصمة الكربونية'
                                : 'e.g. Carbon Footprint Advisory'
                            }
                            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                          />
                        </label>
                      </div>
                      <label className="block text-xs font-bold text-primary">
                        {isAr ? 'ملاحظات للإدارة (اختياري)' : 'Notes for Admin (Optional)'}
                        <input
                          value={suggestedCategoryNotes}
                          onChange={(e) => setSuggestedCategoryNotes(e.target.value)}
                          placeholder={
                            isAr
                              ? 'اشرح باختصار طبيعة الاستشارات أو الخدمات ضمن هذا التخصص...'
                              : 'Briefly describe the services or consultations under this specialty...'
                          }
                          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Certificates { pdf/image, title } */}
            <div className="rounded-2xl border border-border p-5 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">
                  {isAr
                    ? 'الشهادات والاعتمادات المهنية (اختياري)'
                    : 'Certificates & Credentials (Optional)'}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isAr
                    ? 'ارفع أي شهادات مهنية أو تراخيص أو اعتمادات (ملف PDF أو صورة مع اسم الشهادة).'
                    : 'Upload any professional certificates, licenses, or accreditations (PDF or Image with title).'}
                </p>
              </div>

              {certificates.length > 0 && (
                <div className="space-y-2">
                  {certificates.map((cert, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={15} className="text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-primary truncate">{cert.title}</p>
                          <a
                            href={cert.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-muted-foreground hover:underline"
                          >
                            {isAr
                              ? `عرض الملف (${cert.fileType.toUpperCase()}) ↗`
                              : `View uploaded ${cert.fileType.toUpperCase()} ↗`}
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertificate(idx)}
                        className="text-destructive hover:opacity-80 p-1"
                        title={isAr ? 'حذف الشهادة' : 'Remove certificate'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                  <label className="text-xs font-bold text-primary">
                    {isAr ? 'اسم الشهادة' : 'Certificate Title'}
                    <input
                      value={newCertTitle}
                      onChange={(e) => setNewCertTitle(e.target.value)}
                      placeholder={
                        isAr ? 'مثال: شهادة PMP / ماجستير إدارة أعمال' : 'e.g. ICF Certified Coach / PMP / MBA'
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                    />
                  </label>
                  <CloudinaryUploadWidget
                    folder="bokbok/certificates"
                    fallbackType="certificate"
                    allowPdf={true}
                    onSuccess={(result) => {
                      setNewCertUrl(result.url)
                      const isPdf =
                        result.format === 'pdf' || result.url.toLowerCase().endsWith('.pdf')
                      setNewCertType(isPdf ? 'pdf' : 'image')
                    }}
                  >
                    <button
                      type="button"
                      className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-primary hover:border-primary transition"
                    >
                      {newCertUrl
                        ? isAr
                          ? '✓ تم اختيار الملف (استبدال)'
                          : '✓ File Selected (Replace)'
                        : isAr
                          ? 'رفع PDF / صورة'
                          : 'Upload PDF / Image'}
                    </button>
                  </CloudinaryUploadWidget>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddCertificate}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
                  >
                    <Plus size={13} />{' '}
                    {isAr ? 'إضافة الشهادة للقائمة' : 'Add Certificate to List'}
                  </button>
                </div>
              </div>
            </div>

            {/* Social Media Links (Optional & Admin Only for Verification) */}
            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Lock size={13} className="text-accent" />
                    {isAr
                      ? 'روابط التواصل الاجتماعي والتوثيق (اختياري • للإدارة فقط)'
                      : 'Social Media & Verification Links (Optional • Admin Only)'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isAr
                      ? 'إضافة حساباتك أو موقعك الإلكتروني اختيارية وتساعد فريق الإدارة في توثيق حسابك بشكل أسرع. لا تظهر للعملاء.'
                      : 'Sharing your social profiles or website is optional and helps our admin team verify your background. Hidden from clients.'}
                  </p>
                </div>
                <span className="rounded-full bg-secondary border border-accent/40 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  {isAr ? 'اختياري • للإدارة فقط' : 'Optional • Admin Only'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'رابط حساب LinkedIn (اختياري)' : 'LinkedIn Profile URL (Optional)'}
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr
                    ? 'الموقع الإلكتروني / معرض الأعمال (اختياري)'
                    : 'Website / Portfolio URL (Optional)'}
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr ? 'رابط حساب Instagram (اختياري)' : 'Instagram URL (Optional)'}
                  <input
                    type="url"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
                  />
                </label>
                <label className="text-xs font-bold text-primary">
                  {isAr
                    ? 'رابط Facebook أو رابط آخر (اختياري)'
                    : 'Facebook / Other URL (Optional)'}
                  <input
                    type="url"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-normal outline-none focus:border-accent"
                  />
                </label>
              </div>
            </div>

            {/* Bio, About, Tags */}
            <label className="block text-xs font-bold text-primary">
              {isAr ? 'نبذة مختصرة (تظهر في بطاقة الخبير)' : 'One-Sentence Card Bio'}
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={
                  isAr
                    ? 'أساعد رواد الأعمال والشركات على بناء خطط تسويقية واضحة وقابلة للنمو.'
                    : 'I help founders build clear marketing roadmaps and scalable brands.'
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>

            <label className="block text-xs font-bold text-primary">
              {isAr ? 'نبذة تفصيلية عن خبراتك' : 'In-Depth About Section'}
              <textarea
                rows={3}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder={
                  isAr
                    ? 'شارك خبراتك العملية وأبرز إنجازاتك وكيف تدار جلساتك الاستشارية...'
                    : 'Share your background, achievements, and how your sessions work...'
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-accent"
              />
            </label>

            <label className="block text-xs font-bold text-primary">
              {isAr ? 'الكلمات المفتاحية للتخصص (مفصولة بفاصلة)' : 'Specialty Tags (Comma separated)'}
              <input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder={
                  isAr ? 'تسويق، نمو، استراتيجية، علامة تجارية' : 'Marketing, Growth, Strategy, Branding'
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-accent"
              />
            </label>

            <div className="flex items-center justify-end border-t border-border pt-5">
              <button
                type="submit"
                className="rounded-full bg-accent hover:bg-accent-hover px-7 py-3 text-xs font-bold text-primary shadow-sm transition"
              >
                {isAr ? 'المتابعة إلى ساعات العمل ←' : 'Continue to Working Schedule →'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Availability */}
        {step === 2 && (
          <div className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {isAr ? 'حدد ساعات العمل المعتادة' : 'Set your regular working hours'}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAr
                  ? 'سيتمكن العملاء من الحجز فقط خلال الأوقات التي تحددها هنا. الفاصل الزمني الموصى به هو 30 دقيقة.'
                  : 'Clients will only be able to book during times you specify here. Recommended recurring interval is 30 minutes.'}
              </p>
            </div>

            <AvailabilityManager initialExpertId={expertId} showExpertPicker={false} />

            <div className="flex items-center justify-between border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-border px-5 py-2.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
              >
                {isAr ? '→ السابق' : '← Back'}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-full bg-accent hover:bg-accent-hover px-7 py-3 text-xs font-bold text-primary shadow-sm transition"
              >
                {isAr ? 'المتابعة للمراجعة ←' : 'Proceed to Review →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {isAr ? 'جاهز للإرسال للمراجعة' : 'Ready to submit for review'}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAr
                  ? 'بمجرد الإرسال، سيقوم فريق الإدارة بمراجعة حسابك. يمكنك إضافة أول خدمة لك (استشارة، ورشة عمل، أو ندوة) مباشرة من لوحة التحكم.'
                  : 'Once submitted, your profile will be reviewed by an administrator. You can add your first consultation, workshop, or webinar immediately from your dashboard.'}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 p-5 space-y-3 text-xs">
              <div className="flex items-center gap-4 border-b border-border pb-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted border border-border">
                  {avatarUrl && (
                    <Image src={avatarUrl} alt={fullNameDisplay} fill className="object-cover" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-primary">{fullNameDisplay}</strong>
                    <span className="rounded-full bg-secondary border border-accent/40 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                      {accountType === 'organization'
                        ? isAr
                          ? 'مؤسسة'
                          : 'Organization'
                        : isAr
                          ? 'خبير فردي'
                          : 'Individual Expert'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>

              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">
                  {accountType === 'organization'
                    ? isAr
                      ? 'مستندات المؤسسة (سجل تجاري ورقم ضريبي):'
                      : 'Organization Documents (Commercial Register & Tax Number):'
                    : isAr
                      ? 'وثيقة الهوية (الوجه الأمامي والخلفي):'
                      : 'National ID / Passport (Front & Back):'}
                </span>
                {accountType === 'organization' ? (
                  <strong
                    className={
                      (commercialRegisterNumber || commercialRegisterUrl) &&
                        (taxNumber || taxIdDocumentUrl)
                        ? 'text-emerald-700'
                        : 'text-destructive'
                    }
                  >
                    {(commercialRegisterNumber || commercialRegisterUrl) &&
                      (taxNumber || taxIdDocumentUrl)
                      ? isAr
                        ? '✓ مكتمل'
                        : '✓ Provided'
                      : isAr
                        ? 'مستندات مطلوبة غير مكتملة'
                        : 'Missing required documents'}
                  </strong>
                ) : (
                  <strong
                    className={
                      nationalIdFrontUrl && nationalIdBackUrl
                        ? 'text-emerald-700'
                        : 'text-destructive'
                    }
                  >
                    {nationalIdFrontUrl && nationalIdBackUrl
                      ? isAr
                        ? '✓ تم رفع الوجهين'
                        : '✓ Both sides uploaded'
                      : isAr
                        ? 'وثائق الهوية غير مكتملة'
                        : 'Missing required ID documents'}
                  </strong>
                )}
              </div>

              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">
                  {isAr ? 'أرقام التواصل للإدارة (الهاتف / واتساب):' : 'Admin Contact (Phone / WhatsApp):'}
                </span>
                <strong className="text-primary">
                  {phone} / {whatsapp}
                </strong>
              </div>

              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">
                  {isAr ? 'وسيلة الدفع المفضلة:' : 'Preferred Payout Method:'}
                </span>
                <strong className="text-primary uppercase">
                  {preferredPayoutMethod === 'instapay'
                    ? `InstaPay (${instapayUsername})`
                    : `${isAr ? 'حساب بنكي' : 'Bank Account'} (${bankName || accountNumber || iban})`}
                </strong>
              </div>

              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">
                  {isAr ? 'التخصصات المختارة:' : 'Selected Categories:'}
                </span>
                <strong className="text-primary">
                  {selectedCategories
                    .map((c) => {
                      const catObj = categoriesList.find((item) => item.slug === c.categorySlug)
                      return isAr
                        ? catObj?.title?.ar || catObj?.name?.ar || c.categorySlug
                        : catObj?.title?.en || catObj?.name?.en || c.categorySlug
                    })
                    .join('، ')}
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {isAr ? 'الشهادات المرفوعة:' : 'Certificates Uploaded:'}
                </span>
                <strong className="text-primary">{certificates.length}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full border border-border px-5 py-2.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
              >
                {isAr ? '→ السابق' : '← Back'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitForReview}
                className="rounded-full bg-primary px-8 py-3.5 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
              >
                {submitting
                  ? isAr
                    ? 'جاري إرسال الطلب...'
                    : 'Submitting Application...'
                  : isAr
                    ? 'إرسال الحساب للمراجعة ✓'
                    : 'Submit Profile for Review ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
