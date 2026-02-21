'use client'

import { Check, X } from 'lucide-react'

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
    <div className="border-b border-white/[0.06] bg-[#111215] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-zinc-400">
          {changeCount} file{changeCount === 1 ? '' : 's'} staged
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRejectAll}
            disabled={disabled}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-white/[0.08] px-2 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-3 w-3" />
            <span>Reject all</span>
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            disabled={disabled}
            className="inline-flex h-6 items-center gap-1 rounded-md bg-[#6d78e7] px-2 text-[11px] font-medium text-white transition-colors hover:bg-[#5d68d7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-3 w-3" />
            <span>Accept all</span>
          </button>
        </div>
      </div>
    </div>
  )
}
