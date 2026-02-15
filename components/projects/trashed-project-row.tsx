'use client'

import { useState } from 'react'
import { FileText, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { restoreProjectFromTrash, permanentlyDeleteProject } from '@/lib/utils/project-trash'
import { formatRelativeTime } from '@/lib/utils/time'

interface TrashedProjectRowProps {
  project: any
  fileIds: string[]
  isTypst: boolean
  userId: string
}

export default function TrashedProjectRow({
  project,
  fileIds,
  isTypst,
  userId,
}: TrashedProjectRowProps) {
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { settings } = useDashboardSettings()

  const projectType = isTypst ? 'Typst' : 'TeX'
  const compact = settings.density === 'compact'

  const handleRestore = async () => {
    if (!project?.id || isRestoring) return

    setIsRestoring(true)
    try {
      await restoreProjectFromTrash(project.id)
    } finally {
      setIsRestoring(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!project?.id || !userId || isDeleting) return

    if (settings.confirmBeforePermanentDelete) {
      const confirmed = window.confirm(
        `Delete "${project.title}" permanently? This cannot be undone.`
      )
      if (!confirmed) return
    }

    setIsDeleting(true)
    try {
      await permanentlyDeleteProject({
        projectId: project.id,
        userId,
        fileIds,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-md border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/[0.14] ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      }`}
    >
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-zinc-500">
          <FileText className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-white/90">{project.title || 'Untitled project'}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
            <span>Trashed {formatRelativeTime(project.trashed_at || project.last_compiled || Date.now())}</span>

            {settings.showLastEditedTime && project.last_compiled && (
              <span>Last edited {formatRelativeTime(project.last_compiled)}</span>
            )}

            {settings.showProjectTypeBadge && (
              <span className={isTypst ? 'text-[#ABCCF5]' : 'text-[#B5C6AE]'}>{projectType}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-2.5 text-[12px] text-zinc-300 hover:bg-white/5 hover:text-white"
          onClick={handleRestore}
          disabled={isRestoring || isDeleting}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {isRestoring ? 'Restoring...' : 'Restore'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-2.5 text-[12px] text-red-400/90 hover:bg-red-500/10 hover:text-red-300"
          onClick={handlePermanentDelete}
          disabled={isDeleting || isRestoring}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {isDeleting ? 'Deleting...' : 'Delete forever'}
        </Button>
      </div>
    </div>
  )
}
