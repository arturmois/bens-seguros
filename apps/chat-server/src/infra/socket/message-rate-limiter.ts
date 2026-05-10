import { RATE_LIMITS } from '@repo/shared'

const userTimestamps = new Map<string, number[]>()

export function isMessageAllowed(userId: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMITS.MESSAGE.windowMs
  let timestamps = userTimestamps.get(userId)
  if (!timestamps) {
    timestamps = []
    userTimestamps.set(userId, timestamps)
  }
  const firstValidIndex = timestamps.findIndex((t) => t > windowStart)
  if (firstValidIndex > 0) {
    timestamps.splice(0, firstValidIndex)
  }
  if (firstValidIndex === -1) {
    timestamps.length = 0
  }
  if (timestamps.length >= RATE_LIMITS.MESSAGE.max) {
    return false
  }
  timestamps.push(now)
  return true
}

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  const windowMs = RATE_LIMITS.MESSAGE.windowMs
  for (const [userId, timestamps] of userTimestamps) {
    const recentTimestamps = timestamps.filter((t) => t > now - windowMs)
    if (recentTimestamps.length === 0) {
      userTimestamps.delete(userId)
    } else {
      userTimestamps.set(userId, recentTimestamps)
    }
  }
}, 60_000)

cleanupInterval.unref()
