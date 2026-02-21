export const SUPPORTED_LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja', 'fr'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  ja: '日本語',
  fr: 'Français',
}

/**
 * Maps an Accept-Language header to a supported Locale.
 * Resolution: exact match → Chinese variant alias → base-language fallback → default.
 */
export function resolveLocale(acceptLanguageHeader: string | null): Locale {
  if (!acceptLanguageHeader) return DEFAULT_LOCALE

  const tags = acceptLanguageHeader
    .split(',')
    .map((part) => part.split(';')[0].trim())
    .filter(Boolean)

  for (const tag of tags) {
    const normalized = tag.toLowerCase()

    // Exact match
    const exactMatch = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === normalized)
    if (exactMatch) return exactMatch

    // Chinese variant mapping
    if (normalized === 'zh-hant' || normalized === 'zh-hant-tw' || normalized === 'zh-tw') {
      return 'zh-TW'
    }
    if (
      normalized === 'zh' ||
      normalized === 'zh-hans' ||
      normalized === 'zh-hans-cn' ||
      normalized === 'zh-cn'
    ) {
      return 'zh-CN'
    }

    // Base-language fallback
    const base = normalized.split('-')[0]
    const baseMatch = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === base)
    if (baseMatch) return baseMatch
  }

  return DEFAULT_LOCALE
}
