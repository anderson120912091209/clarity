import type { Locale } from './config'

export type Dictionary = Record<string, string>

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/locales/en.json').then((m) => m.default),
  'zh-TW': () => import('@/locales/zh-TW.json').then((m) => m.default),
  'zh-CN': () => import('@/locales/zh-CN.json').then((m) => m.default),
  ja: () => import('@/locales/ja.json').then((m) => m.default),
  fr: () => import('@/locales/fr.json').then((m) => m.default),
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale]
  if (!loader) {
    return dictionaries.en()
  }
  return loader()
}
