'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Globe } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '@/lib/i18n/config'
import { addLocalePrefix } from '@/lib/i18n/pathname'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{LOCALE_NAMES[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 rounded-lg bg-[#1a1a1e] border border-white/10 shadow-xl py-1 z-50">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc)
                const nextPath = addLocalePrefix(pathname || '/', loc)
                const nextQuery = searchParams.toString()
                router.push(nextQuery ? `${nextPath}?${nextQuery}` : nextPath)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                loc === locale
                  ? 'text-white bg-white/5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {LOCALE_NAMES[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
