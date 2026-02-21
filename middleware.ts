import { NextRequest, NextResponse } from 'next/server'
import { resolveLocale, LOCALE_COOKIE, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/config'
import type { Locale } from '@/lib/i18n/config'

export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined
  const isValidCookie =
    cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)

  const locale: Locale = isValidCookie
    ? cookieLocale
    : resolveLocale(request.headers.get('accept-language'))

  const response = NextResponse.next()

  if (!isValidCookie || cookieLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    })
  }

  return response
}

export const config = {
  matcher: ['/', '/blogs', '/blogs/:path*'],
}
