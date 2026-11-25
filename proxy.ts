import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Ignore static assets, internal files, api routes, and files with extensions
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/fonts') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const isArPath = pathname === '/ar' || pathname.startsWith('/ar/')
  const cookieLang = request.cookies.get('bok_lang')?.value
  const mockCountryCookie = request.cookies.get('bok_mock_country')?.value
  const persistedCountryCookie = request.cookies.get('bok_country')?.value
  const vercelCountry = request.headers.get('x-vercel-ip-country') || request.headers.get('x-country')
  const detectedCountry =
    mockCountryCookie ||
    vercelCountry ||
    persistedCountryCookie ||
    'EG'

  // 1. If path is /ar or starts with /ar/: rewrite to stripped path
  if (isArPath) {
    const strippedPath = pathname === '/ar' ? '/' : pathname.replace(/^\/ar/, '') || '/'
    const url = request.nextUrl.clone()
    url.pathname = strippedPath

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-bok-lang', 'ar')
    requestHeaders.set('x-bok-country', detectedCountry)

    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })

    if (cookieLang !== 'ar') {
      response.cookies.set('bok_lang', 'ar', { path: '/', maxAge: 31536000, sameSite: 'lax' })
    }
    if (persistedCountryCookie !== detectedCountry) {
      response.cookies.set('bok_country', detectedCountry, { path: '/', maxAge: 31536000, sameSite: 'lax' })
    }
    return response
  }

  // 2. If cookie explicitly says 'ar' and user visited a non-/ar path directly:
  // Redirect to /ar path to keep Arabic active and visible in the URL
  if (cookieLang === 'ar') {
    const targetUrl = request.nextUrl.clone()
    targetUrl.pathname = pathname === '/' ? '/ar' : `/ar${pathname}`
    return NextResponse.redirect(targetUrl)
  }

  // 3. Default English path
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-bok-lang', 'en')
  requestHeaders.set('x-bok-country', detectedCountry)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (persistedCountryCookie !== detectedCountry) {
    response.cookies.set('bok_country', detectedCountry, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
