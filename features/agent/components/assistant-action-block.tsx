'use client'

import { Check, FilePlus, FolderPlus, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PendingFileAction } from '@/features/agent/services/file-action-manager'

interface AssistantActionBlockProps {
  action: PendingFileAction
  disabled?: boolean
  isAccepting?: boolean
  isRejecting?: boolean
  onAccept?: () => void
  onReject?: () => void
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case 'create_file':
      return FilePlus
    case 'create_folder':
      return FolderPlus
    case 'delete_file':
      return Trash2
    default:
      return FilePlus
  }
}

function getActionLabel(actionType: string) {
  switch (actionType) {
    case 'create_file':
      return 'New file'
    case 'create_folder':
      return 'New folder'
    case 'delete_file':
      return 'Delete'
    default:
      return 'Action'
  }
}

function getContentPreview(content: string | undefined, maxLines = 3): string | null {
  if (!content) return null
  const lines = content.split('\n').slice(0, maxLines)
  const preview = lines.join('\n')
  if (content.split('\n').length > maxLines) {
    return `${preview}\n...`
  }
  return preview
}

export function AssistantActionBlock({
  action,
  disabled = false,
  isAccepting = false,
  isRejecting = false,
  onAccept,
  onReject,
}: AssistantActionBlockProps) {
  const Icon = getActionIcon(action.actionType)
  const label = getActionLabel(action.actionType)
  const isDelete = action.actionType === 'delete_file'
  const preview = getContentPreview(action.content)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-[#141518]',
        isDelete ? 'border-rose-500/15' : 'border-white/[0.08]'
      )}
    >
      {/* Action info */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            isDelete ? 'text-rose-400/70' : 'text-emerald-400/70'
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px] font-medium uppercase tracking-wider',
                isDelete ? 'text-rose-400/60' : 'text-emerald-400/60'
              )}
            >
              {label}
            </span>
            <span className="truncate text-[13px] font-medium text-zinc-200">
              {action.filePath}
            </span>
          </div>
          {action.description && !action.description.startsWith('Create ') && !action.description.startsWith('Delete ') && (
            <div className="mt-0.5 truncate text-[11px] text-zinc-500">
              {action.description}
            </div>
          )}
        </div>
      </div>

      {/* Content preview for create_file */}
      {preview && (
        <div className="border-t border-white/[0.04] px-3 py-1.5">
          <pre className="overflow-hidden text-[10px] leading-relaxed text-zinc-500 font-mono whitespace-pre-wrap">
            {preview}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 border-t border-white/[0.06] px-2 py-1.5">
        <button
          type="button"
          onClick={onReject}
          disabled={disabled || !onReject}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
            'text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10',
            (disabled || !onReject) && 'opacity-30 pointer-events-none'
          )}
        >
          {isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Reject
        </button>

        <button
          type="button"
          onClick={onAccept}
          disabled={disabled || !onAccept}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
            isDelete
              ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
              : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
            (disabled || !onAccept) && 'opacity-30 pointer-events-none'
          )}
        >
          {isAccepting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {isDelete ? 'Delete' : 'Accept'}
        </button>
      </div>
    </div>
  )
}
