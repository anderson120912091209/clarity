import { describe, expect, it } from 'vitest'
import {
  addLocalePrefix,
  buildLocaleAlternates,
  extractLocaleFromPathname,
  isSupportedLocale,
  stripLocaleFromPathname,
} from '../pathname'

describe('i18n pathname helpers', () => {
  it('detects supported locales', () => {
    expect(isSupportedLocale('en')).toBe(true)
    expect(isSupportedLocale('zh-TW')).toBe(true)
    expect(isSupportedLocale('es')).toBe(false)
    expect(isSupportedLocale(null)).toBe(false)
  })

  it('extracts locale and strips the locale prefix', () => {
    expect(extractLocaleFromPathname('/zh-TW/docs/setup')).toEqual({
      locale: 'zh-TW',
      pathname: '/docs/setup',
    })
    expect(extractLocaleFromPathname('/fr')).toEqual({
      locale: 'fr',
      pathname: '/',
    })
    expect(extractLocaleFromPathname('/docs')).toBeNull()
  })

  it('strips locale prefixes safely', () => {
    expect(stripLocaleFromPathname('/en/docs')).toBe('/docs')
    expect(stripLocaleFromPathname('/ja')).toBe('/')
    expect(stripLocaleFromPathname('/blogs')).toBe('/blogs')
  })

  it('adds locale prefixes without double-prefixing', () => {
    expect(addLocalePrefix('/docs', 'en')).toBe('/en/docs')
    expect(addLocalePrefix('/zh-CN/docs', 'fr')).toBe('/fr/docs')
    expect(addLocalePrefix('/', 'ja')).toBe('/ja')
  })

  it('builds locale alternates for a path', () => {
    expect(buildLocaleAlternates('/blogs/post-1')).toEqual({
      en: '/en/blogs/post-1',
      'zh-TW': '/zh-TW/blogs/post-1',
      'zh-CN': '/zh-CN/blogs/post-1',
      ja: '/ja/blogs/post-1',
      fr: '/fr/blogs/post-1',
    })
  })
})
