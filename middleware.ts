import { NextRequest, NextResponse } from 'next/server'
import { resolveLocale, LOCALE_COOKIE, SUPPORTED_LOCALES } from '@/lib/i18n/config'
import type { Locale } from '@/lib/i18n/config'
import { addLocalePrefix, extractLocaleFromPathname } from '@/lib/i18n/pathname'

const PUBLIC_PATHS = ['/', '/blogs', '/docs', '/login', '/signup'] as const

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number]) ||
    pathname.startsWith('/blogs/') ||
    pathname.startsWith('/docs/') ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/signup/')
  )
}

function syncLocaleCookie(
  response: NextResponse,
  cookieLocale: Locale | undefined,
  locale: Locale,
  isValidCookie: boolean
): void {
  if (!isValidCookie || cookieLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    })
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined
  const isValidCookie =
    cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)

  const fallbackLocale: Locale = isValidCookie
    ? cookieLocale
    : resolveLocale(request.headers.get('accept-language'))

  const localeFromPath = extractLocaleFromPathname(pathname)

  if (localeFromPath) {
    const { locale, pathname: strippedPathname } = localeFromPath
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-locale', locale)
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = strippedPathname

    const response = isPublicPath(strippedPathname)
      ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } })

    syncLocaleCookie(response, cookieLocale, locale, Boolean(isValidCookie))
    return response
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', fallbackLocale)

  if (isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = addLocalePrefix(pathname, fallbackLocale)

    const response = NextResponse.redirect(redirectUrl)
    syncLocaleCookie(response, cookieLocale, fallbackLocale, Boolean(isValidCookie))
    return response
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  syncLocaleCookie(response, cookieLocale, fallbackLocale, Boolean(isValidCookie))
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
}
