import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected paths: /dashboard/**, /admin/**, /onboarding
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/')

  if (isDashboardRoute || isAdminRoute || isOnboardingRoute) {
    const sessionCookie = request.cookies.get('bokbok_session')?.value

    if (!sessionCookie) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  // If already logged in, visiting /login or /signup
  if (pathname === '/login' || pathname === '/signup') {
    const sessionCookie = request.cookies.get('bokbok_session')?.value
    if (sessionCookie) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
