import { NextResponse } from 'next/server'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import {
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
  isRemovedCategory,
} from '@/lib/data/categories'
import { detectExcludedService, detectUnverifiedAccreditationClaim } from '@/lib/services/service-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetExpertId =
      session.role === 'admin' && searchParams.get('expertId')
        ? searchParams.get('expertId')
        : session.expertId

    if (!targetExpertId) {
      return NextResponse.json({ success: false, error: 'No expert profile found' }, { status: 404 })
    }

    const expertsCol = await getExpertsCollection()
    const doc = await expertsCol.findOne({ _id: toObjectId(targetExpertId) })
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Expert record not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...doc,
        _id: doc._id.toString(),
        id: doc._id.toString(),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      expertId,
      isOnboarding,
      accountType,
      fName,
      lName,
      name,
      role,
      location,
      phone,
      whatsapp,
      bio,
      about,
      categorySlug,
      subcategorySlug,
      categories,
      suggestedCategory,
      tags,
      image,
      avatarUrl,
      nationalIdFrontUrl,
      nationalIdBackUrl,
      commercialRegisterNumber,
      taxNumber,
      commercialRegisterUrl,
      taxIdDocumentUrl,
      certificates,
      socialLinks,
      preferredPayoutMethod,
      instapayUsername,
      bankAccount,
    } = body

    const targetExpertId = session.role === 'admin' && expertId ? expertId : session.expertId

    if (!targetExpertId) {
      return NextResponse.json({ success: false, error: 'No expert ID provided' }, { status: 400 })
    }

    // Validate categorySlug and subcategorySlug if provided
    if (categorySlug) {
      if (isRemovedCategory(categorySlug) || !isAllowedMvpCategory(categorySlug)) {
        return NextResponse.json(
          {
            success: false,
            error: `Category "${categorySlug}" is removed or outside the approved MVP taxonomy.`,
          },
          { status: 400 }
        )
      }
      if (subcategorySlug && !isAllowedMvpSubcategory(categorySlug, subcategorySlug)) {
        return NextResponse.json(
          {
            success: false,
            error: `Subcategory "${subcategorySlug}" is not an approved MVP subcategory under "${categorySlug}".`,
          },
          { status: 400 }
        )
      }
    }

    // Validate multi-category array if provided
    let sanitizedCats: { categorySlug: string; subcategories: string[] }[] | undefined
    if (Array.isArray(categories)) {
      sanitizedCats = []
      for (const c of categories.slice(0, 3)) {
        const cSlug = String(c.categorySlug || '').trim()
        if (!cSlug) continue
        if (isRemovedCategory(cSlug) || !isAllowedMvpCategory(cSlug)) {
          return NextResponse.json(
            {
              success: false,
              error: `Category "${cSlug}" is removed or outside the approved MVP taxonomy.`,
            },
            { status: 400 }
          )
        }
        const rawSubs = Array.isArray(c.subcategories) ? c.subcategories.map((s: any) => String(s).trim()).filter(Boolean) : []
        for (const sSlug of rawSubs) {
          if (!isAllowedMvpSubcategory(cSlug, sSlug)) {
            return NextResponse.json(
              {
                success: false,
                error: `Subcategory "${sSlug}" is not an approved MVP subcategory under "${cSlug}".`,
              },
              { status: 400 }
            )
          }
        }
        sanitizedCats.push({
          categorySlug: cSlug,
          subcategories: rawSubs,
        })
      }
    }

    // Screen profile text against excluded services & unverified accreditation claims
    const combinedProfileText = [
      role || '',
      bio || '',
      about || '',
      ...(Array.isArray(tags) ? tags : []),
    ].join(' ')
    const excludedCheck = detectExcludedService(combinedProfileText)
    if (excludedCheck.excluded) {
      return NextResponse.json(
        {
          success: false,
          error: excludedCheck.reason,
        },
        { status: 400 }
      )
    }
    if (session.role !== 'admin' && detectUnverifiedAccreditationClaim(combinedProfileText)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Do not display "accredited," "officially recognized," or equivalent claims without verified supporting authorization.',
        },
        { status: 400 }
      )
    }

    const expertObjId = toObjectId(targetExpertId)
    const expertsCol = await getExpertsCollection()
    const existingExpert = await expertsCol.findOne({ _id: expertObjId })

    const updateDoc: any = {
      updatedAt: new Date(),
    }

    if (accountType === 'expert' || accountType === 'organization') {
      updateDoc.accountType = accountType
    }

    const cleanFName = fName !== undefined ? String(fName).trim() : existingExpert?.fName || ''
    const cleanLName = lName !== undefined ? String(lName).trim() : existingExpert?.lName || ''

    if (fName !== undefined) updateDoc.fName = cleanFName
    if (lName !== undefined) updateDoc.lName = cleanLName

    const computedName =
      cleanFName || cleanLName
        ? `${cleanFName} ${cleanLName}`.trim()
        : name
          ? String(name).trim()
          : ''

    if (computedName) {
      updateDoc.name = computedName
    }

    // Generate clean slug from fName and lName when fName/lName are provided
    if ((fName !== undefined || lName !== undefined) && (cleanFName || cleanLName)) {
      const slugSource = cleanFName && cleanLName ? `${cleanFName}-${cleanLName}` : computedName
      const baseSlug = slugSource
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      if (baseSlug && baseSlug !== existingExpert?.slug) {
        const collision = await expertsCol.findOne({
          slug: baseSlug,
          _id: { $ne: expertObjId },
        })
        updateDoc.slug = collision
          ? `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`
          : baseSlug
      }
    }

    if (role) updateDoc.role = String(role).trim()
    if (location !== undefined) updateDoc.location = String(location).trim()
    if (phone !== undefined) updateDoc.phone = String(phone).trim()
    if (whatsapp !== undefined) updateDoc.whatsapp = String(whatsapp).trim()
    if (bio !== undefined) updateDoc.bio = String(bio).trim()
    if (about !== undefined) updateDoc.about = String(about).trim()
    if (categorySlug) updateDoc.categorySlug = categorySlug
    if (subcategorySlug !== undefined) updateDoc.subcategorySlug = subcategorySlug

    if (sanitizedCats) {
      updateDoc.categories = sanitizedCats
      updateDoc.categorySlugs = sanitizedCats.map((c) => c.categorySlug)
      updateDoc.subcategorySlugs = sanitizedCats.flatMap((c) => c.subcategories)
      if (sanitizedCats[0]?.categorySlug) {
        updateDoc.categorySlug = sanitizedCats[0].categorySlug
      }
      if (sanitizedCats[0]?.subcategories[0]) {
        updateDoc.subcategorySlug = sanitizedCats[0].subcategories[0]
      }
    }

    if (suggestedCategory !== undefined) {
      if (
        suggestedCategory &&
        (suggestedCategory.categoryName?.trim() || suggestedCategory.subcategoryName?.trim())
      ) {
        updateDoc.suggestedCategory = {
          categoryName: String(suggestedCategory.categoryName || '').trim(),
          subcategoryName: String(suggestedCategory.subcategoryName || '').trim(),
          parentCategorySlug: String(suggestedCategory.parentCategorySlug || '').trim(),
          notes: String(suggestedCategory.notes || '').trim(),
          createdAt: new Date(),
        }
      } else {
        updateDoc.suggestedCategory = null
      }
    }

    if (tags !== undefined) updateDoc.tags = Array.isArray(tags) ? tags : []
    if (image) {
      updateDoc.image = image
      updateDoc.avatarUrl = image
    }
    if (avatarUrl) {
      updateDoc.image = avatarUrl
      updateDoc.avatarUrl = avatarUrl
    }
    if (nationalIdFrontUrl !== undefined) updateDoc.nationalIdFrontUrl = nationalIdFrontUrl
    if (nationalIdBackUrl !== undefined) updateDoc.nationalIdBackUrl = nationalIdBackUrl
    if (commercialRegisterNumber !== undefined) {
      updateDoc.commercialRegisterNumber = String(commercialRegisterNumber).trim()
    }
    if (taxNumber !== undefined) {
      updateDoc.taxNumber = String(taxNumber).trim()
    }
    if (commercialRegisterUrl !== undefined) {
      updateDoc.commercialRegisterUrl = commercialRegisterUrl
    }
    if (taxIdDocumentUrl !== undefined) {
      updateDoc.taxIdDocumentUrl = taxIdDocumentUrl
    }

    if (Array.isArray(certificates)) {
      updateDoc.certificates = certificates
        .filter((c: any) => c && c.title && c.fileUrl)
        .map((c: any) => ({
          title: String(c.title).trim(),
          fileUrl: String(c.fileUrl).trim(),
          fileType:
            c.fileType === 'pdf' || String(c.fileUrl).toLowerCase().endsWith('.pdf')
              ? 'pdf'
              : 'image',
        }))
    }

    if (socialLinks && typeof socialLinks === 'object') {
      updateDoc.socialLinks = {
        linkedin: String(socialLinks.linkedin || '').trim(),
        instagram: String(socialLinks.instagram || '').trim(),
        facebook: String(socialLinks.facebook || '').trim(),
        twitter: String(socialLinks.twitter || '').trim(),
        website: String(socialLinks.website || '').trim(),
        other: String(socialLinks.other || '').trim(),
      }
    }

    if (preferredPayoutMethod === 'instapay' || preferredPayoutMethod === 'bank_account') {
      updateDoc.preferredPayoutMethod = preferredPayoutMethod
    }
    if (instapayUsername !== undefined) updateDoc.instapayUsername = String(instapayUsername).trim()
    if (bankAccount && typeof bankAccount === 'object') {
      updateDoc.bankAccount = {
        bankName: String(bankAccount.bankName || '').trim(),
        accountHolderName: String(bankAccount.accountHolderName || '').trim(),
        accountNumber: String(bankAccount.accountNumber || '').trim(),
        iban: String(bankAccount.iban || '').trim(),
      }
    }

    const applyDirectly =
      Boolean(isOnboarding) ||
      session.role === 'admin' ||
      !existingExpert ||
      !existingExpert.status ||
      existingExpert.status === 'draft'

    if (applyDirectly) {
      await expertsCol.updateOne({ _id: expertObjId }, { $set: updateDoc })

      return NextResponse.json({
        success: true,
        pendingReview: false,
        message: 'Profile updated successfully',
        slug: updateDoc.slug || existingExpert?.slug,
      })
    }

    // For non-draft experts editing Info:
    // Separate direct private fields from critical public/verification fields requiring admin review
    const directFieldKeys = new Set([
      'updatedAt',
      'phone',
      'whatsapp',
      'socialLinks',
      'preferredPayoutMethod',
      'instapayUsername',
      'bankAccount',
      'suggestedCategory',
    ])

    const directSetDoc: Record<string, any> = { updatedAt: new Date() }
    const criticalChanges: Record<string, any> = {
      ...(existingExpert.pendingInfoUpdate || {}),
    }
    let hasCriticalChanges = false

    for (const [key, value] of Object.entries(updateDoc)) {
      if (directFieldKeys.has(key)) {
        directSetDoc[key] = value
      } else {
        criticalChanges[key] = value
        hasCriticalChanges = true
      }
    }

    if (hasCriticalChanges) {
      directSetDoc.pendingInfoUpdate = criticalChanges
      directSetDoc.hasPendingInfoUpdate = true
      directSetDoc.pendingInfoSubmittedAt = new Date()
      directSetDoc.pendingInfoRejectionReason = null
    }

    await expertsCol.updateOne({ _id: expertObjId }, { $set: directSetDoc })

    return NextResponse.json({
      success: true,
      pendingReview: hasCriticalChanges,
      message: hasCriticalChanges
        ? 'Your info changes have been submitted for admin review.'
        : 'Info updated successfully.',
      slug: existingExpert?.slug,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
