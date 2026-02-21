import { cookies } from 'next/headers'
import { LOCALE_COOKIE, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './config'
import type { Locale } from './config'

/**
 * Read the locale on the server side (Server Components / generateMetadata).
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get(LOCALE_COOKIE)?.value
  if (value && (SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    return value as Locale
  }
  return DEFAULT_LOCALE
}
