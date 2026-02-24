'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchIcon, PlusIcon } from 'lucide-react'
import Link from 'next/link'
import ProjectCard from '@/components/projects/project-card'
import NewProjectCard from '@/components/projects/new-project-card'
import FolderCard from '@/components/projects/folder-card'
import { useFrontend } from '@/contexts/FrontendContext'
import { getAllProjects, getAllFolders, createFolder, addProjectsToFolder, removeProjectsFromFolder } from '@/hooks/data'
import { ViewToggle } from '@/components/projects/view-toggle'
import ProjectListItem from '@/components/projects/project-list-item'
import { startNavJourney } from '@/lib/perf/nav-trace'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { DragSelect } from '@/components/projects/drag-select'
import { SelectionToolbar } from '@/components/projects/selection-toolbar'
import { CreateFolderDialog } from '@/components/features/projects/create-folder-dialog'
import { useUndoRedo } from '@/hooks/use-undo-redo'

export default function ProjectsPage() {
  const { user, isLoading: userLoading } = useFrontend()
  const { settings } = useDashboardSettings()
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState<'grid' | 'list'>(settings.defaultView)
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>(settings.defaultSort)
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }, [])

  const { push: pushUndo } = useUndoRedo(showToast)

  const { isLoading, data } = getAllProjects(user?.id)
  const { data: foldersData } = getAllFolders(user?.id)

  // Loading Screen Timer
  useEffect(() => {
    setMinLoadTimeElapsed(false)
    const timer = setTimeout(() => {
      setMinLoadTimeElapsed(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setView(settings.defaultView)
  }, [settings.defaultView])

  useEffect(() => {
    setSortOrder(settings.defaultSort)
  }, [settings.defaultSort])

  // Clear selection on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds.size])

  const allProjects = useMemo(
    () => (data?.projects || []).filter((project: any) => !project.trashed_at),
    [data?.projects]
  )

  const folders = useMemo(
    () => (foldersData?.folders || []).sort(
      (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    ),
    [foldersData?.folders]
  )

  // Projects NOT in any folder (loose projects)
  const looseProjects = useMemo(
    () => allProjects.filter((p: any) => !p.folder_id),
    [allProjects]
  )

  // Build folder → projects map for previews
  const folderProjectsMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const p of allProjects) {
      if (p.folder_id) {
        if (!map[p.folder_id]) map[p.folder_id] = []
        map[p.folder_id].push(p)
      }
    }
    return map
  }, [allProjects])

  const isPageLoading = !minLoadTimeElapsed || userLoading || !user || isLoading

  const sortedProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const source = normalizedSearch
      ? looseProjects.filter((project: any) =>
          String(project.title || '').toLowerCase().includes(normalizedSearch)
        )
      : looseProjects

    return [...source].sort((left: any, right: any) => {
      if (sortOrder === 'name') {
        return String(left.title || '').localeCompare(String(right.title || ''))
      }
      return (
        new Date(right.last_compiled || 0).getTime() - new Date(left.last_compiled || 0).getTime()
      )
    })
  }, [looseProjects, searchTerm, sortOrder])

  // Filter folders by search too
  const filteredFolders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) return folders
    return folders.filter((f: any) =>
      String(f.name || '').toLowerCase().includes(normalizedSearch)
    )
  }, [folders, searchTerm])

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids)
  }, [])

  const handleAddToFolder = useCallback(async (folderId: string) => {
    const currentIds = selectedIdsRef.current
    if (currentIds.size === 0) return
    const ids = Array.from(currentIds)
    // Capture previous folder_ids for undo
    const prevFolderMap = new Map<string, string>()
    for (const id of ids) {
      const proj = allProjects.find((p: any) => p.id === id)
      prevFolderMap.set(id, proj?.folder_id || '')
    }

    await addProjectsToFolder(ids, folderId)
    setSelectedIds(new Set())
    showToast(`Moved ${ids.length} ${ids.length === 1 ? 'project' : 'projects'} to folder`)

    pushUndo({
      label: `move ${ids.length} ${ids.length === 1 ? 'project' : 'projects'}`,
      undo: async () => {
        // Restore each project to its previous folder (or remove from folder)
        const { tx: txn } = await import('@instantdb/react')
        const { db: database } = await import('@/lib/constants')
        await database.transact(
          ids.map((id) => {
            const prev = prevFolderMap.get(id) || ''
            return txn.projects[id].update({ folder_id: prev })
          })
        )
      },
      redo: () => addProjectsToFolder(ids, folderId),
    })
  }, [allProjects, pushUndo, showToast])

  const handleCreateFolder = useCallback(async (name: string, color: string) => {
    if (!user) return
    const currentIds = selectedIdsRef.current
    const folderId = await createFolder(user.id, name, color)
    if (currentIds.size > 0) {
      const ids = Array.from(currentIds)
      await addProjectsToFolder(ids, folderId)
      setSelectedIds(new Set())
      showToast(`Created folder and moved ${ids.length} ${ids.length === 1 ? 'project' : 'projects'}`)
      pushUndo({
        label: `create folder & move ${ids.length} projects`,
        undo: () => removeProjectsFromFolder(ids),
        redo: () => addProjectsToFolder(ids, folderId),
      })
    }
  }, [user, pushUndo, showToast])

  const gridClasses =
    settings.density === 'compact'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'

  const listHeaderColumns = settings.showLastEditedTime
    ? 'grid-cols-[auto_1fr_auto_auto]'
    : 'grid-cols-[auto_1fr_auto]'

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72 group">
          <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
            <SearchIcon className="h-3.5 w-3.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
          </div>
          <Input
            className="pl-8 h-8 bg-white/[0.03] border-white/[0.08] text-[12px]
             text-zinc-300 placeholder:text-zinc-600 focus:bg-white/[0.06]
              focus:border-white/20 focus:ring-0 rounded-[4px] transition-all"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search projects"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ViewToggle view={view} onViewChange={setView} />

          <div className="h-3 w-[1px] bg-white/10 mx-1 hidden md:block" />

          <Button
            onClick={() => setSortOrder(sortOrder === 'date' ? 'name' : 'date')}
            variant="ghost"
            className="h-8 px-2.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 rounded-[4px] transition-all"
          >
            Sort: {sortOrder === 'date' ? 'Date' : 'Name'}
          </Button>

          <Button
            className="h-8 px-3 text-white font-medium tracking-wide rounded-md transition-all shadow-sm ml-auto md:ml-0 text-[12px]"
            style={{ backgroundColor: '#6D78E7' }}
            asChild
          >
            <Link
              href="/new"
              onClick={() =>
                startNavJourney('new_doc_open', { source: 'projects_header_button' })
              }
            >
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isPageLoading ? (
        <div className="animate-in fade-in duration-500">
          {view === 'grid' ? (
            <div className={gridClasses}>
              {[...Array(12)].map((_, i) => (
                <ProjectCard key={i} loading={true} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.01]">
              <div className={`grid ${listHeaderColumns} items-center gap-4 py-2 px-4 border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-zinc-500 uppercase tracking-wider`}>
                <div className="w-8"></div>
                <div>Name</div>
                {settings.showLastEditedTime && <div className="hidden sm:block">Last Edited</div>}
                <div className="w-7"></div>
              </div>
              {[...Array(8)].map((_, i) => (
                <ProjectListItem key={i} project={null} loading={true} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {view === 'grid' ? (
            <DragSelect onSelectionChange={handleSelectionChange} enabled={view === 'grid'}>
              {/* Folders section */}
              {filteredFolders.length > 0 && (
                <div className="mb-8">
                  <div className="mb-3">
                    <h2 className="text-[11px] font-semibold text-zinc-500 tracking-wider">Folders</h2>
                  </div>
                  <div className={gridClasses}>
                    {filteredFolders.map((folder: any) => {
                      const folderProjects = folderProjectsMap[folder.id] || []
                      return (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          projectCount={folderProjects.length}
                          projectPreviews={folderProjects.slice(0, 3).map((p: any) => ({
                            id: p.id,
                            cachedPreviewUrl: p.cachedPreviewUrl,
                            title: p.title,
                          }))}
                          compact={settings.density === 'compact'}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Projects section */}
              {(filteredFolders.length > 0 || folders.length > 0) && sortedProjects.length > 0 && (
                <div className="mb-3">
                  <h2 className="text-[11px] font-semibold text-zinc-500 tracking-wider">Projects</h2>
                </div>
              )}

              <div className={gridClasses}>
                {settings.showNewProjectCard && <NewProjectCard />}

                {sortedProjects.map((project: any) => (
                  <div
                    key={project.id}
                    data-selectable-id={project.id}
                  >
                    <ProjectCard project={project} isSelected={selectedIds.has(project.id)} />
                  </div>
                ))}

                {searchTerm && sortedProjects.length === 0 && filteredFolders.length === 0 && (
                   <div className="col-span-full flex flex-col items-center justify-center py-12 text-zinc-500">
                      <p>No projects found matching &quot;{searchTerm}&quot;</p>
                   </div>
                )}
              </div>
            </DragSelect>
          ) : (
            <div className="flex flex-col border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.01]">
              {/* List Header */}
              <div className={`grid ${listHeaderColumns} items-center gap-4 py-2 px-4 border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-zinc-500 uppercase tracking-wider`}>
                <div className="w-8"></div>
                <div>Name</div>
                {settings.showLastEditedTime && <div className="hidden sm:block">Last Edited</div>}
                <div className="w-7"></div>
              </div>

              {sortedProjects.map((project) => (
                <ProjectListItem key={project.id} project={project} />
              ))}

              {sortedProjects.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                   <p>{searchTerm ? `No projects found matching "${searchTerm}"` : "No projects yet"}</p>
                </div>
              )}
            </div>
          )}

          {/* Selection Toolbar */}
          <SelectionToolbar
            selectedCount={selectedIds.size}
            folders={folders as { id: string; name: string; color?: string }[]}
            onAddToFolder={handleAddToFolder}
            onCreateFolder={() => setShowCreateFolder(true)}
            onDeselect={() => setSelectedIds(new Set())}
          />

          {/* Create Folder Dialog */}
          <CreateFolderDialog
            open={showCreateFolder}
            onOpenChange={setShowCreateFolder}
            onCreateFolder={handleCreateFolder}
          />

          {/* Undo/Redo Toast */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="flex items-center gap-2 bg-[#1C1D1F] border border-white/10 rounded-lg px-3 py-2 shadow-xl shadow-black/50 text-sm text-zinc-300">
                <span>{toastMessage}</span>
                <kbd className="text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                  ⌘Z
                </kbd>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
