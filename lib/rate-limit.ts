interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
let lastCleanupAt = Date.now()

function cleanupExpiredEntries(now: number) {
  if (now - lastCleanupAt < 60_000) return
  lastCleanupAt = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Simple in-memory fixed-window rate limiter keyed by namespace + client IP.
 */
export function checkRateLimit(
  request: Request,
  namespace: string,
  limit = 60,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now()
  cleanupExpiredEntries(now)

  const ip = getClientIp(request)
  const key = `${namespace}:${ip}`
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  existing.count += 1
  const remaining = Math.max(0, limit - existing.count)
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))

  return {
    allowed: existing.count <= limit,
    remaining,
    retryAfterSeconds,
  }
}
