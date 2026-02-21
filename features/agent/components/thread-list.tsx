'use client'

import { MessageSquare, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Thread {
  id: string
  title: string
  lastModified: number
  isActive: boolean
}

interface ThreadListProps {
  threads: Thread[]
  onSelectThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

export function ThreadList({
  threads,
  onSelectThread,
  onDeleteThread,
}: ThreadListProps) {
  const sortedThreads = useMemo(
    () => [...threads].sort((a, b) => b.lastModified - a.lastModified),
    [threads]
  )

  if (sortedThreads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <MessageSquare className="h-6 w-6 text-zinc-700" />
        <p className="text-xs text-zinc-500">No conversations yet</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-1.5">
        {sortedThreads.map((thread) => (
          <div
            key={thread.id}
            className={cn(
              'group flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors',
              thread.isActive
                ? 'bg-[#6d78e7]/10 text-zinc-200'
                : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
            )}
            role="button"
            tabIndex={0}
            onClick={() => onSelectThread(thread.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectThread(thread.id)
              }
            }}
          >
            <MessageSquare
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                thread.isActive ? 'text-[#8b95f0]' : 'text-zinc-600'
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium leading-tight">
                {thread.title}
              </div>
              <div className={cn('text-[10px] mt-0.5', thread.isActive ? 'text-zinc-500' : 'text-zinc-700')}>
                {formatRelativeTime(thread.lastModified)}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteThread(thread.id)
              }}
              className="shrink-0 rounded-md p-1 text-zinc-700 opacity-0 transition-all hover:bg-white/5 hover:text-rose-400 group-hover:opacity-100"
              title="Delete thread"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
