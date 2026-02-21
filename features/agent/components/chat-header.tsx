'use client'

import { ChevronsRight, Clock3, SquarePen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  threadTitle?: string
  onNewChat: () => void
  onToggleThreadList?: () => void
  showThreadListToggle?: boolean
  onHide?: () => void
}

export function ChatHeader({
  threadTitle,
  onNewChat,
  onToggleThreadList,
  showThreadListToggle = false,
  onHide,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-[#101011] border-b border-white/5">
      <div className="flex items-center gap-2">
        {onHide && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onHide}
            className="h-7 w-7 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            title="Hide AI Chat"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
        <span className="text-lg font-semibold tracking-tight text-zinc-100">AI Chat</span>
        <span className="text-xs text-zinc-500">
          {threadTitle || 'New chat'}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {showThreadListToggle && onToggleThreadList && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            title="Recent chats"
            onClick={onToggleThreadList}
          >
            <Clock3 className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          onClick={onNewChat}
          className="h-8 w-8 rounded-lg bg-[#6D78E7] hover:bg-[#6D78E7]/90 text-white border border-white/10 shadow-sm transition-all"
          title="New chat"
        >
          <SquarePen className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
