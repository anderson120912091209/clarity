'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, SearchIcon, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  SettingsPageHeader,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { useFrontend } from '@/contexts/FrontendContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { getAllProjects, getAllUserFiles } from '@/hooks/data'
import { permanentlyDeleteProject } from '@/lib/utils/project-trash'
import TrashedProjectRow from '@/components/projects/trashed-project-row'

type TrashSort = 'deleted' | 'name'

// Force rebuild
export default function TrashPage() {
  const { user } = useFrontend()
  const { settings } = useDashboardSettings()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<TrashSort>(
    settings.defaultSort === 'name' ? 'name' : 'deleted'
  )
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false)

  const { data: projectsData, isLoading: isLoadingProjects } = getAllProjects(user?.id)
  const { data: filesData } = getAllUserFiles(user?.id)

  useEffect(() => {
    setSortOrder(settings.defaultSort === 'name' ? 'name' : 'deleted')
  }, [settings.defaultSort])

  const trashedProjects = useMemo(
    () => (projectsData?.projects || []).filter((project: any) => Boolean(project.trashed_at)),
    [projectsData?.projects]
  )

  const fileMetaByProjectId = useMemo(() => {
    const map = new Map<string, { fileIds: string[]; isTypst: boolean }>()
    for (const file of filesData?.files || []) {
      if (!file?.projectId || !file?.id) continue
      const current = map.get(file.projectId) || { fileIds: [], isTypst: false }
      current.fileIds.push(file.id)
      if (typeof file.name === 'string' && file.name.endsWith('.typ')) {
        current.isTypst = true
      }
      map.set(file.projectId, current)
    }
    return map
  }, [filesData?.files])

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const source = normalizedSearch
      ? trashedProjects.filter((project: any) =>
          String(project.title || '').toLowerCase().includes(normalizedSearch)
        )
      : trashedProjects

    return [...source].sort((left: any, right: any) => {
      if (sortOrder === 'name') {
        return String(left.title || '').localeCompare(String(right.title || ''))
      }

      const leftDeletedAt = new Date(left.trashed_at || 0).getTime()
      const rightDeletedAt = new Date(right.trashed_at || 0).getTime()
      return rightDeletedAt - leftDeletedAt
    })
  }, [searchTerm, sortOrder, trashedProjects])

  const handleEmptyTrash = async () => {
    if (!user?.id || !trashedProjects.length || isEmptyingTrash) return

    if (settings.confirmBeforePermanentDelete) {
      const confirmed = window.confirm(
        `Delete all ${trashedProjects.length} trashed projects permanently? This cannot be undone.`
      )
      if (!confirmed) return
    }

    setIsEmptyingTrash(true)
    try {
      await Promise.all(
        trashedProjects.map((project: any) =>
          permanentlyDeleteProject({
            projectId: project.id,
            userId: user.id,
            fileIds: fileMetaByProjectId.get(project.id)?.fileIds || [],
          })
        )
      )
    } finally {
      setIsEmptyingTrash(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl pb-20 pt-8">
      <SettingsPageHeader
        title="Trash"
        description="Deleted projects stay here until you restore them or remove them permanently."
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white"
            onClick={() => setSortOrder((current) => (current === 'deleted' ? 'name' : 'deleted'))}
          >
            Sort: {sortOrder === 'deleted' ? 'Deleted date' : 'Name'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2.5 text-[11px] text-red-400/90 hover:bg-red-500/10 hover:text-red-300"
            onClick={handleEmptyTrash}
            disabled={!trashedProjects.length || isEmptyingTrash}
          >
            {isEmptyingTrash ? 'Emptying...' : 'Empty trash'}
          </Button>
        </div>
      </SettingsPageHeader>

      <SettingsSectionCard
        title="Deleted projects"
        description={`${filteredProjects.length} ${
          filteredProjects.length === 1 ? 'project' : 'projects'
        } found`}
      >
        <div className="mb-4 border-b border-white/[0.04] pb-4">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
              <SearchIcon className="h-3.5 w-3.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
            </div>
            <Input
              className="h-8 rounded-[4px] border-white/[0.08] bg-white/[0.03] pl-8 text-[12px] text-zinc-300 placeholder:text-zinc-600 focus:bg-white/[0.06] focus:border-white/20 focus:ring-0"
              placeholder="Search trash..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search trash"
            />
          </div>
        </div>

        {isLoadingProjects ? (
          <div className="py-10 text-center text-[12px] text-zinc-500">
            Loading trash...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-zinc-500">
              <Trash2 className="h-4 w-4" />
            </div>
            <p className="text-[13px] font-medium text-zinc-300">
              {searchTerm ? 'No matching projects' : 'Trash is empty'}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {searchTerm ? 'Try another keyword.' : 'Deleted projects will show up here.'}
            </p>
            <Button asChild variant="ghost" className="mt-4 h-8 px-2.5 text-[11px] text-zinc-300 hover:text-white hover:bg-white/5">
              <Link href="/projects">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to projects
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredProjects.map((project: any) => {
              const fileMeta = fileMetaByProjectId.get(project.id)
              return (
                <TrashedProjectRow
                  key={project.id}
                  project={project}
                  userId={user?.id || ''}
                  fileIds={fileMeta?.fileIds || []}
                  isTypst={fileMeta?.isTypst || false}
                />
              )
            })}
          </div>
        )}
      </SettingsSectionCard>
    </div>
  )
}
