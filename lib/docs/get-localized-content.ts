import type { Locale } from '@/lib/i18n/config'
import type { DocsLocaleData, DocsUIStrings } from './i18n/types'

export const defaultUI: DocsUIStrings = {
  search: 'Search...',
  onThisPage: 'On this page',
  previous: 'Previous',
  next: 'Next',
  wasThisHelpful: 'Was this helpful?',
  thanksFeedback: 'Thanks for your feedback!',
  willImprove: "We'll work on improving this.",
  results: 'Results',
  noResults: 'No results found.',
  features: 'Features',
  more: 'More',
  docs: 'Docs',
  blog: 'Blog',
  home: 'Home',
}

export async function getDocsLocaleData(
  locale: Locale
): Promise<DocsLocaleData | null> {
  if (locale === 'en') return null

  try {
    switch (locale) {
      case 'zh-TW':
        return (await import('./i18n/zh-TW')).default
      case 'zh-CN':
        return (await import('./i18n/zh-CN')).default
      case 'ja':
        return (await import('./i18n/ja')).default
      case 'fr':
        return (await import('./i18n/fr')).default
      default:
        return null
    }
  } catch {
    return null
  }
}
