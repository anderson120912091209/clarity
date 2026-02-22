'use client'

import { Check, Copy, FileText } from 'lucide-react'
import { isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'
import { loadMathJax } from '@/features/source-editor/utils/mathjax-loader'
import { stripEditMetadataLines } from '@/features/agent/services/response-parser'

interface ChatMarkdownProps {
  content: string
  className?: string
  hideFencedCodeBlocks?: boolean
  onFileClick?: (filename: string) => void
}

const HAS_MATH_PATTERN =
  /\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|(^|[^\\$])\$[^$\n]+?\$(?!\$)/

// Filename detection: inline code that looks like a file (has extension, no spaces)
const FILE_EXTENSION_PATTERN = /\.(tex|pdf|typ|bib|sty|cls|png|jpg|jpeg|eps|svg|json|yaml|yml|toml|md|txt|py|js|ts|tsx|jsx|css|html|sh|bash)$/i

function isFilenameText(text: string): boolean {
  const trimmed = text.trim()
  return FILE_EXTENSION_PATTERN.test(trimmed) && !trimmed.includes(' ') && trimmed.length < 120
}

function getFileChipStyle(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (['tex', 'sty', 'cls', 'bib'].includes(ext)) {
    return 'text-emerald-400 bg-emerald-500/8 border-emerald-500/15 hover:bg-emerald-500/14'
  }
  if (ext === 'pdf') {
    return 'text-rose-400 bg-rose-500/8 border-rose-500/15 hover:bg-rose-500/14'
  }
  if (ext === 'typ') {
    return 'text-sky-400 bg-sky-500/8 border-sky-500/15 hover:bg-sky-500/14'
  }
  if (['py', 'js', 'ts', 'tsx', 'jsx'].includes(ext)) {
    return 'text-amber-400 bg-amber-500/8 border-amber-500/15 hover:bg-amber-500/14'
  }
  return 'text-[#8b95f0] bg-[#6d78e7]/8 border-[#6d78e7]/15 hover:bg-[#6d78e7]/14'
}

function FileChip({
  filename,
  onClick,
}: {
  filename: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? `Open ${filename}` : filename}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px] align-middle',
        'font-mono text-[11.5px] font-medium transition-colors',
        getFileChipStyle(filename),
        onClick ? 'cursor-pointer' : 'cursor-default pointer-events-none'
      )}
    >
      <FileText className="h-3 w-3 shrink-0 opacity-70" />
      {filename}
    </button>
  )
}

function normalizeMathMarkdown(content: string): string {
  let normalized = content

  normalized = normalized.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (fullMatch, rawExpression) => {
    const expression = String(rawExpression).trim()
    if (!expression) return fullMatch
    if (expression.includes('\n')) return fullMatch
    if (expression.length > 64) return fullMatch
    if (/\\begin\{|\\end\{|\\\\|\\tag\{|\\label\{/.test(expression)) return fullMatch
    return `\\(${expression}\\)`
  })

  normalized = normalized.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (fullMatch, rawExpression) => {
    const expression = String(rawExpression).trim()
    if (!expression) return fullMatch
    if (expression.includes('\n')) return fullMatch
    if (expression.length > 64) return fullMatch
    if (/\\begin\{|\\end\{|\\\\|\\tag\{|\\label\{/.test(expression)) return fullMatch
    return `\\(${expression}\\)`
  })

  normalized = normalized.replace(/\(\s*\n+\s*(\$(?:\\.|[^$\n])+\$)\s*\n+\s*\)/g, '($1)')
  normalized = normalized.replace(/\(\s*\n+\s*(\\\((?:\\.|[^)])+\\\))\s*\n+\s*\)/g, '($1)')
  normalized = normalized.replace(/\(\s*\n+\s*(\\\[(?:\\.|[\s\S])*?\\\])\s*\n+\s*\)/g, '($1)')

  return normalized
}

function extractTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((item) => extractTextContent(item)).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTextContent(node.props.children)
  }
  return ''
}

function extractLanguage(className?: string): string {
  const match = className?.match(/language-([\w+-]+)/)
  return match?.[1]?.toLowerCase() ?? 'text'
}

function stripFencedCodeBlocks(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function CodeBlock({
  language,
  className,
  children,
}: {
  language: string
  className?: string
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)

  const plainText = useMemo(() => extractTextContent(children).replace(/\n$/, ''), [children])

  const handleCopy = useCallback(async () => {
    if (!plainText) return
    try {
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch (error) {
      console.warn('Failed to copy code block:', error)
    }
  }, [plainText])

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/[0.07] bg-[#141519]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0f1013] px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">{language}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] normal-case tracking-normal text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
          title="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span className={copied ? 'text-emerald-400' : ''}>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-[#0f1013]/60 px-4 py-3 text-[12px] leading-[1.7] text-zinc-200">
        <code className={cn('font-mono', className)}>{children}</code>
      </pre>
    </div>
  )
}

export function ChatMarkdown({ content, className, hideFencedCodeBlocks = false, onFileClick }: ChatMarkdownProps) {
  const normalizedContent = useMemo(() => {
    let normalized = stripEditMetadataLines(content)
    normalized = normalizeMathMarkdown(normalized)
    if (hideFencedCodeBlocks) normalized = stripFencedCodeBlocks(normalized)
    return normalized
  }, [content, hideFencedCodeBlocks])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const shouldTypesetMath = useMemo(() => HAS_MATH_PATTERN.test(normalizedContent), [normalizedContent])

  useEffect(() => {
    if (!shouldTypesetMath) return

    let cancelled = false

    const typesetMath = async () => {
      try {
        const mathJax = await loadMathJax()
        const target = containerRef.current
        if (cancelled || !target) return

        if (typeof mathJax.typesetClear === 'function') {
          mathJax.typesetClear([target])
        }
        if (typeof mathJax.typesetPromise !== 'function') return
        await mathJax.typesetPromise([target])
      } catch {
        // Streaming content can briefly contain incomplete math delimiters.
      }
    }

    void typesetMath()

    return () => {
      cancelled = true
    }
  }, [normalizedContent, shouldTypesetMath])

  const components: Components = {
    pre({ children }) {
      const child = Array.isArray(children) ? children[0] : children
      if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
        return <pre>{children}</pre>
      }

      const language = extractLanguage(child.props.className)
      return (
        <CodeBlock language={language} className={child.props.className}>
          {child.props.children}
        </CodeBlock>
      )
    },
    code({ className, children, ...props }) {
      const isBlock = className && className.includes('language-')
      if (isBlock) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }

      // Detect file references in inline code
      const text = typeof children === 'string'
        ? children
        : extractTextContent(children as ReactNode)

      if (isFilenameText(text)) {
        return (
          <FileChip
            filename={text.trim()}
            onClick={onFileClick ? () => onFileClick(text.trim()) : undefined}
          />
        )
      }

      return (
        <code
          className={cn(
            'rounded-md border border-white/[0.07] bg-white/[0.06] px-1.5 py-[2px] font-mono text-[12px] text-zinc-200',
            className
          )}
          {...props}
        >
          {children}
        </code>
      )
    },
    h1({ children }) {
      return <h1 className="mb-2 mt-4 text-base font-semibold text-zinc-100 first:mt-0">{children}</h1>
    },
    h2({ children }) {
      return <h2 className="mb-1.5 mt-3 text-[13.5px] font-semibold text-zinc-100 first:mt-0">{children}</h2>
    },
    h3({ children }) {
      return <h3 className="mb-1 mt-2.5 text-[13px] font-semibold text-zinc-200 first:mt-0">{children}</h3>
    },
    strong({ children }) {
      return <strong className="font-semibold text-zinc-100">{children}</strong>
    },
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'chat-markdown break-words text-[13.5px] leading-relaxed text-zinc-300',
        '[&_a]:text-[#8b95f0] [&_a]:underline-offset-2 [&_a:hover]:underline',
        '[&_p]:my-0 [&_p+p]:mt-2',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5',
        '[&_li]:leading-relaxed',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-white/10 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400',
        '[&_hr]:my-3 [&_hr]:border-white/[0.07]',
        '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[12px]',
        '[&_th]:border [&_th]:border-white/[0.08] [&_th]:bg-white/[0.04] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-zinc-300',
        '[&_td]:border [&_td]:border-white/[0.07] [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-zinc-400',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}
