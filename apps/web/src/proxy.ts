import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];
const AUTH_ONLY_PATHS = ['/onboarding', '/select-org', '/accept-invitation'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public routes — no check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. No session — redirect to login
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Auth-only routes (need session, not org) — pass through
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 4. No active org cookie — redirect to select-org
  const activeOrg = request.cookies.get('bens-active-org')?.value;
  if (!activeOrg) {
    return NextResponse.redirect(new URL('/select-org', request.url));
  }

  // 5. All checks passed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
