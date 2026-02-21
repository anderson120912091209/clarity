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
    <div className="border-b border-white/10 bg-[#15161c] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-300">
          {changeCount} file{changeCount === 1 ? '' : 's'} with staged changes
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRejectAll}
            disabled={disabled}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-[#3b3d46] px-2 text-[11px] text-zinc-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <X className="h-3 w-3" />
            <span>Reject All</span>
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            disabled={disabled}
            className="inline-flex h-6 items-center gap-1 rounded-md bg-[#6D78E7] px-2 text-[11px] text-white transition-colors hover:bg-[#5b65d6] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Check className="h-3 w-3" />
            <span>Accept All</span>
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Open each assistant response to review file blocks and jump directly to the diff in-editor.
      </p>
    </div>
  )
}
