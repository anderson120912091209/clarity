'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Hash, ThumbsUp, ThumbsDown, Info, Lightbulb, AlertTriangle } from 'lucide-react'
import { type DocPage } from '@/lib/docs/content'
import { useDocsLocale } from '@/lib/docs/docs-locale-provider'
import { addLocalePrefix } from '@/lib/i18n/pathname'
import type { Locale } from '@/lib/i18n/config'
import { cn } from '@/lib/utils'
import { McpSetupWizard } from '@/components/docs/mcp-setup-wizard'

/* ------------------------------------------------------------------ */
/*  Extract headings for the "On this page" TOC                        */
/* ------------------------------------------------------------------ */

interface TocItem {
  id: string
  text: string
  level: number
}

function extractHeadings(raw: string): TocItem[] {
  const headings: TocItem[] = []
  for (const line of raw.split('\n')) {
    const match = line.match(/^(#{2,3})\s+(.+)/)
    if (match) {
      const text = match[2].replace(/\*\*/g, '').replace(/`/g, '')
      headings.push({
        id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        text,
        level: match[1].length,
      })
    }
  }
  return headings
}

/* ------------------------------------------------------------------ */
/*  Right-side "On this page" TOC component                            */
/* ------------------------------------------------------------------ */

function TableOfContents({ headings }: { headings: TocItem[] }) {
  const [activeId, setActiveId] = useState('')
  const { ui } = useDocsLocale()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
          {ui.onThisPage}
        </p>
        <ul className="space-y-0.5 border-l border-white/[0.06]">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={cn(
                  'block py-1 text-[12.5px] leading-snug transition-colors border-l-2 -ml-[2px]',
                  h.level === 3 ? 'pl-6' : 'pl-4',
                  activeId === h.id
                    ? 'border-purple-400 text-zinc-200 font-medium'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                )}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Markdown -> JSX renderer (rich version)                             */
/* ------------------------------------------------------------------ */

function renderMarkdown(raw: string) {
  const lines = raw.trim().split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let key = 0

  /* Inline formatting */
  const inline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let remaining = text
    let partKey = 0

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        parts.push(
          <code
            key={partKey++}
            className="rounded-[5px] bg-[#1e1e22] border border-white/[0.08] px-[6px] py-[2px] text-[0.85em] text-[#e2b3ff] font-mono"
          >
            {codeMatch[1]}
          </code>
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Bold + italic
      const boldItalicMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/)
      if (boldItalicMatch) {
        parts.push(
          <strong key={partKey++} className="font-semibold text-zinc-100">
            <em>{boldItalicMatch[1]}</em>
          </strong>
        )
        remaining = remaining.slice(boldItalicMatch[0].length)
        continue
      }

      // Bold
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/)
      if (boldMatch) {
        parts.push(
          <strong key={partKey++} className="font-semibold text-zinc-100">
            {boldMatch[1]}
          </strong>
        )
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Italic
      const italicMatch = remaining.match(/^\*(.+?)\*/)
      if (italicMatch) {
        parts.push(<em key={partKey++} className="text-zinc-300 italic">{italicMatch[1]}</em>)
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Link [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        parts.push(
          <a
            key={partKey++}
            href={linkMatch[2]}
            className="text-purple-400 hover:text-purple-300 underline underline-offset-[3px] decoration-purple-400/30 hover:decoration-purple-400/60 transition-colors"
          >
            {linkMatch[1]}
          </a>
        )
        remaining = remaining.slice(linkMatch[0].length)
        continue
      }

      // Plain text
      const plainMatch = remaining.match(/^[^`*\[]+/)
      if (plainMatch) {
        parts.push(<span key={partKey++}>{plainMatch[0]}</span>)
        remaining = remaining.slice(plainMatch[0].length)
        continue
      }

      parts.push(<span key={partKey++}>{remaining[0]}</span>)
      remaining = remaining.slice(1)
    }

    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Callout blocks: > **Tip:** / > **Info:** / > **Warning:**
    if (line.trim().startsWith('>')) {
      const calloutLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        calloutLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      const content = calloutLines.join(' ')

      let variant: 'info' | 'tip' | 'warning' = 'info'
      let cleanContent = content
      if (content.startsWith('**Tip:**') || content.startsWith('**\u{1F4A1}')) {
        variant = 'tip'
        cleanContent = content.replace(/^\*\*(Tip:|💡.*?)\*\*\s*/, '')
      } else if (content.startsWith('**Warning:**') || content.startsWith('**\u26A0')) {
        variant = 'warning'
        cleanContent = content.replace(/^\*\*(Warning:|⚠.*?)\*\*\s*/, '')
      } else if (content.startsWith('**Info:**') || content.startsWith('**\u2139')) {
        cleanContent = content.replace(/^\*\*(Info:|ℹ.*?)\*\*\s*/, '')
      }

      const styles = {
        info: { icon: 'text-blue-400', bg: 'bg-blue-400/[0.05]', border: 'border-blue-400/[0.08]' },
        tip: { icon: 'text-purple-400', bg: 'bg-purple-400/[0.05]', border: 'border-purple-400/[0.08]' },
        warning: { icon: 'text-amber-400', bg: 'bg-amber-400/[0.05]', border: 'border-amber-400/[0.08]' },
      }
      const s = styles[variant]
      const IconComp = variant === 'tip' ? Lightbulb : variant === 'warning' ? AlertTriangle : Info

      elements.push(
        <div key={key++} className={`my-4 sm:my-6 flex items-start gap-2.5 sm:gap-3 rounded-xl ${s.bg} border ${s.border} px-3 sm:px-4 py-3 sm:py-3.5`}>
          <IconComp className={`h-4 w-4 sm:h-[18px] sm:w-[18px] mt-[1px] shrink-0 ${s.icon}`} />
          <p className="text-[12.5px] sm:text-[13.5px] leading-relaxed text-zinc-300">{inline(cleanContent)}</p>
        </div>
      )
      continue
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().replace('```', '').trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      elements.push(
        <div key={key++} className="my-4 sm:my-5 rounded-xl border border-white/[0.08] bg-[#0f0f13] overflow-hidden shadow-lg shadow-black/20">
          {lang && (
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
              <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500 uppercase tracking-wider">{lang}</span>
              <div className="hidden sm:flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
              </div>
            </div>
          )}
          <pre className="p-3 sm:p-4 overflow-x-auto text-[11.5px] sm:text-[13px] leading-[1.7]">
            <code className="font-mono text-zinc-300">{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
      continue
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }

      if (tableLines.length >= 2) {
        const parseRow = (row: string) =>
          row
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim())

        const headers = parseRow(tableLines[0])
        const bodyRows = tableLines.slice(2).map(parseRow)

        elements.push(
          <div key={key++} className="my-4 sm:my-6 -mx-3.5 sm:mx-0 overflow-x-auto rounded-none sm:rounded-xl border-y sm:border border-white/[0.08] bg-[#0c0c10]">
            <table className="w-full text-[12px] sm:text-[13.5px]">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-zinc-400 bg-white/[0.02] whitespace-nowrap"
                    >
                      {inline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 sm:px-4 py-2 sm:py-2.5 text-zinc-400">
                        {inline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Heading with anchor link
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const id = text.replace(/\*\*/g, '').replace(/`/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
      const classes: Record<number, string> = {
        1: 'text-[22px] sm:text-[26px] md:text-[32px] font-bold tracking-tight text-white mt-0 mb-4 sm:mb-5',
        2: 'group text-[18px] sm:text-[20px] md:text-[24px] font-semibold tracking-tight text-white mt-8 sm:mt-12 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-white/[0.06] scroll-mt-20',
        3: 'group text-[15px] sm:text-[17px] font-semibold text-zinc-100 mt-6 sm:mt-9 mb-2.5 sm:mb-3 scroll-mt-20',
        4: 'group text-[14px] sm:text-[15px] font-medium text-zinc-200 mt-5 sm:mt-7 mb-2 scroll-mt-20',
      }

      elements.push(
        <Tag key={key++} id={id} className={classes[level]}>
          {level >= 2 && (
            <a
              href={`#${id}`}
              className="inline-flex items-center gap-1.5 no-underline"
            >
              <Hash className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-5 mr-1" />
              {inline(text)}
            </a>
          )}
          {level < 2 && inline(text)}
        </Tag>
      )
      i++
      continue
    }

    // Unordered list
    if (line.match(/^\s*[-*]\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\s*[-*]\s+/)) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      elements.push(
        <ul key={key++} className="my-3 sm:my-4 space-y-1.5 sm:space-y-2 pl-0">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 sm:gap-3 text-[13px] sm:text-[14.5px] leading-relaxed text-zinc-400">
              <span className="mt-[7px] sm:mt-2 h-1.5 w-1.5 rounded-full bg-purple-400/60 shrink-0" />
              <span>{inline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (line.match(/^\s*\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      elements.push(
        <ol key={key++} className="my-3 sm:my-4 space-y-2.5 sm:space-y-3 pl-0 counter-reset-list">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2.5 sm:gap-3 text-[13px] sm:text-[14.5px] leading-relaxed text-zinc-400">
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] sm:text-[12px] font-semibold text-zinc-300 mt-0.5">
                {idx + 1}
              </span>
              <span className="pt-0.5">{inline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={key++} className="my-6 sm:my-10 border-white/[0.06]" />)
      i++
      continue
    }

    // Custom component: {{mcp-setup-wizard}}
    if (line.trim() === '{{mcp-setup-wizard}}') {
      elements.push(<McpSetupWizard key={key++} />)
      i++
      continue
    }

    // Action button: {{button:Label|href}}
    const buttonMatch = line.trim().match(/^\{\{button:([^|]+)\|([^}]+)\}\}$/)
    if (buttonMatch) {
      const label = buttonMatch[1].trim()
      const href = buttonMatch[2].trim()
      elements.push(
        <div key={key++} className="my-5">
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-500/15 border border-purple-500/20 px-4 py-2.5 text-[13px] font-medium text-purple-300 transition-all hover:bg-purple-500/25 hover:border-purple-500/30 hover:text-purple-200"
          >
            {label}
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </Link>
        </div>
      )
      i++
      continue
    }

    // Image ![alt](src)
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      const alt = imgMatch[1]
      const src = imgMatch[2]
      elements.push(
        <figure key={key++} className="my-5 sm:my-8">
          <img
            src={src}
            alt={alt}
            className="w-full rounded-xl border border-white/[0.08] bg-[#0c0c10]"
            loading="lazy"
          />
          {alt && (
            <figcaption className="mt-2 text-center text-[12px] text-zinc-600">
              {alt}
            </figcaption>
          )}
        </figure>
      )
      i++
      continue
    }

    // Paragraph
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,4}\s/) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].match(/^\s*[-*]\s+/) &&
      !lines[i].match(/^\s*\d+\.\s+/) &&
      !lines[i].match(/^---+$/) &&
      !lines[i].trim().startsWith('{{') &&
      !lines[i].trim().match(/^!\[/)
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={key++} className="my-3 sm:my-4 text-[13.5px] sm:text-[14.5px] leading-[1.75] sm:leading-[1.8] text-zinc-400">
          {inline(paraLines.join(' '))}
        </p>
      )
    }
  }

  return elements
}

/* ------------------------------------------------------------------ */
/*  Feedback component                                                 */
/* ------------------------------------------------------------------ */

function WasThisHelpful() {
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null)
  const { ui } = useDocsLocale()

  return (
    <div className="mt-8 sm:mt-12 flex items-center gap-3 sm:gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 sm:px-5 py-3 sm:py-3.5">
      <span className="text-[12px] sm:text-[13px] text-zinc-500">{ui.wasThisHelpful}</span>
      <div className="flex gap-2">
        <button
          onClick={() => setFeedback('yes')}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            feedback === 'yes'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
          )}
          aria-label="Yes, helpful"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => setFeedback('no')}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            feedback === 'no'
              ? 'bg-red-500/20 text-red-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
          )}
          aria-label="No, not helpful"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
      {feedback && (
        <span className="text-[12px] text-zinc-500 animate-in fade-in">
          {feedback === 'yes' ? ui.thanksFeedback : ui.willImprove}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function DocsContent({ slug, page }: { slug: string; page: DocPage }) {
  const { content, ui, locale } = useDocsLocale()
  const headings = extractHeadings(page.content)
  const localePrefix = locale as Locale

  const { prev, next } = useMemo(() => {
    const slugs = Object.keys(content)
    const idx = slugs.indexOf(slug)
    return {
      prev: idx > 0 ? { slug: slugs[idx - 1], title: content[slugs[idx - 1]].title } : null,
      next:
        idx < slugs.length - 1
          ? { slug: slugs[idx + 1], title: content[slugs[idx + 1]].title }
          : null,
    }
  }, [content, slug])

  return (
    <div className="flex gap-10">
      {/* Main content */}
      <article className="flex-1 min-w-0 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="mb-5 sm:mb-8 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-zinc-500 overflow-x-auto">
          <Link href={addLocalePrefix('/docs', localePrefix)} className="hover:text-zinc-300 transition-colors">
            {ui.docs}
          </Link>
          {slug.includes('/') && (
            <>
              <ChevronRight className="h-3 w-3 text-zinc-600" />
              <Link
                href={addLocalePrefix(`/docs/${slug.split('/')[0]}`, localePrefix)}
                className="hover:text-zinc-300 transition-colors capitalize"
              >
                {slug.split('/')[0].replace(/-/g, ' ')}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="text-zinc-400 font-medium">{page.title}</span>
        </nav>

        {/* Category label */}
        {slug.includes('/') && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-purple-400/80 mb-3">
            {slug.split('/')[0].replace(/-/g, ' ')}
          </p>
        )}

        {/* Title */}
        <h1 className="text-[24px] sm:text-[28px] md:text-[36px] font-bold tracking-tight text-white mb-2 sm:mb-3 leading-tight">
          {page.title}
        </h1>
        <p className="text-[13.5px] sm:text-[15px] text-zinc-400 mb-6 sm:mb-10 leading-relaxed max-w-2xl">{page.description}</p>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-transparent mb-6 sm:mb-10" />

        {/* Content */}
        <div className="docs-prose">{renderMarkdown(page.content)}</div>

        {/* Feedback */}
        <WasThisHelpful />

        {/* Prev / Next nav */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-white/[0.06] pt-6 sm:pt-8 pb-6 sm:pb-8">
          {prev ? (
            <Link
              href={addLocalePrefix(`/docs/${prev.slug}`, localePrefix)}
              className="group flex flex-col items-start rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 transition-all hover:border-white/[0.15] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/10"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" /> {ui.previous}
              </span>
              <span className="text-[14px] font-medium text-zinc-300 group-hover:text-white transition-colors">
                {prev.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={addLocalePrefix(`/docs/${next.slug}`, localePrefix)}
              className="group flex flex-col items-end rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 transition-all hover:border-white/[0.15] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/10"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
                {ui.next} <ChevronRight className="h-3 w-3" />
              </span>
              <span className="text-[14px] font-medium text-zinc-300 group-hover:text-white transition-colors">
                {next.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </article>

      {/* Right TOC */}
      <TableOfContents headings={headings} />
    </div>
  )
}
