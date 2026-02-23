'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { docsNav, docsContent, type DocNavItem } from '@/lib/docs/content'
import { cn } from '@/lib/utils'

function slugToHref(slug: string) {
  return `/docs/${slug}`
}

/* ── Child nav link (nested under a parent) ──────────────────────── */

function ChildLink({ item }: { item: DocNavItem }) {
  const pathname = usePathname()
  const isActive = pathname === slugToHref(item.slug)

  return (
    <li>
      <Link
        href={slugToHref(item.slug)}
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

/* ── Parent section (has icon + optional children) ────────────────── */

function SectionItem({ item }: { item: DocNavItem }) {
  const pathname = usePathname()
  const isActive = pathname === slugToHref(item.slug)
  const isParentActive = pathname.startsWith(slugToHref(item.slug) + '/')
  const [open, setOpen] = useState(isActive || isParentActive)

  const hasChildren = item.children && item.children.length > 0
  const Icon = item.icon

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link
          href={slugToHref(item.slug)}
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
            <ChildLink key={child.slug} item={child} />
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Simple search ────────────────────────────────────────────────── */

function useSearch(query: string) {
  if (!query.trim()) return null
  const q = query.toLowerCase()
  const results: { slug: string; title: string }[] = []
  for (const [slug, page] of Object.entries(docsContent)) {
    if (page.title.toLowerCase().includes(q) || page.description.toLowerCase().includes(q)) {
      results.push({ slug, title: page.title })
    }
  }
  return results
}

/* ── Grouping ─────────────────────────────────────────────────────── */

const gettingStarted = docsNav.filter((i) =>
  ['introduction', 'getting-started'].includes(i.slug)
)
const features = docsNav.filter((i) =>
  ['editor', 'ai-assistant', 'collaboration', 'projects'].includes(i.slug)
)
const more = docsNav.filter((i) =>
  ['settings', 'billing', 'faq'].includes(i.slug)
)

/* ── Main sidebar component ───────────────────────────────────────── */

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState('')
  const searchResults = useSearch(query)

  return (
    <nav className="flex flex-col h-full" onClick={onNavigate}>
      {/* Header */}
      <div className="px-4 pt-1 pb-4 flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/landing/claritylogopurple.png"
            alt="Clarity"
            className="h-[22px] w-auto"
          />
        </Link>
        <span className="text-[12px] text-zinc-600 font-medium">/</span>
        <span className="text-[13px] text-zinc-300 font-medium">Docs</span>
      </div>

      {/* Search */}
      <div className="px-3 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
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
              Results
            </p>
            {searchResults.length === 0 ? (
              <p className="px-2 py-6 text-[12.5px] text-zinc-600 text-center">
                No results found.
              </p>
            ) : (
              searchResults.map((r) => (
                <Link
                  key={r.slug}
                  href={`/docs/${r.slug}`}
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
                <SectionItem key={item.slug} item={item} />
              ))}
            </div>

            {/* Features */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                Features
              </p>
              <div className="space-y-[2px]">
                {features.map((item) => (
                  <SectionItem key={item.slug} item={item} />
                ))}
              </div>
            </div>

            {/* More */}
            <div>
              <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                More
              </p>
              <div className="space-y-[2px]">
                {more.map((item) => (
                  <SectionItem key={item.slug} item={item} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] px-4 py-3 flex items-center gap-3 text-[11.5px] text-zinc-600">
        <a
          href="https://discord.gg/JHQhC8VstM"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-400 transition-colors"
        >
          Discord
        </a>
        <span className="h-0.5 w-0.5 rounded-full bg-zinc-800" />
        <Link href="/blogs" className="hover:text-zinc-400 transition-colors">
          Blog
        </Link>
        <span className="h-0.5 w-0.5 rounded-full bg-zinc-800" />
        <Link href="/" className="hover:text-zinc-400 transition-colors">
          Home
        </Link>
      </div>
    </nav>
  )
}
