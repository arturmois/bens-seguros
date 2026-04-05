import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/terms', '/privacy']
const AUTH_PAGES = ['/login', '/register']
const AUTH_ONLY_PATHS = ['/onboarding', '/select-org', '/accept-invitation']

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get('__Secure-better-auth.session_token')?.value ??
    request.cookies.get('better-auth.session_token')?.value
  )
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = getSessionToken(request)

  // 1. Landing page — public for unauthenticated, redirect for authenticated
  if (pathname === '/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 2. Auth pages — redirect to dashboard if already logged in
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 3. Other public routes — no check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 4. No session — redirect to login
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Auth-only routes (need session, not org) — pass through
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 6. No active org cookie — redirect to select-org
  const activeOrg = request.cookies.get('bens-active-org')?.value
  if (!activeOrg) {
    return NextResponse.redirect(new URL('/select-org', request.url))
  }

  // 7. All checks passed
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
