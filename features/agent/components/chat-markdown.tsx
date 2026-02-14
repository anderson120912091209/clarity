'use client'

import { Check, Copy } from 'lucide-react'
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
}

const HAS_MATH_PATTERN =
  /\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|(^|[^\\$])\$[^$\n]+?\$(?!\$)/

function normalizeMathMarkdown(content: string): string {
  let normalized = content

  // Inline symbols are sometimes emitted as display math (e.g. "$$S$$"), which causes hard line breaks.
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

  // Collapse inline-math tokens split across lines inside parenthesis.
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
    <div className="my-2 overflow-hidden rounded-lg border border-[#2f3342] bg-[#1b1d26]">
      <div className="flex items-center justify-between border-b border-[#2f3342] bg-[#171922] px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] text-zinc-400">
        <span>{language}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] normal-case tracking-normal text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100"
          title="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-[#1f212b] px-3 py-3 text-[12px] leading-6 text-zinc-100">
        <code className={cn('font-mono', className)}>{children}</code>
      </pre>
    </div>
  )
}

export function ChatMarkdown({ content, className, hideFencedCodeBlocks = false }: ChatMarkdownProps) {
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
      const inline = !(className && className.includes('language-'))
      if (!inline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }

      return (
        <code
          className={cn(
            'rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[12px] text-zinc-200',
            className
          )}
          {...props}
        >
          {children}
        </code>
      )
    },
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'chat-markdown text-sm leading-6 text-zinc-200',
        '[&_a]:text-[#92a0ff] [&_a]:underline-offset-2 [&_a:hover]:underline',
        '[&_p]:my-0 [&_p+p]:mt-2',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-300',
        '[&_hr]:my-3 [&_hr]:border-zinc-700',
        '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse',
        '[&_th]:border [&_th]:border-zinc-700 [&_th]:bg-zinc-900/70 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium',
        '[&_td]:border [&_td]:border-zinc-700 [&_td]:px-2 [&_td]:py-1',
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
