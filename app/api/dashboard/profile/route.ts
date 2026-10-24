import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getExpertsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetExpertId = session.role === 'admin' && searchParams.get('expertId')
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
      name,
      role,
      location,
      bio,
      about,
      categorySlug,
      subcategorySlug,
      categories,
      tags,
      image,
      avatarUrl,
      nationalIdFrontUrl,
      nationalIdBackUrl,
      instapayUsername,
    } = body

    const targetExpertId = session.role === 'admin' && expertId
      ? expertId
      : session.expertId

    if (!targetExpertId) {
      return NextResponse.json({ success: false, error: 'No expert ID provided' }, { status: 400 })
    }

    const expertObjId = toObjectId(targetExpertId)
    const expertsCol = await getExpertsCollection()

    const updateDoc: any = {
      updatedAt: new Date(),
    }

    if (name) updateDoc.name = String(name).trim()
    if (role) updateDoc.role = String(role).trim()
    if (location) updateDoc.location = String(location).trim()
    if (bio !== undefined) updateDoc.bio = String(bio).trim()
    if (about !== undefined) updateDoc.about = String(about).trim()
    if (categorySlug) updateDoc.categorySlug = categorySlug
    if (subcategorySlug !== undefined) updateDoc.subcategorySlug = subcategorySlug

    // Support maximum 3 categories and their subcategories
    if (Array.isArray(categories)) {
      const sanitizedCats = categories.slice(0, 3).map((c: any) => ({
        categorySlug: String(c.categorySlug || ''),
        subcategories: Array.isArray(c.subcategories) ? c.subcategories.map(String) : [],
      }))
      updateDoc.categories = sanitizedCats
      updateDoc.categorySlugs = sanitizedCats.map((c: any) => c.categorySlug)
      updateDoc.subcategorySlugs = sanitizedCats.flatMap((c: any) => c.subcategories)
      if (sanitizedCats[0]?.categorySlug) {
        updateDoc.categorySlug = sanitizedCats[0].categorySlug
      }
      if (sanitizedCats[0]?.subcategories[0]) {
        updateDoc.subcategorySlug = sanitizedCats[0].subcategories[0]
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
    if (instapayUsername !== undefined) updateDoc.instapayUsername = String(instapayUsername).trim()

    await expertsCol.updateOne({ _id: expertObjId }, { $set: updateDoc })

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
