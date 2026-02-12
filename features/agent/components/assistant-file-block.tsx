'use client'

import { Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StagedFileChange } from '@/features/agent/services/change-manager'

interface AssistantFileBlockProps {
  change: StagedFileChange
  disabled?: boolean
  isOpening?: boolean
  isAccepting?: boolean
  isRejecting?: boolean
  onOpen?: () => void
  onAccept?: () => void
  onReject?: () => void
}

function computeLineStats(change: StagedFileChange): { linesAdded: number; linesDeleted: number } {
  if (
    Number.isFinite(change.summary.linesAdded) &&
    Number.isFinite(change.summary.linesDeleted)
  ) {
    return {
      linesAdded: Math.max(0, change.summary.linesAdded),
      linesDeleted: Math.max(0, change.summary.linesDeleted),
    }
  }

  const fallback = change.diffs.reduce(
    (acc, diff) => {
      if (diff.type === 'insertion') {
        acc.linesAdded += Math.max(0, diff.endLine - diff.startLine + 1)
      } else if (diff.type === 'deletion') {
        acc.linesDeleted += Math.max(0, diff.originalEndLine - diff.originalStartLine + 1)
      } else {
        acc.linesAdded += Math.max(0, diff.endLine - diff.startLine + 1)
        acc.linesDeleted += Math.max(0, diff.originalEndLine - diff.originalStartLine + 1)
      }
      return acc
    },
    { linesAdded: 0, linesDeleted: 0 }
  )

  return fallback
}

export function AssistantFileBlock({
  change,
  disabled = false,
  isOpening = false,
  isAccepting = false,
  isRejecting = false,
  onOpen,
  onAccept,
  onReject,
}: AssistantFileBlockProps) {
  const { linesAdded, linesDeleted } = computeLineStats(change)
  const actionDisabled = disabled || change.isStreaming

  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#12131a] px-2 py-1.5">
      <button
        type="button"
        onClick={onOpen}
        disabled={actionDisabled || !onOpen}
        className={cn(
          'min-w-0 flex-1 rounded-sm px-0.5 text-left transition-colors',
          actionDisabled || !onOpen
            ? 'cursor-default'
            : 'cursor-pointer hover:bg-white/5'
        )}
      >
        <div className="truncate text-[12px] font-medium text-zinc-200">{change.fileName}</div>
        <div className="truncate text-[10px] text-zinc-500">{change.filePath}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px]">
          <span className="font-medium text-emerald-300">+{linesAdded}</span>
          <span className="font-medium text-rose-300">-{linesDeleted}</span>
          <span className="text-zinc-500">
            {change.summary.totalChangedBlocks} diff
            {change.summary.totalChangedBlocks === 1 ? '' : 's'}
          </span>
          {isOpening ? (
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              <span>Opening</span>
            </span>
          ) : (
            <span className="text-zinc-500">{change.isStreaming ? 'Streaming' : 'Ready'}</span>
          )}
        </div>
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onReject}
          disabled={actionDisabled || !onReject}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-[#3b3d46] px-2 text-[11px] text-zinc-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          <span>Reject</span>
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={actionDisabled || !onAccept}
          className="inline-flex h-6 items-center gap-1 rounded-md bg-[#6D78E7] px-2 text-[11px] text-white transition-colors hover:bg-[#5b65d6] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isAccepting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          <span>Accept</span>
        </button>
      </div>
    </div>
  )
}
