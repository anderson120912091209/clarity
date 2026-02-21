'use client'

import { ChevronsRight, Clock3, SquarePen, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
interface ChatHeaderProps {
  threadTitle?: string
  onNewChat: () => void
  onToggleThreadList?: () => void
  showThreadListToggle?: boolean
  onHide?: () => void
  isFloating?: boolean
  onToggleFloat?: () => void
}

export function ChatHeader({
  threadTitle,
  onNewChat,
  onToggleThreadList,
  showThreadListToggle = false,
  onHide,
  isFloating = false,
  onToggleFloat,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-white/[0.06] bg-[#0f0f11]">
      <div className="flex items-center gap-2 min-w-0">
        {onHide && !isFloating && (
          <button
            type="button"
            onClick={onHide}
            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
            title="Hide chat"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            
            <span className="text-[13px] font-semibold text-zinc-100 tracking-tight">Agent</span>
          </div>
          {threadTitle && (
            <>
              <span className="text-zinc-700 text-xs select-none">/</span>
              <span className="truncate text-[11px] text-zinc-500 min-w-0">{threadTitle}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onToggleFloat && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleFloat}
                  className={
                    'h-7 w-7 rounded-md flex items-center justify-center transition-colors ' +
                    (isFloating
                      ? 'text-[#8b95f0] bg-[#6d78e7]/10 hover:bg-[#6d78e7]/20'
                      : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5')
                  }
                >
                  {isFloating ? (
                    <PanelRightOpen className="h-3.5 w-3.5" />
                  ) : (
                    <PanelRightClose className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#1E1F22] text-white border border-white/[0.08] text-[11px] px-2 py-1 flex items-center gap-1.5 align-center shadow-lg">
                <span>{isFloating ? 'Dock chat' : 'Float chat'}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {showThreadListToggle && onToggleThreadList && (
          <button
            type="button"
            onClick={onToggleThreadList}
            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            title="Recent chats"
          >
            <Clock3 className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onNewChat}
          className="h-7 w-7 rounded-md flex items-center justify-center text-[#8b95f0] bg-[#6d78e7]/10 border border-[#6d78e7]/20 hover:bg-[#6d78e7]/20 hover:border-[#6d78e7]/30 transition-all"
          title="New chat"
        >
          <SquarePen className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
