'use client'

import { Check, FileCode, Loader2, X, Eye } from 'lucide-react'
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
    <div className="group relative flex flex-col gap-2 rounded-lg border border-white/5 bg-[#18181b]/50 p-3 transition-colors hover:border-white/10 hover:bg-[#18181b]">
      {/* Header: File Info & Stats */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-zinc-400">
            <FileCode className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="truncate text-sm font-medium text-zinc-200">{change.fileName}</div>
            <div className="truncate text-xs text-zinc-500">{change.filePath}</div>
          </div>
        </div>

        {/* Stats Badge */}
        <div className="flex items-center gap-3 rounded-md bg-black/20 px-2 py-1 text-xs font-medium border border-white/5">
          <span className="text-emerald-400">+{linesAdded}</span>
          <span className="text-rose-400">-{linesDeleted}</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="text-zinc-500">
            {change.summary.totalChangedBlocks} chunk{change.summary.totalChangedBlocks !== 1 && 's'}
          </span>
        </div>
      </div>

      {/* Footer: Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onOpen}
          disabled={actionDisabled || !onOpen}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition-colors",
            actionDisabled || !onOpen
              ? "text-zinc-600 cursor-not-allowed"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {isOpening ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          <span>{isOpening ? 'Opening...' : 'View Diff'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            disabled={actionDisabled || !onReject}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              "border border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200",
              (actionDisabled || !onReject) && "opacity-50 cursor-not-allowed hover:bg-white/5 hover:text-zinc-400"
            )}
          >
            {isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            <span>Reject</span>
          </button>
          
          <button
            onClick={onAccept}
            disabled={actionDisabled || !onAccept}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all shadow-sm border border-white/10",
              "bg-[#6D78E7] text-white hover:bg-[#6D78E7]/90 hover:shadow-md hover:shadow-[#6D78E7]/20",
              (actionDisabled || !onAccept) && "opacity-50 cursor-not-allowed hover:bg-[#6D78E7] hover:shadow-none"
            )}
          >
            {isAccepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span>Apply Edit</span>
          </button>
        </div>
      </div>
    </div>
  )
}
