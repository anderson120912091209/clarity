'use client'

import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatMessageListProps {
  children: ReactNode
  onScrollToBottom?: () => void
  autoScroll?: boolean
}

export function ChatMessageList({
  children,
  onScrollToBottom,
  autoScroll = true,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isUserScrolling = useRef(false)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
    onScrollToBottom?.()
  }, [onScrollToBottom])

  // Detect if user has scrolled away from bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isAtBottom = distanceFromBottom < 60

    setShowScrollButton(!isAtBottom)
    isUserScrolling.current = !isAtBottom
  }, [])

  // Auto-scroll to bottom when children change (new messages)
  useEffect(() => {
    if (!autoScroll || isUserScrolling.current) return

    // Use requestAnimationFrame to ensure DOM has been updated
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    return () => cancelAnimationFrame(frame)
  }, [children, autoScroll])

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth px-4 py-3"
      >
        {children}
        <div ref={bottomRef} />
      </div>

      {showScrollButton && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 rounded-full border border-white/10 bg-[#232428] px-3 text-xs text-zinc-300 shadow-lg hover:bg-[#2a2b30]"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Scroll to bottom</span>
          </Button>
        </div>
      )}
    </div>
  )
}
