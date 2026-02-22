'use client'

import { Check, FileText, Loader2, X } from 'lucide-react'
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
  const totalChanges = linesAdded + linesDeleted
  const addedPercent = totalChanges > 0 ? (linesAdded / totalChanges) * 100 : 50

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#141518]">
      {/* File info + stats — clickable to open diff */}
      <button
        type="button"
        onClick={onOpen}
        disabled={actionDisabled || !onOpen}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
          "hover:bg-white/[0.03]",
          (actionDisabled || !onOpen) && "cursor-default"
        )}
      >
        <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-zinc-200">
              {change.fileName}
            </span>
            {change.isStreaming && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                Writing
              </span>
            )}
          </div>
        </div>

        {/* Compact stats */}
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums">
          <span className="text-emerald-400/80">+{linesAdded}</span>
          <span className="text-rose-400/80">-{linesDeleted}</span>
        </div>

        {/* Mini diff bar */}
        <div className="h-1 w-10 shrink-0 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500/70"
            style={{ width: `${addedPercent}%` }}
          />
        </div>

        {isOpening && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-zinc-500" />}
      </button>

      {/* Actions — compact bottom bar */}
      <div className="flex items-center justify-end gap-1 border-t border-white/[0.06] px-2 py-1.5">
        <button
          type="button"
          onClick={onReject}
          disabled={actionDisabled || !onReject}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10",
            (actionDisabled || !onReject) && "opacity-30 pointer-events-none"
          )}
        >
          {isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Reject
        </button>

        <button
          type="button"
          onClick={onAccept}
          disabled={actionDisabled || !onAccept}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20",
            (actionDisabled || !onAccept) && "opacity-30 pointer-events-none"
          )}
        >
          {isAccepting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Accept
        </button>
      </div>
    </div>
  )
}
