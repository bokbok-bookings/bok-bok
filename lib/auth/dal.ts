import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { getSession } from './session'
import { getUsersCollection, getExpertsCollection, toObjectId } from '@/lib/db'

export const verifySession = cache(async () => {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }
  return session
})

export const requireAdmin = cache(async () => {
  const session = await verifySession()
  if (session.role !== 'admin') {
    redirect('/dashboard')
  }
  return session
})

export const requireExpert = cache(async () => {
  const session = await verifySession()
  if (session.role !== 'expert' && session.role !== 'admin') {
    redirect('/dashboard')
  }

  let expertObjectId: ObjectId | null = null

  if (session.expertId) {
    try {
      expertObjectId = toObjectId(session.expertId)
    } catch {
      expertObjectId = null
    }
  }

  // If user is an expert but has no expertId in session, check MongoDB
  if (!expertObjectId) {
    const usersCol = await getUsersCollection()
    const user = await usersCol.findOne({ _id: new ObjectId(session.userId) })
    if (user?.expertId) {
      expertObjectId = user.expertId
    } else {
      // Find expert document by userId
      const expertsCol = await getExpertsCollection()
      const expert = await expertsCol.findOne({ userId: new ObjectId(session.userId) })
      if (expert) {
        expertObjectId = expert._id
      }
    }
  }

  return {
    session,
    expertObjectId,
  }
})

export const getCurrentUser = cache(async () => {
  const session = await getSession()
  if (!session?.userId) return null

  try {
    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne(
      { _id: new ObjectId(session.userId) },
      { projection: { passwordHash: 0 } }
    )
    return user
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
})
