'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Custom code block rendering with syntax highlighting
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            
            if (inline) {
              return (
                <code
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-mono bg-muted/50 text-foreground border",
                    className
                  )}
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <div className="relative my-4 group">
                {language && (
                  <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-2 py-0.5 bg-background/80 rounded">
                    {language}
                </div>
                )}
                <pre
                  className={cn(
                    "overflow-x-auto rounded-lg border bg-muted/30 p-4 text-sm",
                    "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
                    className
                  )}
                  {...props}
                >
                  <code className={cn("font-mono", className)} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          // Custom paragraph styling
          p({ children, ...props }: any) {
            return (
              <p className="mb-3 last:mb-0 leading-relaxed" {...props}>
                {children}
              </p>
            )
          },
          // Custom heading styling
          h1({ children, ...props }: any) {
            return (
              <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0" {...props}>
                {children}
              </h1>
            )
          },
          h2({ children, ...props }: any) {
            return (
              <h2 className="text-lg font-semibold mt-5 mb-2 first:mt-0" {...props}>
                {children}
              </h2>
            )
          },
          h3({ children, ...props }: any) {
            return (
              <h3 className="text-base font-semibold mt-4 mb-2 first:mt-0" {...props}>
                {children}
              </h3>
            )
          },
          // Custom list styling
          ul({ children, ...props }: any) {
            return (
              <ul className="list-disc list-inside mb-3 space-y-1 ml-2" {...props}>
                {children}
              </ul>
            )
          },
          ol({ children, ...props }: any) {
            return (
              <ol className="list-decimal list-inside mb-3 space-y-1 ml-2" {...props}>
                {children}
              </ol>
            )
          },
          li({ children, ...props }: any) {
            return (
              <li className="leading-relaxed" {...props}>
                {children}
              </li>
            )
          },
          // Custom blockquote styling
          blockquote({ children, ...props }: any) {
            return (
              <blockquote
                className="border-l-4 border-blue-500/30 pl-4 py-2 my-3 bg-muted/30 italic text-muted-foreground"
                {...props}
              >
                {children}
              </blockquote>
            )
          },
          // Custom link styling
          a({ children, href, ...props }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 transition-colors"
                {...props}
              >
                {children}
              </a>
            )
          },
          // Custom table styling
          table({ children, ...props }: any) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border rounded-lg" {...props}>
                  {children}
                </table>
              </div>
            )
          },
          th({ children, ...props }: any) {
            return (
              <th
                className="border border-border px-4 py-2 bg-muted/50 font-semibold text-left"
                {...props}
              >
                {children}
              </th>
            )
          },
          td({ children, ...props }: any) {
            return (
              <td className="border border-border px-4 py-2" {...props}>
                {children}
              </td>
            )
          },
          // Custom horizontal rule
          hr({ ...props }: any) {
            return <hr className="my-4 border-t border-border" {...props} />
          },
          // Custom strong/bold
          strong({ children, ...props }: any) {
            return <strong className="font-semibold" {...props}>{children}</strong>
          },
          // Custom emphasis/italic
          em({ children, ...props }: any) {
            return <em className="italic" {...props}>{children}</em>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

