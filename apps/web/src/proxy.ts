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
const AUTH_ONLY_PATHS = ['/onboarding', '/select-org', '/select-plan']

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
  if (pathname === '/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return nextWithCsp(request)
  }
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return nextWithCsp(request)
  }
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return nextWithCsp(request)
  }
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return nextWithCsp(request)
  }
  const activeOrg = request.cookies.get('bens-active-org')?.value
  if (!activeOrg) {
    return NextResponse.redirect(new URL('/select-org', request.url))
  }
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
