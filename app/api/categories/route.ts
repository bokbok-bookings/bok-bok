import { NextResponse } from 'next/server'
import { getCategoriesCollection, getSubcategoriesCollection, ensureDbIndexes } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import {
  CATEGORIES,
  ALLOWED_CATEGORY_SLUGS,
  isAllowedMvpCategory,
  isAllowedMvpSubcategory,
  isRemovedCategory,
} from '@/lib/data/categories'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Run index check non-blocking in the background so category fetches respond immediately
    void ensureDbIndexes()
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
      if (!canIncludeInactive && (isRemovedCategory(slug) || !isAllowedMvpCategory(slug))) {
        return NextResponse.json(
          { success: false, error: 'Category is outside the approved MVP taxonomy or inactive' },
          { status: 404 }
        )
      }

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

      const filteredSubcategories = canIncludeInactive
        ? subcategories
        : subcategories.filter((sub) => isAllowedMvpSubcategory(category.slug, sub.slug))

      return NextResponse.json({
        success: true,
        data: {
          ...category,
          _id: category._id.toString(),
          id: category._id.toString(),
          subcategories: filteredSubcategories.map((sub) => ({
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
      catFilter.slug = { $in: Array.from(ALLOWED_CATEGORY_SLUGS) }
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

    const formatted = categories
      .filter((cat) => (canIncludeInactive ? true : isAllowedMvpCategory(cat.slug)))
      .map((cat) => {
        const subs = subByCatId[cat._id.toString()] || []
        return {
          ...cat,
          _id: cat._id.toString(),
          id: cat._id.toString(),
          subcategories: canIncludeInactive
            ? subs
            : subs.filter((s) => isAllowedMvpSubcategory(cat.slug, s.slug)),
        }
      })

    // Fallback to static MVP taxonomy if DB is empty for public requests
    if (!canIncludeInactive && formatted.length === 0) {
      const fallback = CATEGORIES.map((cat, idx) => ({
        _id: cat.slug,
        id: cat.slug,
        slug: cat.slug,
        name: cat.title,
        description: cat.description,
        isActive: true,
        sortOrder: idx + 1,
        subcategories: cat.subcategories.map((sub, subIdx) => ({
          _id: `${cat.slug}-${sub.slug}`,
          id: `${cat.slug}-${sub.slug}`,
          categoryId: cat.slug,
          slug: sub.slug,
          name: sub.title,
          isActive: true,
          sortOrder: subIdx + 1,
        })),
      }))
      return NextResponse.json({
        success: true,
        data: fallback,
      })
    }

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
