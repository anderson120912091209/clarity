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
    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-zinc-100',
          copied && 'text-emerald-400'
        )}
        title={copied ? 'Copied' : 'Copy response'}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-zinc-100"
          title="Retry this prompt"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      )}

      {children}
    </div>
  )
}
