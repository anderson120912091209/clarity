'use client'

import { cn } from '@/lib/utils'
import type { AgentRunState } from '@/features/agent/types/chat.types'

interface StreamingIndicatorProps {
  state: AgentRunState
  toolName?: string | null
}

function getStateLabel(state: AgentRunState, toolName?: string | null): string {
  switch (state) {
    case 'llm_generating':
      return 'Thinking...'
    case 'tool_pending':
      return 'Preparing tool...'
    case 'tool_executing': {
      if (!toolName) return 'Running tool...'
      switch (toolName) {
        case 'read_workspace_file':
          return 'Reading files...'
        case 'apply_file_edit':
          return 'Editing file...'
        case 'list_workspace_files':
          return 'Listing files...'
        case 'search_workspace':
          return 'Searching workspace...'
        case 'run_terminal_command':
          return 'Running command...'
        default:
          return `Running ${toolName.replace(/_/g, ' ')}...`
      }
    }
    case 'tool_result_ready':
      return 'Processing result...'
    default:
      return 'Working...'
  }
}

export function StreamingIndicator({
  state,
  toolName,
}: StreamingIndicatorProps) {
  if (state === 'idle' || state === 'completed' || state === 'error' || state === 'aborted') {
    return null
  }

  const label = getStateLabel(state, toolName)

  return (
    <div className="inline-flex items-center gap-2 py-1 text-xs text-zinc-400">
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            state === 'tool_executing' ? 'bg-amber-400' : 'bg-violet-400'
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            state === 'tool_executing' ? 'bg-amber-400' : 'bg-violet-400'
          )}
        />
      </span>
      <span>{label}</span>
    </div>
  )
}
