const COOKIE_NAME = 'bens-active-org'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function setActiveOrgCookie(organizationId: string) {
  const secure = globalThis.location?.protocol === 'https:' ? ';secure' : ''
  document.cookie = `${COOKIE_NAME}=${organizationId};path=/;max-age=${MAX_AGE};samesite=lax${secure}`
}

export function clearActiveOrgCookie() {
  const secure = globalThis.location?.protocol === 'https:' ? ';secure' : ''
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;samesite=lax${secure}`
}

export function getActiveOrgCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  )
  return match?.[1] || undefined
}
