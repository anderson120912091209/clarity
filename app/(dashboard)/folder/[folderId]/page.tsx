'use client'

import { useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SearchIcon,
  ArrowLeft,
  Pencil,
  Trash2,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react'
import ProjectCard from '@/components/projects/project-card'
import ProjectListItem from '@/components/projects/project-list-item'
import { ViewToggle } from '@/components/projects/view-toggle'
import { useFrontend } from '@/contexts/FrontendContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { getFolderProjects, getAllFolders, renameFolder, deleteFolder, removeProjectsFromFolder } from '@/hooks/data'
import Link from 'next/link'

export default function FolderPage() {
  const params = useParams()
  const router = useRouter()
  const folderId = params.folderId as string
  const { user } = useFrontend()
  const { settings } = useDashboardSettings()

  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState<'grid' | 'list'>(settings.defaultView)
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>(settings.defaultSort)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const { data: projectsData } = getFolderProjects(folderId, user?.id)
  const { data: foldersData } = getAllFolders(user?.id)

  const folder = useMemo(
    () => (foldersData?.folders || []).find((f: any) => f.id === folderId),
    [foldersData, folderId]
  )

  const allFolderProjects = useMemo(
    () => (projectsData?.projects || []).filter((p: any) => !p.trashed_at),
    [projectsData]
  )

  const folderProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filtered = normalizedSearch
      ? allFolderProjects.filter((p: any) =>
          String(p.title || '').toLowerCase().includes(normalizedSearch)
        )
      : allFolderProjects

    return [...filtered].sort((left: any, right: any) => {
      if (sortOrder === 'name') {
        return String(left.title || '').localeCompare(String(right.title || ''))
      }
      return (
        new Date(right.last_compiled || 0).getTime() -
        new Date(left.last_compiled || 0).getTime()
      )
    })
  }, [allFolderProjects, searchTerm, sortOrder])

  const handleRename = useCallback(async () => {
    if (!renameValue.trim()) return
    await renameFolder(folderId, renameValue.trim())
    setIsRenaming(false)
  }, [folderId, renameValue])

  const handleDelete = useCallback(async () => {
    const projectIds = allFolderProjects.map((p: any) => p.id)
    if (projectIds.length > 0) {
      await removeProjectsFromFolder(projectIds)
    }
    await deleteFolder(folderId)
    router.push('/projects')
  }, [folderId, allFolderProjects, router])

  const gridClasses =
    settings.density === 'compact'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'

  if (!folder) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p>Folder not found</p>
        <Link href="/projects" className="text-[#6D78E7] text-sm mt-2 hover:underline">
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {isRenaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleRename()
                  if (e.key === 'Escape') setIsRenaming(false)
                }}
                className="h-8 w-48 bg-white/5 border-white/10 text-white text-sm"
                autoFocus
              />
              <button onClick={handleRename} className="p-1 text-green-400 hover:text-green-300">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsRenaming(false)} className="p-1 text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: folder.color || '#6D78E7' }}
              />
              <h1 className="text-lg font-semibold text-white">{folder.name}</h1>
              <span className="text-xs text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                {folderProjects.length}
              </span>
            </div>
          )}

          {!isRenaming && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => {
                  setRenameValue(folder.name)
                  setIsRenaming(true)
                }}
                className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-56 group">
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
              <SearchIcon className="h-3.5 w-3.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
            </div>
            <Input
              className="pl-8 h-8 bg-white/[0.03] border-white/[0.08] text-[12px]
               text-zinc-300 placeholder:text-zinc-600 focus:bg-white/[0.06]
               focus:border-white/20 focus:ring-0 rounded-[4px] transition-all"
              placeholder="Search in folder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
          <Button
            onClick={() => setSortOrder(sortOrder === 'date' ? 'name' : 'date')}
            variant="ghost"
            className="h-8 px-2.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 rounded-[4px] transition-all"
          >
            Sort: {sortOrder === 'date' ? 'Date' : 'Name'}
          </Button>
        </div>
      </div>

      {/* Projects grid */}
      {view === 'grid' ? (
        <div className={gridClasses}>
          {folderProjects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          {folderProjects.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-500">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-zinc-600">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm">This folder is empty</p>
              <p className="text-xs text-zinc-600 mt-1">
                Drag and select projects to add them here
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.01]">
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-4 border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <div className="w-8" />
            <div>Name</div>
            {settings.showLastEditedTime && <div className="hidden sm:block">Last Edited</div>}
            <div className="w-7" />
          </div>
          {folderProjects.map((project: any) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
          {folderProjects.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
              <p>This folder is empty</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
