const IS_DEV = process.env.NODE_ENV === 'development'

function buildConnectSrc(): string {
  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
  ).trim()
  const chatUrl = (
    process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:3002'
  ).trim()

  const toWsOrigin = (httpOrigin: string) => httpOrigin.replace(/^http/, 'ws')

  const origins = new Set<string>([
    "'self'",
    'https://api.bensseg.com',
    'wss://api.bensseg.com',
    'https://chat.bensseg.com',
    'wss://chat.bensseg.com',
    'https://*.ingest.us.sentry.io',
    apiUrl,
    toWsOrigin(apiUrl),
    chatUrl,
    toWsOrigin(chatUrl),
  ])

  return `connect-src ${Array.from(origins).join(' ')}`
}

export function buildCspHeader(nonce: string): string {
  // 'self' is a fallback for browsers that don't support 'strict-dynamic' (CSP L3).
  // In compliant browsers, 'strict-dynamic' takes precedence and 'self' is ignored.
  const scriptSrc = IS_DEV
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    buildConnectSrc(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}
