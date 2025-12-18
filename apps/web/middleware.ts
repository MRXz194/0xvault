import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl
  const accessToken = req.cookies.get('sb-access-token')?.value
  const hasSession = Boolean(accessToken)

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap')
  ) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === '/login' || pathname === '/register') && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', origin))
  }

  // Require session for protected routes
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/unlock')) && !hasSession) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\.).*)'],
}
