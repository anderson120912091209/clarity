'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { Check, Copy, Terminal } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none leading-7", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeString = String(children).replace(/\n$/, '')
            
            if (inline) {
              return (
                <code
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[13px] font-medium font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50",
                    className
                  )}
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <CodeBlock language={language} code={codeString} />
            )
          },
          p({ children, ...props }: any) {
            return (
              <p className="mb-4 last:mb-0 leading-7 text-zinc-700 dark:text-zinc-300" {...props}>
                {children}
              </p>
            )
          },
          h1({ children, ...props }: any) {
            return (
              <h1 className="text-2xl font-semibold mt-8 mb-4 tracking-tight text-zinc-900 dark:text-zinc-100" {...props}>
                {children}
              </h1>
            )
          },
          h2({ children, ...props }: any) {
            return (
              <h2 className="text-xl font-semibold mt-6 mb-3 tracking-tight text-zinc-900 dark:text-zinc-100" {...props}>
                {children}
              </h2>
            )
          },
          h3({ children, ...props }: any) {
            return (
              <h3 className="text-lg font-medium mt-5 mb-2 tracking-tight text-zinc-900 dark:text-zinc-100" {...props}>
                {children}
              </h3>
            )
          },
          ul({ children, ...props }: any) {
            return (
              <ul className="list-disc list-outside mb-4 space-y-1 ml-4 text-zinc-700 dark:text-zinc-300Marker" {...props}>
                {children}
              </ul>
            )
          },
          ol({ children, ...props }: any) {
            return (
              <ol className="list-decimal list-outside mb-4 space-y-1 ml-4 text-zinc-700 dark:text-zinc-300" {...props}>
                {children}
              </ol>
            )
          },
          li({ children, ...props }: any) {
            return (
              <li className="pl-1" {...props}>
                {children}
              </li>
            )
          },
          blockquote({ children, ...props }: any) {
            return (
              <blockquote
                className="border-l-[3px] border-blue-500/50 pl-4 py-1 my-4 bg-blue-50/50 dark:bg-blue-500/5 italic text-zinc-600 dark:text-zinc-400 rounded-r"
                {...props}
              >
                {children}
              </blockquote>
            )
          },
          a({ children, href, ...props }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-500 underline decoration-blue-500/30 underline-offset-2 hover:decoration-blue-500 transition-all"
                {...props}
              >
                {children}
              </a>
            )
          },
          hr({ ...props }: any) {
            return <hr className="my-6 border-zinc-200 dark:border-zinc-800" {...props} />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

const CodeBlock = ({ language, code }: { language: string, code: string }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy!', err)
    }
  }

  return (
    <div className="relative my-5 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] group">
       {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-2">
               {language || 'text'}
            </span>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code */}
      <div className="overflow-x-auto p-4">
        <code className={cn("font-mono text-sm leading-relaxed", !language && "text-zinc-800 dark:text-zinc-300")}>
           {code}
        </code>
      </div>
    </div>
  )
}
