'use client'

import {
  ChevronDown,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  Eye,
  FileEdit,
  FolderSearch,
  Loader2,
  Search,
  Terminal,
  Wrench,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TrackedToolCall } from '@/features/agent/types/chat.types'

interface AgentActivityPanelProps {
  toolCalls: TrackedToolCall[]
  isStreaming: boolean
}

const TOOL_NAME_LABELS: Record<string, { label: string; icon: typeof Wrench }> = {
  read_workspace_file: { label: 'Read file', icon: Eye },
  apply_file_edit: { label: 'Edit file', icon: FileEdit },
  list_workspace_files: { label: 'List files', icon: FolderSearch },
  search_workspace: { label: 'Search workspace', icon: Search },
  run_terminal_command: { label: 'Run command', icon: Terminal },
}

function formatToolName(toolName: string): string {
  const known = TOOL_NAME_LABELS[toolName]
  if (known) return known.label
  return toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getToolIcon(toolName: string) {
  return TOOL_NAME_LABELS[toolName]?.icon ?? Wrench
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms < 0) return ''
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function StatusBadge({ status }: { status: TrackedToolCall['status'] }) {
  const config = {
    pending: {
      label: 'Pending',
      className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
      icon: Clock,
    },
    running: {
      label: 'Running',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Loader2,
    },
    completed: {
      label: 'Done',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: CircleCheck,
    },
    failed: {
      label: 'Failed',
      className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: CircleX,
    },
  }[status]

  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
        config.className
      )}
    >
      <Icon
        className={cn(
          'h-2.5 w-2.5',
          status === 'running' && 'animate-spin'
        )}
      />
      {config.label}
    </span>
  )
}

function ToolCallRow({ toolCall }: { toolCall: TrackedToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = getToolIcon(toolCall.toolName)
  const duration = formatDuration(toolCall.durationMs)

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const hasDetails = toolCall.args || toolCall.result || toolCall.error

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        type="button"
        onClick={handleToggle}
        disabled={!hasDetails}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
          hasDetails
            ? 'hover:bg-white/5 cursor-pointer'
            : 'cursor-default'
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <span className="min-w-0 flex-1 truncate text-zinc-300">
          {formatToolName(toolCall.toolName)}
        </span>
        {duration && (
          <span className="shrink-0 text-[10px] text-zinc-500">{duration}</span>
        )}
        <StatusBadge status={toolCall.status} />
        {hasDetails && (
          <ChevronDown
            className={cn(
              'h-3 w-3 shrink-0 text-zinc-500 transition-transform duration-150',
              isExpanded && 'rotate-180'
            )}
          />
        )}
      </button>

      {isExpanded && hasDetails && (
        <div className="border-t border-white/5 bg-black/20 px-3 py-2">
          {toolCall.error && (
            <div className="mb-2 rounded border border-rose-500/20 bg-rose-500/5 px-2 py-1 text-[11px] text-rose-400">
              {toolCall.error}
            </div>
          )}
          {toolCall.args && Object.keys(toolCall.args).length > 0 && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Arguments
              </div>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-black/30 px-2 py-1 font-mono text-[11px] leading-4 text-zinc-400">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.result && Object.keys(toolCall.result).length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Result
              </div>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-black/30 px-2 py-1 font-mono text-[11px] leading-4 text-zinc-400">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AgentActivityPanel({
  toolCalls,
  isStreaming,
}: AgentActivityPanelProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (toolCalls.length === 0) return null

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-white/5 bg-[#18181b]/50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-300"
      >
        <CircleDot
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isStreaming && 'animate-pulse text-amber-400'
          )}
        />
        <span className="font-medium">Agent Activity</span>
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/10 px-1 text-[10px] font-medium text-zinc-300">
          {toolCalls.length}
        </span>
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
          <div className="border-t border-white/5">
            {toolCalls.map((tc) => (
              <ToolCallRow key={tc.toolCallId} toolCall={tc} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
