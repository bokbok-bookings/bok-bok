import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { getUsersCollection, toObjectId } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized: Admin access required', status: 403 }
  }
  return { error: null, session }
}

export async function GET() {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const usersCol = await getUsersCollection()
    const users = await usersCol
      .find({})
      .project({ passwordHash: 0 })
      .sort({ createdAt: -1 })
      .toArray()

    const formatted = users.map((u) => ({
      ...u,
      _id: u._id.toString(),
      expertId: u.expertId?.toString(),
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { email, password, displayName, role, phone } = body

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const usersCol = await getUsersCollection()
    const existing = await usersCol.findOne({ email: cleanEmail })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const newUserId = new ObjectId()
    await usersCol.insertOne({
      _id: newUserId,
      email: cleanEmail,
      passwordHash,
      displayName: String(displayName).trim(),
      role: role || 'admin',
      phone: phone || '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: {
        _id: newUserId.toString(),
        email: cleanEmail,
        displayName,
        role: role || 'admin',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { userId, displayName, email, role, status, phone, password } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    const userObjId = toObjectId(userId)
    const usersCol = await getUsersCollection()

    const existing = await usersCol.findOne({ _id: userObjId })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const updateDoc: any = {
      updatedAt: new Date(),
    }

    if (displayName !== undefined) updateDoc.displayName = String(displayName).trim()
    if (phone !== undefined) updateDoc.phone = String(phone).trim()
    if (role && ['admin', 'expert', 'client'].includes(role)) updateDoc.role = role
    if (status && ['active', 'pending', 'disabled'].includes(status)) updateDoc.status = status

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase()
      if (cleanEmail !== existing.email) {
        const dup = await usersCol.findOne({ email: cleanEmail, _id: { $ne: userObjId } })
        if (dup) {
          return NextResponse.json(
            { success: false, error: 'Another user with this email already exists' },
            { status: 409 }
          )
        }
        updateDoc.email = cleanEmail
      }
    }

    if (password && String(password).trim().length >= 6) {
      const salt = await bcrypt.genSalt(10)
      updateDoc.passwordHash = await bcrypt.hash(String(password).trim(), salt)
    }

    await usersCol.updateOne({ _id: userObjId }, { $set: updateDoc })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await checkAdmin()
    if (auth.error || !auth.session) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    let userId = searchParams.get('userId') || searchParams.get('id')

    if (!userId) {
      try {
        const body = await request.json()
        userId = body.userId || body.id
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    if (auth.session.userId === userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own administrative account' },
        { status: 400 }
      )
    }

    const userObjId = toObjectId(userId)
    const usersCol = await getUsersCollection()

    const res = await usersCol.deleteOne({ _id: userObjId })
    if (res.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
