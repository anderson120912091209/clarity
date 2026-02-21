'use client'

import { Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentRunState } from '@/features/agent/types/chat.types'

interface StreamingIndicatorProps {
  state: AgentRunState
  toolName?: string | null
  onStop?: () => void
}

function getStateLabel(state: AgentRunState, toolName?: string | null): string {
  switch (state) {
    case 'llm_generating':
      return 'Thinking'
    case 'tool_pending':
      return 'Preparing'
    case 'tool_executing': {
      if (!toolName) return 'Running tool'
      switch (toolName) {
        case 'read_workspace_file':
          return 'Reading file'
        case 'apply_file_edit':
          return 'Editing file'
        case 'list_workspace_files':
          return 'Listing files'
        case 'search_workspace':
          return 'Searching'
        case 'run_terminal_command':
          return 'Running command'
        default:
          return toolName.replace(/_/g, ' ')
      }
    }
    case 'tool_result_ready':
      return 'Processing'
    default:
      return 'Working'
  }
}

export function StreamingIndicator({
  state,
  toolName,
  onStop,
}: StreamingIndicatorProps) {
  if (state === 'idle' || state === 'completed' || state === 'error' || state === 'aborted') {
    return null
  }

  const isTool = state === 'tool_executing'
  const label = getStateLabel(state, toolName)

  return (
    <div className="flex items-center justify-between py-1">
      <div className="inline-flex items-center gap-2">
        <div className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'block h-[5px] w-[5px] rounded-full animate-bounce',
                isTool ? 'bg-amber-400/70' : 'bg-[#6d78e7]/70'
              )}
              style={{ animationDelay: `${i * 100}ms`, animationDuration: '0.8s' }}
            />
          ))}
        </div>
        <span className="text-[11px] text-zinc-500">{label}…</span>
      </div>

      {onStop && (
        <button
          type="button"
          onClick={onStop}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-400 border border-white/[0.08] bg-white/[0.03] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all duration-200"
          title="Stop generating"
        >
          <Square className="h-2.5 w-2.5 fill-current" />
          <span>Stop</span>
        </button>
      )}
    </div>
  )
}
