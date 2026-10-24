import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { getUsersCollection, getExpertsCollection } from '@/lib/db'
import { createSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email: rawEmail, password, displayName, role: rawRole } = body

    if (!rawEmail || !password || !displayName) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const email = String(rawEmail).trim().toLowerCase()
    const role = rawRole === 'expert' ? 'expert' : 'client'
    const name = String(displayName).trim()

    const usersCol = await getUsersCollection()
    const existing = await usersCol.findOne({ email })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const userId = new ObjectId()
    let expertId: ObjectId | undefined = undefined

    if (role === 'expert') {
      expertId = new ObjectId()
      const expertsCol = await getExpertsCollection()

      // Generate a clean slug
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || `expert-${Date.now().toString(36)}`
      
      let finalSlug = baseSlug
      const existingSlug = await expertsCol.findOne({ slug: finalSlug })
      if (existingSlug) {
        finalSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`
      }

      await expertsCol.insertOne({
        _id: expertId,
        id: expertId.toString(),
        userId: userId,
        name: name,
        slug: finalSlug,
        role: 'Consultant',
        location: 'Cairo, Egypt',
        image: '/experts/layla.png',
        rating: '5.0',
        reviews: 0,
        price: '500 EGP',
        priceNumber: 500,
        tags: [],
        durationMinutes: 45,
        about: '',
        bio: '',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    await usersCol.insertOne({
      _id: userId,
      email,
      passwordHash,
      displayName: name,
      role,
      expertId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    })

    // Establish JWT session
    await createSession({
      id: userId.toString(),
      email,
      displayName: name,
      role,
      expertId: expertId?.toString(),
    })

    const redirectTo = role === 'expert' ? '/onboarding' : '/'

    return NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: userId.toString(),
        email,
        displayName: name,
        role,
        expertId: expertId?.toString(),
      },
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}
