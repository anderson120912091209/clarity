'use client'

import { Brain, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface ThinkingBlockProps {
  thinking: string
  isStreaming?: boolean
  defaultOpen?: boolean
}

export function ThinkingBlock({
  thinking,
  isStreaming = false,
  defaultOpen = false,
}: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || isStreaming)

  // Auto-open while streaming
  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true)
    }
  }, [isStreaming])

  const lineCount = useMemo(() => {
    const lines = thinking.split('\n')
    return lines.length
  }, [thinking])

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  if (!thinking) return null

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-white/5 bg-[#18181b]/50">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-300"
      >
        <Brain
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isStreaming && 'animate-pulse text-violet-400'
          )}
        />
        <span className="font-medium">Reasoning</span>
        <span className="text-zinc-500">{lineCount} lines</span>
        <ChevronDown
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/5 px-3 py-2">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-zinc-400">
              {thinking}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
