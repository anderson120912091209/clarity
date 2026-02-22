'use client'

import { Check, ClipboardList, Loader2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanStatus } from '@/features/agent/hooks/useChatSession'

interface PlanApprovalBlockProps {
  planStatus: PlanStatus
  isExecuting?: boolean
  disabled?: boolean
  onApprove?: () => void
  onRevise?: () => void
}

export function PlanApprovalBlock({
  planStatus,
  isExecuting = false,
  disabled = false,
  onApprove,
  onRevise,
}: PlanApprovalBlockProps) {
  const isSettled = planStatus === 'approved' || planStatus === 'revised'

  return (
    <div className="overflow-hidden rounded-lg border border-[#6d78e7]/20 bg-[#141518]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <ClipboardList className="h-4 w-4 shrink-0 text-[#8b95f0]" />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#8b95f0]/60">
            Proposed Plan
          </span>
        </div>
        {planStatus === 'approved' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <Check className="h-2.5 w-2.5" /> Approved
          </span>
        )}
        {planStatus === 'revised' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            <Pencil className="h-2.5 w-2.5" /> Revised
          </span>
        )}
      </div>

      {/* Actions — only shown when pending */}
      {!isSettled && (
        <div className="flex items-center justify-end gap-1 border-t border-white/[0.06] px-2 py-1.5">
          <button
            type="button"
            onClick={onRevise}
            disabled={disabled || !onRevise}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10',
              (disabled || !onRevise) && 'opacity-30 pointer-events-none'
            )}
          >
            <Pencil className="h-3 w-3" />
            Revise
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={disabled || !onApprove || isExecuting}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
              (disabled || !onApprove || isExecuting) && 'opacity-30 pointer-events-none'
            )}
          >
            {isExecuting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            {isExecuting ? 'Executing…' : 'Approve & Execute'}
          </button>
        </div>
      )}
    </div>
  )
}
