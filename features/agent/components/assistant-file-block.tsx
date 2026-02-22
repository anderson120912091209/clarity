'use client'

import { Check, FileCode, Loader2, X, Eye, GitBranch } from 'lucide-react'
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

function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return ext
}

function getFileIconColor(filename: string): string {
  const ext = getFileExtension(filename)
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'text-blue-400'
    case 'js':
    case 'jsx':
      return 'text-yellow-400'
    case 'css':
    case 'scss':
      return 'text-pink-400'
    case 'py':
      return 'text-green-400'
    case 'typ':
    case 'tex':
      return 'text-teal-400'
    default:
      return 'text-zinc-400'
  }
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
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-[#16171c] to-[#131418] transition-all duration-200 hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20">
      {/* Top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#6d78e7]/30 to-transparent" />

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06]",
            getFileIconColor(change.fileName)
          )}>
            <FileCode className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-zinc-200">{change.fileName}</span>
              {change.isStreaming && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                  <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                  Writing
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-zinc-600 mt-0.5">{change.filePath}</div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 text-zinc-600" />
            <span className="text-[11px] text-zinc-500">
              {change.summary.totalChangedBlocks} chunk{change.summary.totalChangedBlocks !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="h-3 w-px bg-white/[0.06]" />
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <span className="text-emerald-400">+{linesAdded}</span>
            <span className="text-rose-400">-{linesDeleted}</span>
          </div>
          {/* Mini diff bar */}
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden max-w-[80px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${addedPercent}%` }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="mt-2.5 h-px w-full bg-white/[0.04]" />

        {/* Actions row */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onOpen}
            disabled={actionDisabled || !onOpen}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150",
              "text-zinc-500 hover:text-[#8b95f0] hover:bg-[#6d78e7]/8",
              (actionDisabled || !onOpen) && "opacity-40 cursor-not-allowed hover:text-zinc-500 hover:bg-transparent"
            )}
          >
            {isOpening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span>{isOpening ? 'Opening…' : 'View Diff'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onReject}
              disabled={actionDisabled || !onReject}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-150",
                "border border-white/[0.06] bg-white/[0.03] text-zinc-400",
                "hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20",
                (actionDisabled || !onReject) && "opacity-40 cursor-not-allowed hover:bg-white/[0.03] hover:text-zinc-400 hover:border-white/[0.06]"
              )}
            >
              {isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              <span>Reject</span>
            </button>

            <button
              onClick={onAccept}
              disabled={actionDisabled || !onAccept}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-150",
                "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
                "hover:bg-emerald-500/25 hover:border-emerald-500/30 hover:shadow-sm hover:shadow-emerald-500/10",
                (actionDisabled || !onAccept) && "opacity-40 cursor-not-allowed hover:bg-emerald-500/15 hover:border-emerald-500/20 hover:shadow-none"
              )}
            >
              {isAccepting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              <span>Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
