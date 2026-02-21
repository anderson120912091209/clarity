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
    <div className="my-1.5 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
      >
        <Brain
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-zinc-600',
            isStreaming && 'animate-pulse text-[#8b95f0]'
          )}
        />
        <span className="text-[11px] font-medium text-zinc-500">Reasoning</span>
        <span className="text-[10px] text-zinc-700">{lineCount} lines</span>
        <ChevronDown
          className={cn(
            'ml-auto h-3 w-3 shrink-0 text-zinc-700 transition-transform duration-200',
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
          <div className="border-t border-white/[0.05] px-3 py-2">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-[1.6] text-zinc-600">
              {thinking}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
