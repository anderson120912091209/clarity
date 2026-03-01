'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronRight, Search, Globe, Check } from 'lucide-react'
import { type DocNavItem } from '@/lib/docs/content'
import { useDocsLocale } from '@/lib/docs/docs-locale-provider'
import { SUPPORTED_LOCALES, LOCALE_NAMES, LOCALE_COOKIE } from '@/lib/i18n/config'
import type { Locale } from '@/lib/i18n/config'
import { addLocalePrefix, stripLocaleFromPathname } from '@/lib/i18n/pathname'
import { cn } from '@/lib/utils'

function slugToHref(slug: string, locale: Locale) {
  return addLocalePrefix(`/docs/${slug}`, locale)
}

/* -- Child nav link (nested under a parent) ----------------------------- */

function ChildLink({ item, locale }: { item: DocNavItem; locale: Locale }) {
  const pathname = stripLocaleFromPathname(usePathname())
  const isActive = pathname === stripLocaleFromPathname(slugToHref(item.slug, locale))

  return (
    <li>
      <Link
        href={slugToHref(item.slug, locale)}
        className={cn(
          'block py-[5px] pl-4 text-[13px] transition-colors border-l',
          isActive
            ? 'border-purple-400 text-zinc-100 font-medium'
            : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'
        )}
      >
        {item.title}
      </Link>
    </li>
  )
}

/* -- Parent section (has icon + optional children) ---------------------- */

function SectionItem({ item, locale }: { item: DocNavItem; locale: Locale }) {
  const pathname = stripLocaleFromPathname(usePathname())
  const currentSlugHref = stripLocaleFromPathname(slugToHref(item.slug, locale))
  const isActive = pathname === currentSlugHref
  const isParentActive = pathname.startsWith(`${currentSlugHref}/`)
  const [open, setOpen] = useState(isActive || isParentActive)

  const hasChildren = item.children && item.children.length > 0
  const Icon = item.icon

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link
          href={slugToHref(item.slug, locale)}
          className={cn(
            'flex flex-1 items-center gap-2.5 rounded-md px-2 py-[6px] text-[13px] transition-colors',
            isActive || isParentActive
              ? 'text-zinc-100 font-medium'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          {Icon && (
            <span className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md border',
              isActive || isParentActive
                ? 'bg-purple-500/15 border-purple-500/20 text-purple-400'
                : 'bg-white/[0.03] border-white/[0.06] text-zinc-500'
            )}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          {item.title}
          {item.badge && (
            <span className="ml-auto rounded-full bg-purple-500/15 border border-purple-500/20 px-1.5 py-[1px] text-[10px] font-semibold leading-tight text-purple-400">
              {item.badge}
            </span>
          )}
        </Link>
        {hasChildren && (
          <button
            onClick={() => setOpen(!open)}
            className="rounded p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-90')}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="ml-[19px] mt-1 space-y-[1px] mb-1">
          {item.children!.map((child) => (
            <ChildLink key={child.slug} item={child} locale={locale} />
          ))}
        </ul>
      )}
    </div>
  )
}

/* -- Language switcher --------------------------------------------------- */

function LanguageSwitcher() {
  const { locale } = useDocsLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function switchLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365}`
    const nextPath = addLocalePrefix(pathname || '/', next)
    const query = searchParams.toString()
    router.push(query ? `${nextPath}?${query}` : nextPath)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] transition-colors',
          open
            ? 'text-zinc-300 bg-white/[0.06]'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
        )}
      >
        <Globe className="h-3 w-3" />
        <span>{LOCALE_NAMES[locale as Locale] ?? locale}</span>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 w-[160px] rounded-lg border border-white/[0.08] bg-[#131318] shadow-xl shadow-black/40 py-1 z-50">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-[6px] text-[12px] transition-colors text-left',
                loc === locale
                  ? 'text-purple-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              )}
            >
              {loc === locale && <Check className="h-3 w-3 shrink-0" />}
              <span className={loc === locale ? '' : 'pl-5'}>{LOCALE_NAMES[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* -- Main sidebar component --------------------------------------------- */

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { nav, content, ui, locale: docsLocale } = useDocsLocale()
  const locale = docsLocale as Locale
  const [query, setQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    const results: { slug: string; title: string }[] = []
    for (const [slug, page] of Object.entries(content)) {
      if (page.title.toLowerCase().includes(q) || page.description.toLowerCase().includes(q)) {
        results.push({ slug, title: page.title })
      }
    }
    return results
  }, [query, content])

  const gettingStarted = nav.filter((i) =>
    ['introduction', 'getting-started'].includes(i.slug)
  )
  const features = nav.filter((i) =>
    ['editor', 'ai-assistant', 'collaboration', 'projects', 'mcp'].includes(i.slug)
  )
  const more = nav.filter((i) =>
    ['settings', 'billing', 'faq'].includes(i.slug)
  )

  return (
    <nav className="flex flex-col h-full overflow-x-hidden" onClick={onNavigate}>
      {/* Header */}
      <div className="px-4 pt-1 pb-4">
        <Link href={addLocalePrefix('/', locale)} className="inline-flex">
          <img
            src="/landing/claritylogopurple.png"
            alt="Clarity"
            className="h-[22px] w-auto"
          />
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ui.search}
            className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] pl-8 pr-8 py-[7px] text-[12.5px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-purple-500/30 focus:bg-white/[0.05] transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 border border-white/[0.06] rounded px-1 py-0.5 font-mono leading-none">
            K
          </kbd>
        </div>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-6">
        {searchResults !== null ? (
          /* Search results */
          <div className="space-y-0.5">
            <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              {ui.results}
            </p>
            {searchResults.length === 0 ? (
              <p className="px-2 py-6 text-[12.5px] text-zinc-600 text-center">
                {ui.noResults}
              </p>
            ) : (
              searchResults.map((r) => (
                <Link
                  key={r.slug}
                  href={addLocalePrefix(`/docs/${r.slug}`, locale)}
                  className="block rounded-md px-2 py-[6px] text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
                >
                  {r.title}
                </Link>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Getting started */}
            <div className="space-y-[2px]">
              {gettingStarted.map((item) => (
                <SectionItem key={item.slug} item={item} locale={locale} />
              ))}
            </div>

            {/* Features */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                {ui.features}
              </p>
              <div className="space-y-[2px]">
                {features.map((item) => (
                  <SectionItem key={item.slug} item={item} locale={locale} />
                ))}
              </div>
            </div>

            {/* More */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                {ui.more}
              </p>
              <div className="space-y-[2px]">
                {more.map((item) => (
                  <SectionItem key={item.slug} item={item} locale={locale} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11.5px] text-zinc-600">
          <a
            href="https://discord.gg/JHQhC8VstM"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors"
          >
            Discord
          </a>
          <span className="h-0.5 w-0.5 rounded-full bg-zinc-800" />
          <Link href={addLocalePrefix('/blogs', locale)} className="hover:text-zinc-400 transition-colors">
            {ui.blog}
          </Link>
          <span className="h-0.5 w-0.5 rounded-full bg-zinc-800" />
          <Link href={addLocalePrefix('/', locale)} className="hover:text-zinc-400 transition-colors">
            {ui.home}
          </Link>
        </div>
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
