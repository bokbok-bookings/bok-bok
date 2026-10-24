import { NextResponse } from 'next/server'
import { getCategoriesCollection, getSubcategoriesCollection, ensureDbIndexes } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await ensureDbIndexes()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const requestedIncludeInactive = searchParams.get('includeInactive') === 'true'

    let canIncludeInactive = false
    if (requestedIncludeInactive) {
      const session = await getSession()
      if (session?.role === 'admin') {
        canIncludeInactive = true
      }
    }

    const categoriesCol = await getCategoriesCollection()
    const subcategoriesCol = await getSubcategoriesCollection()

    // Single category by slug
    if (slug) {
      const catQuery: any = { slug }
      if (!canIncludeInactive) {
        catQuery.isActive = true
      }

      const category = await categoriesCol.findOne(catQuery)
      if (!category) {
        return NextResponse.json(
          { success: false, error: 'Category not found or inactive' },
          { status: 404 }
        )
      }

      const subQuery: any = { categoryId: category._id }
      if (!canIncludeInactive) {
        subQuery.isActive = true
      }

      const subcategories = await subcategoriesCol
        .find(subQuery)
        .sort({ sortOrder: 1, 'name.en': 1 })
        .toArray()

      return NextResponse.json({
        success: true,
        data: {
          ...category,
          _id: category._id.toString(),
          id: category._id.toString(),
          subcategories: subcategories.map((sub) => ({
            ...sub,
            _id: sub._id.toString(),
            id: sub._id.toString(),
            categoryId: sub.categoryId.toString(),
          })),
        },
      })
    }

    // List categories
    const catFilter: any = {}
    if (!canIncludeInactive) {
      catFilter.isActive = true
    }

    const categories = await categoriesCol
      .find(catFilter)
      .sort({ sortOrder: 1, 'name.en': 1 })
      .toArray()

    const subFilter: any = {}
    if (!canIncludeInactive) {
      subFilter.isActive = true
    }

    // Fetch all relevant subcategories
    const allSubcategories = await subcategoriesCol
      .find(subFilter)
      .sort({ sortOrder: 1, 'name.en': 1 })
      .toArray()

    // Group subcategories by parent categoryId string
    const subByCatId: Record<string, any[]> = {}
    for (const sub of allSubcategories) {
      const catIdStr = sub.categoryId.toString()
      if (!subByCatId[catIdStr]) {
        subByCatId[catIdStr] = []
      }
      subByCatId[catIdStr].push({
        ...sub,
        _id: sub._id.toString(),
        id: sub._id.toString(),
        categoryId: catIdStr,
      })
    }

    const formatted = categories.map((cat) => ({
      ...cat,
      _id: cat._id.toString(),
      id: cat._id.toString(),
      subcategories: subByCatId[cat._id.toString()] || [],
    }))

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
