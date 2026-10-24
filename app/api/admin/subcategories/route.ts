import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import {
  getCategoriesCollection,
  getSubcategoriesCollection,
  getServicesCollection,
  getExpertsCollection,
  toObjectId,
} from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized: Administrator access required', status: 403, session: null }
  }
  return { error: null, status: 200, session }
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

// GET /api/admin/subcategories
export async function GET(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const categoryIdParam = searchParams.get('categoryId')
    const q = searchParams.get('q')?.trim()
    const status = searchParams.get('status')

    const subcategoriesCol = await getSubcategoriesCollection()
    const categoriesCol = await getCategoriesCollection()

    const filter: any = {}

    if (categoryIdParam) {
      try {
        filter.categoryId = toObjectId(categoryIdParam)
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid categoryId parameter' }, { status: 400 })
      }
    }

    if (status === 'active') {
      filter.isActive = true
    } else if (status === 'inactive') {
      filter.isActive = false
    }

    if (q) {
      const regex = new RegExp(q, 'i')
      filter.$or = [
        { 'name.en': regex },
        { 'name.ar': regex },
        { slug: regex },
        { 'description.en': regex },
        { 'description.ar': regex },
      ]
    }

    const subdocs = await subcategoriesCol
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray()

    // Fetch parent categories for display
    const categories = await categoriesCol.find({}).toArray()
    const catMap = new Map(categories.map((c) => [c._id.toString(), c]))

    const formatted = subdocs.map((s) => {
      const parent = catMap.get(s.categoryId.toString())
      return {
        ...s,
        _id: s._id.toString(),
        id: s._id.toString(),
        categoryId: s.categoryId.toString(),
        categoryName: parent?.name,
        categorySlug: parent?.slug,
        categoryIsActive: parent?.isActive ?? true,
      }
    })

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch subcategories' },
      { status: 500 }
    )
  }
}

// POST /api/admin/subcategories (Create new subcategory)
export async function POST(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { categoryId: parentCatId, name, slug: customSlug, description, isActive, sortOrder } = body

    if (!parentCatId) {
      return NextResponse.json(
        { success: false, error: 'Parent category ID is required.' },
        { status: 400 }
      )
    }

    const categoryId = toObjectId(parentCatId)
    const categoriesCol = await getCategoriesCollection()
    const parent = await categoriesCol.findOne({ _id: categoryId })
    if (!parent) {
      return NextResponse.json(
        { success: false, error: 'Parent category not found.' },
        { status: 404 }
      )
    }

    if (!name?.en || !name.en.trim()) {
      return NextResponse.json(
        { success: false, error: 'English subcategory name is required.' },
        { status: 400 }
      )
    }

    if (!name?.ar || !name.ar.trim()) {
      return NextResponse.json(
        { success: false, error: 'Arabic subcategory name is required.' },
        { status: 400 }
      )
    }

    const slug = slugify(customSlug || name.en)
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Could not generate a valid URL slug for subcategory.' },
        { status: 400 }
      )
    }

    const subcategoriesCol = await getSubcategoriesCollection()
    const existing = await subcategoriesCol.findOne({
      categoryId,
      slug,
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `A subcategory with slug "${slug}" already exists under "${parent.name.en}".`,
        },
        { status: 409 }
      )
    }

    const newId = new ObjectId()
    const doc = {
      _id: newId,
      categoryId,
      name: {
        en: String(name.en).trim(),
        ar: String(name.ar).trim(),
      },
      slug,
      description: {
        en: String(description?.en || '').trim(),
        ar: String(description?.ar || '').trim(),
      },
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await subcategoriesCol.insertOne(doc)

    return NextResponse.json({
      success: true,
      message: 'Subcategory created successfully.',
      data: {
        ...doc,
        _id: newId.toString(),
        id: newId.toString(),
        categoryId: categoryId.toString(),
        categoryName: parent.name,
        categorySlug: parent.slug,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create subcategory' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/subcategories (Update subcategory)
export async function PATCH(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, categoryId: newCatId, name, slug: customSlug, description, isActive, sortOrder } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Subcategory ID is required' },
        { status: 400 }
      )
    }

    const subcategoryId = toObjectId(id)
    const subcategoriesCol = await getSubcategoriesCollection()
    const existing = await subcategoriesCol.findOne({ _id: subcategoryId })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      )
    }

    let targetCategoryId = existing.categoryId
    if (newCatId) {
      targetCategoryId = toObjectId(newCatId)
      const categoriesCol = await getCategoriesCollection()
      const parent = await categoriesCol.findOne({ _id: targetCategoryId })
      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Target parent category not found' },
          { status: 404 }
        )
      }
    }

    const updateFields: any = {
      updatedAt: new Date(),
    }

    if (newCatId) {
      updateFields.categoryId = targetCategoryId
    }

    if (name) {
      if (name.en !== undefined) {
        if (!name.en.trim()) {
          return NextResponse.json(
            { success: false, error: 'English subcategory name cannot be empty.' },
            { status: 400 }
          )
        }
        updateFields['name.en'] = String(name.en).trim()
      }
      if (name.ar !== undefined) {
        if (!name.ar.trim()) {
          return NextResponse.json(
            { success: false, error: 'Arabic subcategory name cannot be empty.' },
            { status: 400 }
          )
        }
        updateFields['name.ar'] = String(name.ar).trim()
      }
    }

    const targetSlug = customSlug ? slugify(customSlug) : existing.slug
    if (customSlug || newCatId) {
      // Check for slug collision in target parent category
      const slugConflict = await subcategoriesCol.findOne({
        categoryId: targetCategoryId,
        slug: targetSlug,
        _id: { $ne: subcategoryId },
      })
      if (slugConflict) {
        return NextResponse.json(
          {
            success: false,
            error: `Slug "${targetSlug}" already exists under the selected parent category.`,
          },
          { status: 409 }
        )
      }
      if (customSlug) {
        updateFields.slug = targetSlug
      }
    }

    if (description !== undefined) {
      if (description.en !== undefined) updateFields['description.en'] = String(description.en).trim()
      if (description.ar !== undefined) updateFields['description.ar'] = String(description.ar).trim()
    }

    if (isActive !== undefined) {
      updateFields.isActive = Boolean(isActive)
    }

    if (sortOrder !== undefined) {
      updateFields.sortOrder = Number(sortOrder) || 1
    }

    await subcategoriesCol.updateOne({ _id: subcategoryId }, { $set: updateFields })

    const updated = await subcategoriesCol.findOne({ _id: subcategoryId })

    return NextResponse.json({
      success: true,
      message: 'Subcategory updated successfully.',
      data: {
        ...updated,
        _id: updated?._id.toString(),
        id: updated?._id.toString(),
        categoryId: updated?.categoryId.toString(),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update subcategory' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/subcategories (Safe deletion)
export async function DELETE(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Subcategory ID is required' },
        { status: 400 }
      )
    }

    const subcategoryId = toObjectId(id)
    const subcategoriesCol = await getSubcategoriesCollection()
    const servicesCol = await getServicesCollection()
    const expertsCol = await getExpertsCollection()

    const sub = await subcategoriesCol.findOne({ _id: subcategoryId })
    if (!sub) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      )
    }

    // Safety Rule: Check if any services reference this subcategory
    const serviceCount = await servicesCol.countDocuments({ subcategorySlug: sub.slug })
    if (serviceCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete subcategory "${sub.name.en}" because ${serviceCount} service(s) currently reference it. Please reassign the services or deactivate the subcategory instead.`,
        },
        { status: 400 }
      )
    }

    // Safety Rule: Check if any experts reference this subcategory
    const expertCount = await expertsCol.countDocuments({
      $or: [
        { subcategorySlug: sub.slug },
        { subcategorySlugs: sub.slug },
        { 'categories.subcategories': sub.slug },
      ],
    })
    if (expertCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete subcategory "${sub.name.en}" because ${expertCount} expert(s) reference it. Please deactivate the subcategory instead.`,
        },
        { status: 400 }
      )
    }

    await subcategoriesCol.deleteOne({ _id: subcategoryId })

    return NextResponse.json({
      success: true,
      message: `Subcategory "${sub.name.en}" was safely deleted.`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete subcategory' },
      { status: 500 }
    )
  }
}
