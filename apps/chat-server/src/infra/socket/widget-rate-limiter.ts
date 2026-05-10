import { CHAT_LIMITS } from '@repo/shared'

const WIDGET_RATE_LIMIT_PER_SEC = CHAT_LIMITS.WIDGET_SOCKET_RATE_LIMIT_PER_SEC
const RATE_WINDOW_MS = 1_000

const visitorTimestamps = new Map<string, number[]>()

export function isWidgetMessageAllowed(visitorKey: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_WINDOW_MS
  let timestamps = visitorTimestamps.get(visitorKey)
  if (!timestamps) {
    timestamps = []
    visitorTimestamps.set(visitorKey, timestamps)
  }
  const firstValidIndex = timestamps.findIndex((t) => t > windowStart)
  if (firstValidIndex > 0) {
    timestamps.splice(0, firstValidIndex)
  }
  if (firstValidIndex === -1) {
    timestamps.length = 0
  }
  if (timestamps.length >= WIDGET_RATE_LIMIT_PER_SEC) {
    return false
  }
  timestamps.push(now)
  return true
}

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of visitorTimestamps) {
    const recent = timestamps.filter((t) => t > now - RATE_WINDOW_MS)
    if (recent.length === 0) {
      visitorTimestamps.delete(key)
    } else {
      visitorTimestamps.set(key, recent)
    }
  }
}, 60_000)

cleanupInterval.unref()
