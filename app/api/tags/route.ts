import { NextResponse } from 'next/server'
import { getTagsCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'

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

// GET /api/tags
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const tagsCol = await getTagsCollection()
    const filter: any = {}
    if (!includeInactive) {
      filter.isActive = true
    }

    const tags = await tagsCol.find(filter).sort({ 'name.en': 1 }).toArray()
    const formatted = tags.map((t) => ({
      ...t,
      _id: t._id.toString(),
      id: t._id.toString(),
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

// POST /api/tags (Admin only)
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name?.en || !name?.ar) {
      return NextResponse.json(
        { success: false, error: 'Tag name in both English and Arabic is required' },
        { status: 400 }
      )
    }

    const tagSlug = slug ? slugify(slug) : slugify(name.en)
    const tagsCol = await getTagsCollection()

    const existing = await tagsCol.findOne({ slug: tagSlug })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Tag slug already exists' }, { status: 409 })
    }

    const newTag = {
      _id: new ObjectId(),
      slug: tagSlug,
      name: {
        en: name.en.trim(),
        ar: name.ar.trim(),
      },
      isActive: body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await tagsCol.insertOne(newTag)

    return NextResponse.json({
      success: true,
      data: { ...newTag, _id: newTag._id.toString(), id: newTag._id.toString() },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create tag' },
      { status: 500 }
    )
  }
}

// PATCH /api/tags (Admin only)
export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, isActive } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Tag ID is required' }, { status: 400 })
    }

    const tagObjId = toObjectId(id)
    const tagsCol = await getTagsCollection()

    const updateDoc: any = { updatedAt: new Date() }
    if (name?.en && name?.ar) {
      updateDoc.name = { en: name.en.trim(), ar: name.ar.trim() }
    }
    if (isActive !== undefined) {
      updateDoc.isActive = Boolean(isActive)
    }

    await tagsCol.updateOne({ _id: tagObjId }, { $set: updateDoc })
    return NextResponse.json({ success: true, message: 'Tag updated' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update tag' },
      { status: 500 }
    )
  }
}
