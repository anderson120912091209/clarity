'use client'

import { MessageSquare, Trash2, Clock } from 'lucide-react'
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

function groupThreads(threads: Thread[]): { label: string; threads: Thread[] }[] {
  const now = Date.now()
  const today: Thread[] = []
  const yesterday: Thread[] = []
  const thisWeek: Thread[] = []
  const older: Thread[] = []

  for (const thread of threads) {
    const diffMs = now - thread.lastModified
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffHours < 24) today.push(thread)
    else if (diffDays < 2) yesterday.push(thread)
    else if (diffDays < 7) thisWeek.push(thread)
    else older.push(thread)
  }

  const groups: { label: string; threads: Thread[] }[] = []
  if (today.length > 0) groups.push({ label: 'Today', threads: today })
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', threads: yesterday })
  if (thisWeek.length > 0) groups.push({ label: 'This week', threads: thisWeek })
  if (older.length > 0) groups.push({ label: 'Older', threads: older })
  return groups
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

  const groups = useMemo(() => groupThreads(sortedThreads), [sortedThreads])

  if (sortedThreads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <MessageSquare className="h-4 w-4 text-zinc-600" />
        </div>
        <div>
          <p className="text-[12px] font-medium text-zinc-500">No conversations yet</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">Start a new chat to get going</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col py-1">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pt-2 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.label}
              </span>
            </div>
            {group.threads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  'group mx-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-150',
                  thread.isActive
                    ? 'bg-[#6d78e7]/10 border border-[#6d78e7]/15 text-zinc-200'
                    : 'border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
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
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  thread.isActive
                    ? 'bg-[#6d78e7]/15 text-[#8b95f0]'
                    : 'bg-white/[0.04] text-zinc-600 group-hover:text-zinc-400'
                )}>
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium leading-tight">
                    {thread.title}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className={cn('h-2.5 w-2.5', thread.isActive ? 'text-zinc-500' : 'text-zinc-700')} />
                    <span className={cn('text-[10px]', thread.isActive ? 'text-zinc-500' : 'text-zinc-700')}>
                      {formatRelativeTime(thread.lastModified)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteThread(thread.id)
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-700 opacity-0 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                  title="Delete thread"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
