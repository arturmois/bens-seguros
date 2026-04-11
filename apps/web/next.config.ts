import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

// Build a CSP connect-src allowlist that includes whichever API / chat
// URLs the current build is configured to talk to (prod uses bensseg.com,
// dev uses localhost). The env vars are read at build time — `next build`
// on Vercel picks up the production values, `next dev` picks up .env.local.
function buildConnectSrc(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
  const chatUrl =
    process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:3002'

  const toWsOrigin = (httpOrigin: string) => httpOrigin.replace(/^http/, 'ws')

  // Base allowlist: always include the production domains so a build that
  // forgets env vars still reaches prod services.
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

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@repo/shared', '@repo/env', '@repo/auth'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pps.whatsapp.net',
      },
    ],
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        // new: HSTS with subdomains (Vercel default lacks includeSubDomains)
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        // TODO(csp-nonce): migrate to nonce-based CSP via proxy.ts for strict XSS defense.
        // Current policy allows 'unsafe-inline' + 'unsafe-eval' because Next.js 16 runtime,
        // React 19, Sentry, and Turbopack dev overlay depend on them. Pragmatic hardening;
        // nonce migration tracked as a separate follow-up.
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            buildConnectSrc(),
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            'upgrade-insecure-requests',
          ].join('; '),
        },
      ],
    },
  ],
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
})
