import { SUPPORTED_LOCALES, type Locale } from './config'

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES as readonly string[])

function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

export function isSupportedLocale(locale: string | null | undefined): locale is Locale {
  return Boolean(locale && SUPPORTED_LOCALE_SET.has(locale))
}

export function extractLocaleFromPathname(
  pathname: string
): { locale: Locale; pathname: string } | null {
  const normalizedPathname = normalizePathname(pathname)
  const segments = normalizedPathname.split('/')
  const candidate = segments[1]

  if (!isSupportedLocale(candidate)) return null

  const stripped = normalizedPathname.slice(candidate.length + 1) || '/'
  return {
    locale: candidate,
    pathname: stripped.startsWith('/') ? stripped : `/${stripped}`,
  }
}

export function stripLocaleFromPathname(pathname: string): string {
  const extracted = extractLocaleFromPathname(pathname)
  if (!extracted) return normalizePathname(pathname)
  return extracted.pathname
}

export function addLocalePrefix(pathname: string, locale: Locale): string {
  const strippedPathname = stripLocaleFromPathname(pathname)
  if (strippedPathname === '/') return `/${locale}`
  return `/${locale}${strippedPathname}`
}

export function buildLocaleAlternates(pathname: string): Record<Locale, string> {
  const alternates = {} as Record<Locale, string>
  for (const locale of SUPPORTED_LOCALES) {
    alternates[locale] = addLocalePrefix(pathname, locale)
  }
  return alternates
}
