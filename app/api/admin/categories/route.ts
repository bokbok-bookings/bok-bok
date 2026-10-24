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
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

// GET /api/admin/categories
export async function GET(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const status = searchParams.get('status') // 'all' | 'active' | 'inactive'

    const categoriesCol = await getCategoriesCollection()
    const subcategoriesCol = await getSubcategoriesCollection()

    const filter: any = {}

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

    const categories = await categoriesCol
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray()

    // Fetch subcategories counts and subcategories for these categories
    const allSubs = await subcategoriesCol
      .find({})
      .sort({ sortOrder: 1, 'name.en': 1 })
      .toArray()

    const subMap: Record<string, any[]> = {}
    for (const sub of allSubs) {
      const parentId = sub.categoryId.toString()
      if (!subMap[parentId]) subMap[parentId] = []
      subMap[parentId].push({
        ...sub,
        _id: sub._id.toString(),
        id: sub._id.toString(),
        categoryId: parentId,
      })
    }

    const formatted = categories.map((c) => {
      const catSubs = subMap[c._id.toString()] || []
      return {
        ...c,
        _id: c._id.toString(),
        id: c._id.toString(),
        subcategoriesCount: catSubs.length,
        activeSubcategoriesCount: catSubs.filter((s) => s.isActive).length,
        subcategories: catSubs,
      }
    })

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/admin/categories (Create new category)
export async function POST(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { name, slug: customSlug, description, isActive, sortOrder } = body

    if (!name?.en || !name?.en.trim()) {
      return NextResponse.json(
        { success: false, error: 'English category name is required.' },
        { status: 400 }
      )
    }

    if (!name?.ar || !name?.ar.trim()) {
      return NextResponse.json(
        { success: false, error: 'Arabic category name is required.' },
        { status: 400 }
      )
    }

    const slug = slugify(customSlug || name.en)
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Could not generate a valid URL slug for category.' },
        { status: 400 }
      )
    }

    const categoriesCol = await getCategoriesCollection()
    const existing = await categoriesCol.findOne({ slug })
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A category with the slug "${slug}" already exists.` },
        { status: 409 }
      )
    }

    const newId = new ObjectId()
    const doc = {
      _id: newId,
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

    await categoriesCol.insertOne(doc)

    return NextResponse.json({
      success: true,
      message: 'Category created successfully.',
      data: {
        ...doc,
        _id: newId.toString(),
        id: newId.toString(),
        subcategoriesCount: 0,
        subcategories: [],
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/categories (Update category)
export async function PATCH(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, name, slug: customSlug, description, isActive, sortOrder } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const categoryId = toObjectId(id)
    const categoriesCol = await getCategoriesCollection()
    const existing = await categoriesCol.findOne({ _id: categoryId })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    const updateFields: any = {
      updatedAt: new Date(),
    }

    if (name) {
      if (name.en !== undefined) {
        if (!name.en.trim()) {
          return NextResponse.json(
            { success: false, error: 'English category name cannot be empty.' },
            { status: 400 }
          )
        }
        updateFields['name.en'] = String(name.en).trim()
      }
      if (name.ar !== undefined) {
        if (!name.ar.trim()) {
          return NextResponse.json(
            { success: false, error: 'Arabic category name cannot be empty.' },
            { status: 400 }
          )
        }
        updateFields['name.ar'] = String(name.ar).trim()
      }
    }

    if (customSlug) {
      const normalized = slugify(customSlug)
      if (normalized !== existing.slug) {
        const slugConflict = await categoriesCol.findOne({
          slug: normalized,
          _id: { $ne: categoryId },
        })
        if (slugConflict) {
          return NextResponse.json(
            { success: false, error: `Slug "${normalized}" is already taken by another category.` },
            { status: 409 }
          )
        }
        updateFields.slug = normalized
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

    await categoriesCol.updateOne({ _id: categoryId }, { $set: updateFields })

    const updated = await categoriesCol.findOne({ _id: categoryId })

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully.',
      data: {
        ...updated,
        _id: updated?._id.toString(),
        id: updated?._id.toString(),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/categories (Safe deletion)
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
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const categoryId = toObjectId(id)
    const categoriesCol = await getCategoriesCollection()
    const subcategoriesCol = await getSubcategoriesCollection()
    const servicesCol = await getServicesCollection()
    const expertsCol = await getExpertsCollection()

    const category = await categoriesCol.findOne({ _id: categoryId })
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Safety Rule 1: Check if any subcategories exist under this category
    const subCount = await subcategoriesCol.countDocuments({ categoryId })
    if (subCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete "${category.name.en}" because it has ${subCount} subcategory/subcategories. Please delete or reassign them first, or deactivate the category instead.`,
        },
        { status: 400 }
      )
    }

    // Safety Rule 2: Check if any services reference this category's slug
    const serviceCount = await servicesCol.countDocuments({ categorySlug: category.slug })
    if (serviceCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete "${category.name.en}" because ${serviceCount} service(s) currently reference it. Please reassign the services or deactivate the category.`,
        },
        { status: 400 }
      )
    }

    // Safety Rule 3: Check if any experts reference this category's slug
    const expertCount = await expertsCol.countDocuments({
      $or: [
        { categorySlug: category.slug },
        { categorySlugs: category.slug },
        { 'categories.categorySlug': category.slug },
      ],
    })
    if (expertCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete "${category.name.en}" because ${expertCount} expert(s) are categorized under it. Please reassign them or deactivate the category.`,
        },
        { status: 400 }
      )
    }

    // Safe to delete!
    await categoriesCol.deleteOne({ _id: categoryId })

    return NextResponse.json({
      success: true,
      message: `Category "${category.name.en}" was safely deleted.`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete category' },
      { status: 500 }
    )
  }
}
