import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { UserRole } from '@/lib/db'

export interface SessionPayload {
  userId: string
  email: string
  displayName: string
  role: UserRole
  expertId?: string
  expiresAt: Date
}

const secretKey =
  process.env.SESSION_SECRET ||
  'bok_bok_secure_session_secret_key_change_in_production_2026_xyz'
const encodedKey = new TextEncoder().encode(secretKey)

const COOKIE_NAME = 'bokbok_session'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
    expertId: payload.expertId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodedKey)
}

export async function decrypt(
  session: string | undefined = ''
): Promise<{
  userId: string
  email: string
  displayName: string
  role: UserRole
  expertId?: string
} | null> {
  if (!session) return null
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      displayName: payload.displayName as string,
      role: payload.role as UserRole,
      expertId: payload.expertId as string | undefined,
    }
  } catch {
    return null
  }
}

export async function createSession(user: {
  id: string
  email: string
  displayName: string
  role: UserRole
  expertId?: string
}) {
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS)
  const sessionToken = await encrypt({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    expertId: user.expertId,
    expiresAt,
  })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  return sessionToken
}

export async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value
  if (!sessionCookie) return null
  return await decrypt(sessionCookie)
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
