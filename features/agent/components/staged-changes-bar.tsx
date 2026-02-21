'use client'

import { Check, X, GitCommit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StagedChangesBarProps {
  changeCount: number
  isStreaming?: boolean
  onAcceptAll: () => void
  onRejectAll: () => void
}

export function StagedChangesBar({
  changeCount,
  isStreaming = false,
  onAcceptAll,
  onRejectAll,
}: StagedChangesBarProps) {
  if (changeCount === 0) return null

  const disabled = isStreaming

  return (
    <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#111215] via-[#12131a] to-[#111215] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#6d78e7]/10 border border-[#6d78e7]/15">
            <GitCommit className="h-3 w-3 text-[#8b95f0]" />
          </div>
          <span className="text-[12px] font-medium text-zinc-300">
            {changeCount} file{changeCount === 1 ? '' : 's'} staged
          </span>
          {isStreaming && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
              Streaming
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRejectAll}
            disabled={disabled}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-all duration-150",
              "border-white/[0.06] bg-white/[0.03] text-zinc-400",
              "hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20",
              disabled && "opacity-40 cursor-not-allowed hover:bg-white/[0.03] hover:text-zinc-400 hover:border-white/[0.06]"
            )}
          >
            <X className="h-3 w-3" />
            <span>Reject all</span>
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            disabled={disabled}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-all duration-150",
              "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
              "hover:bg-emerald-500/25 hover:border-emerald-500/30",
              disabled && "opacity-40 cursor-not-allowed hover:bg-emerald-500/15 hover:border-emerald-500/20"
            )}
          >
            <Check className="h-3 w-3" />
            <span>Accept all</span>
          </button>
        </div>
      </div>
    </div>
  )
}
