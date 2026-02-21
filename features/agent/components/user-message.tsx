'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserMessageProps {
  content: string
  timestamp?: number
}

const COLLAPSED_MAX_LINES = 3

export function UserMessage({ content }: UserMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    // Check if text overflows the 3-line clamp
    setIsTruncated(el.scrollHeight > el.clientHeight + 2)
  }, [content])

  const toggle = useCallback(() => {
    if (isTruncated || isExpanded) {
      setIsExpanded((prev) => !prev)
    }
  }, [isTruncated, isExpanded])

  return (
    <div className="w-full px-1">
      <div
        role={isTruncated || isExpanded ? 'button' : undefined}
        tabIndex={isTruncated || isExpanded ? 0 : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
        className={cn(
          'group relative w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-200 transition-colors',
          (isTruncated || isExpanded) && 'cursor-pointer hover:border-white/[0.1] hover:bg-white/[0.045]'
        )}
      >
        {/* Text content with line clamp */}
        <div
          ref={textRef}
          className={cn(
            'whitespace-pre-wrap break-words',
            !isExpanded && 'line-clamp-3'
          )}
          style={!isExpanded ? { WebkitLineClamp: COLLAPSED_MAX_LINES } : undefined}
        >
          {content}
        </div>

        {/* Gradient fade overlay when truncated & collapsed */}
        {isTruncated && !isExpanded && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 rounded-b-xl bg-gradient-to-t from-[#101011] via-[#101011]/80 to-transparent" />
        )}

        {/* Expand/collapse hint */}
        {(isTruncated || isExpanded) && (
          <div
            className={cn(
              'flex items-center justify-center pt-1',
              !isExpanded && 'absolute bottom-1.5 left-0 right-0'
            )}
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-zinc-600 transition-transform duration-200 group-hover:text-zinc-400',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
