'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/dictionaries'

type LocaleContextValue = {
  locale: Locale
  t: (key: string) => string
  setLocale: (locale: Locale) => void
  isLoading: boolean
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

function writeCookieLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
}

type Props = {
  initialLocale: Locale
  initialDictionary: Dictionary
  children: React.ReactNode
}

export function LocaleProvider({ initialLocale, initialDictionary, children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [dictionary, setDictionary] = useState<Dictionary>(initialDictionary)
  const [isLoading, setIsLoading] = useState(false)

  const t = useCallback(
    (key: string): string => {
      return dictionary[key] ?? key
    },
    [dictionary]
  )

  const setLocale = useCallback(async (newLocale: Locale) => {
    setIsLoading(true)
    writeCookieLocale(newLocale)
    setLocaleState(newLocale)

    const { getDictionary } = await import('@/lib/i18n/dictionaries')
    const newDict = await getDictionary(newLocale)
    setDictionary(newDict)
    setIsLoading(false)

    document.documentElement.lang = newLocale
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t, setLocale, isLoading }),
    [locale, t, setLocale, isLoading]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
