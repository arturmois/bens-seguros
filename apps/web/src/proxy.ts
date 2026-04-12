import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { buildCspHeader } from '@/lib/csp'

const PUBLIC_PATHS = [
  '/api/auth',
  '/terms',
  '/privacy',
  '/verify-email',
  '/accept-invitation',
]
const AUTH_PAGES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]
const AUTH_ONLY_PATHS = ['/onboarding', '/select-org']

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get('__Secure-better-auth.session_token')?.value ??
    request.cookies.get('better-auth.session_token')?.value
  )
}

function nextWithCsp(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = buildCspHeader(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', cspHeader)
  return response
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = getSessionToken(request)

  // 1. Landing page — public for unauthenticated, redirect for authenticated
  if (pathname === '/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return nextWithCsp(request)
  }

  // 2. Auth pages — redirect to dashboard if already logged in
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return nextWithCsp(request)
  }

  // 3. Other public routes — no check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return nextWithCsp(request)
  }

  // 4. No session — redirect to login
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Auth-only routes (need session, not org) — pass through
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return nextWithCsp(request)
  }

  // 6. No active org cookie — redirect to select-org
  const activeOrg = request.cookies.get('bens-active-org')?.value
  if (!activeOrg) {
    return NextResponse.redirect(new URL('/select-org', request.url))
  }

  // 7. All checks passed
  return nextWithCsp(request)
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
