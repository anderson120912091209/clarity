'use client'

import type { ReactNode } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  content: string
  messageId: string
  onCopy?: (content: string) => void
  onRetry?: (messageId: string) => void
  children?: ReactNode
}

export function MessageActions({
  content,
  messageId,
  onCopy,
  onRetry,
  children,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      onCopy?.(content)
      window.setTimeout(() => setCopied(false), 1400)
    } catch (error) {
      console.warn('Failed to copy message:', error)
    }
  }, [content, onCopy])

  const handleRetry = useCallback(() => {
    onRetry?.(messageId)
  }, [messageId, onRetry])

  return (
    <div className="flex items-center gap-0.5 pt-1.5">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={cn(
          'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors',
          copied
            ? 'text-emerald-400 bg-emerald-500/8'
            : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
        )}
        title={copied ? 'Copied!' : 'Copy response'}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-300 hover:bg-white/5"
          title="Retry"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Retry</span>
        </button>
      )}

      {children}
    </div>
  )
}
