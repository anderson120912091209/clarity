'use client'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CopyIcon, DownloadIcon, Edit2Icon, MoreHorizontal, Trash2 } from 'lucide-react'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import Link from 'next/link'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { id } from '@instantdb/react'
import Image from 'next/image'
import { savePdfToStorage, savePreviewToStorage } from '@/lib/utils/db-utils'
import { createPathname } from '@/lib/utils/client-utils'
import { getAllProjectFiles } from '@/hooks/data'
import { useFrontend } from '@/contexts/FrontendContext';
import { Skeleton } from '@/components/ui/skeleton';
import { startNavJourney } from '@/lib/perf/nav-trace';
import { moveProjectToTrash } from '@/lib/utils/project-trash'
import { formatRelativeTime } from '@/lib/utils/time'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { fetchPdf } from '@/lib/utils/pdf-utils'

export default function ProjectCard({ project, detailed = false, loading = false }: { project?: any; detailed?: boolean; loading?: boolean }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState(project?.title || '')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [imageURL, setImageURL] = useState('')
  const [imageError, setImageError] = useState(false)
  const { user } = useFrontend();
  const { id: userId } = user || { id: '' }
  const { settings } = useDashboardSettings()
  const [downloadURL, setDownloadURL] = useState('');
  const { data: files } = getAllProjectFiles(project?.id || '', userId)
  const compact = settings.density === 'compact'
  const previewWarmupStartedRef = useRef(false)

  // Determine project type
  const isTypst = files?.files?.some((f: any) => f.name.endsWith('.typ'))
  const projectType = isTypst ? 'Typst' : 'TeX'

  useEffect(() => {
    if (loading || !project || !userId) return

    const now = Date.now()
    const hasCachedPdf = typeof project.cachedPdfUrl === 'string' && project.cachedPdfUrl.length > 0
    const hasCachedPreview = typeof project.cachedPreviewUrl === 'string' && project.cachedPreviewUrl.length > 0
    const isCacheExpired =
      typeof project.cachedPdfExpiresAt !== 'number' ||
      typeof project.cachedPreviewExpiresAt !== 'number' ||
      project.cachedPdfExpiresAt < now ||
      project.cachedPreviewExpiresAt < now

    const pathname = createPathname(userId, project.id)
    if (hasCachedPdf && hasCachedPreview && isCacheExpired) {
      const expiresAt = Date.now() + 30 * 60 * 1000;
      db.storage.getDownloadUrl(pathname + 'main.pdf').then((url) => {
        db.transact(tx.projects[project.id].update({ cachedPdfUrl: url, cachedPdfExpiresAt: expiresAt })).then(() => {
          db.storage.getDownloadUrl(pathname + 'main.pdf').then((validatedUrl) => {
            setDownloadURL(validatedUrl)
          })
        })
      })
      db.storage.getDownloadUrl(pathname + 'preview.webp').then((url) => {
        db.transact(tx.projects[project.id].update({ cachedPreviewUrl: url, cachedPreviewExpiresAt: expiresAt })).then(() => {
          db.storage.getDownloadUrl(pathname + 'preview.webp').then((validatedUrl) => {
            setImageURL(validatedUrl)
          })
        })
      })
      return
    }

    if (hasCachedPdf && hasCachedPreview && !isCacheExpired) {
      setImageURL(project.cachedPreviewUrl)
      setDownloadURL(project.cachedPdfUrl)
      return
    }

    if (previewWarmupStartedRef.current) return
    if (!files?.files?.length) return

    const isWelcomeProject =
      typeof project?.title === 'string' && project.title.startsWith('Welcome to Clarity -')
    if (!isWelcomeProject) return

    const canCompile = files.files.some((file: any) => file?.type === 'file' && (file?.name === 'main.tex' || file?.name === 'main.typ'))
    if (!canCompile) return

    previewWarmupStartedRef.current = true
    void (async () => {
      try {
        const { blob } = await fetchPdf(project.id, files.files, {
          mode: 'manual',
          clientUserId: userId,
        })
        await Promise.allSettled([
          savePdfToStorage(blob, `${pathname}main.pdf`, project.id),
          savePreviewToStorage(blob, `${pathname}preview.webp`, project.id),
        ])
        const [freshPdfUrl, freshPreviewUrl] = await Promise.all([
          db.storage.getDownloadUrl(`${pathname}main.pdf`),
          db.storage.getDownloadUrl(`${pathname}preview.webp`),
        ])
        setDownloadURL(freshPdfUrl)
        setImageError(false)
        setImageURL(freshPreviewUrl)
      } catch (error) {
        previewWarmupStartedRef.current = false
        console.warn('Failed to warm project preview from card:', error)
      }
    })()
  }, [
    project?.id,
    project?.cachedPdfUrl,
    project?.cachedPreviewUrl,
    project?.cachedPdfExpiresAt,
    project?.cachedPreviewExpiresAt,
    userId,
    loading,
    files?.files,
  ])

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation();
    if (!project) return

    if (settings.confirmBeforeTrash) {
      const confirmed = window.confirm(`Move "${project.title}" to trash?`)
      if (!confirmed) return
    }

    await moveProjectToTrash(project.id)
    setIsDropdownOpen(false)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!project) return
    setIsDialogOpen(true)
    setIsDropdownOpen(false)
  }

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropdownOpen(false);
    if (!project || !files) {
      return;
    }

    const newProjectId = id();
    // Create a mapping of old file IDs to new file IDs
    const fileIdMapping = new Map();
    files.files.forEach((file) => {
      fileIdMapping.set(file.id, id());
    });

    const mappedActiveFileId =
      typeof project.activeFileId === 'string' ? fileIdMapping.get(project.activeFileId) : undefined
    const mainSourceFileId = files.files.find((file) => file.main_file)?.id
    const mappedMainFileId = mainSourceFileId ? fileIdMapping.get(mainSourceFileId) : undefined
    const duplicatedActiveFileId = mappedActiveFileId ?? mappedMainFileId

    const fileContents = files.files.map((file) => {
      return {
        id: fileIdMapping.get(file.id),
        name: file.name,
        content: file.content,
        pathname: file.pathname,
        project_id: newProjectId,
        created_at: new Date(),
        parent_id: file.parent_id ? fileIdMapping.get(file.parent_id) : null,
        updated_at: new Date(),
        isOpen: file.isOpen,
        isExpanded: file.isExpanded,
        type: file.type,
        main_file: file.main_file,
      }
    })
    
    if (downloadURL) {
      try {
        const response = await fetch(downloadURL)
        const blob = await response.blob()
        const pathname = createPathname(userId, newProjectId)
        await savePreviewToStorage(blob, pathname + 'preview.webp', newProjectId)
        await savePdfToStorage(blob, pathname + 'main.pdf', newProjectId)
      } catch (error) {
        console.error('Error downloading file:', error)
      }
    }

    db.transact([
      tx.projects[newProjectId].update({
        title: `${project.title} (Copy)`,
        project_content: project.project_content,
        document_class: project.document_class,
        template: project.template,
        user_id: project.user_id,
        created_at: new Date(),
        last_compiled: new Date(),
        word_count: 0,
        page_count: 0,
        ...(duplicatedActiveFileId ? { activeFileId: duplicatedActiveFileId } : {}),
        cachedPdfUrl: project.cachedPdfUrl,
        cachedPreviewUrl: project.cachedPreviewUrl,
        cachedPdfExpiresAt: project.cachedPdfExpiresAt,
        cachedPreviewExpiresAt: project.cachedPreviewExpiresAt,
      }),
      ...fileContents.map((file) =>
        tx.files[file.id].update({
          user_id: userId,
          projectId: newProjectId,
          name: file.name,
          pathname: file.pathname,
          content: file.content,
          created_at: new Date(),
          updated_at: new Date(),
          isOpen: file.isOpen,
          isExpanded: file.isExpanded,
          type: file.type,
          main_file: file.main_file,
          parent_id: file.parent_id,
        })
      )
    ])
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!project) return
    if (downloadURL) {
      fetch(downloadURL)
        .then((response) => response.blob())
        .then((blob) => {
          const blobUrl = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = `${project.title}.pdf`
          link.click()
          window.URL.revokeObjectURL(blobUrl)
        })
        .catch((error) => {
          console.error('Error downloading file:', error)
        })
    } else {
      console.error('Download URL is not available')
    }
    setIsDropdownOpen(false)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setIsDropdownOpen(false)
    }
  }

  // Show skeleton when loading
  if (loading) {
    return (
      <div className="flex flex-col">
        <Skeleton className="aspect-[3/4] w-full rounded-md bg-white/[0.05] border border-white/[0.08]" />
        <div className="mt-2 space-y-1 px-0.5">
          <Skeleton className="h-3 w-3/4 bg-white/[0.05]" />
          <Skeleton className="h-2.5 w-1/2 bg-white/[0.05]" />
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <>
      <Link 
        href={`/project/${project.id}`} 
        onClick={() =>
          startNavJourney('project_open', {
            source: 'projects_grid_card',
            projectId: project.id,
          })
        }
        className="group relative block outline-none"
      >
        {/* Card Cover */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-white/[0.1] bg-gradient-to-br from-[#131314] to-[#0a0a0b] shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] group-hover:border-white/[0.18] group-focus-visible:ring-2 group-focus-visible:ring-white/30 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#090909]">
          {/* Document Preview */}
          <Image
            src={!imageError && imageURL ? imageURL : '/placeholder.svg'}
            alt={`Cover for ${project.title}`}
            className="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-90"
            width={240}
            height={320}
            loader={({ src }) => src}
            onError={() => setImageError(true)}
          />


          {/* More Options Overlay */}
          <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 z-10">
             <div onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-zinc-600 hover:text-white"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40 bg-[#0F0F0F] border border-white/10 text-zinc-400 p-1 shadow-xl"
                >
                  <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-md cursor-pointer text-[12px] font-medium py-1.5 px-2" onClick={handleEdit}>
                    <Edit2Icon className="mr-2 h-3 w-3" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-md cursor-pointer text-[12px] font-medium py-1.5 px-2" onClick={handleDuplicate}>
                    <CopyIcon className="mr-2 h-3 w-3" />
                    <span>Duplicate</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-md cursor-pointer text-[12px] font-medium py-1.5 px-2" onClick={handleDownload}>
                    <DownloadIcon className="mr-2 h-3 w-3" />
                    <span>Download PDF</span>
                  </DropdownMenuItem>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <DropdownMenuItem className="focus:bg-red-500/10 focus:text-red-400 text-red-400/80 rounded-md cursor-pointer text-[12px] font-medium py-1.5 px-2" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-3 w-3" />
                    <span>Move to Trash</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Title & Info Below Card */}
        <div className={`${compact ? 'mt-1.5' : 'mt-2'} flex flex-col gap-0.5 px-0.5`}>
          <div className="flex items-center gap-2 max-w-full">
            <h3 className="truncate text-[12px] font-medium text-white/90 group-hover:text-white transition-colors leading-tight shrink">{project.title}</h3>
            {settings.showProjectTypeBadge && (
              <div className="flex items-center text-[12px] shrink-0">
                <span className="text-zinc-600 mr-1.5">•</span>
                <span
                  className={`font-medium ${isTypst ? 'text-[#ABCCF5]' : 'text-[#B5C6AE]'}`}
                >
                  {projectType}
                </span>
              </div>
            )}
          </div>
          {settings.showLastEditedTime && (
            <p className="text-[10px] text-zinc-500 font-mono tracking-tight">
              {project.last_compiled ? formatRelativeTime(project.last_compiled) : 'Draft'}
            </p>
          )}
        </div>
      </Link>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-zinc-200">Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)} 
              placeholder="Enter new title" 
              className="bg-white/5 border-white/10 text-white focus:bg-white/10 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && project) {
                  db.transact([tx.projects[project.id].update({ title: newTitle })])
                  handleDialogOpenChange(false)
                }
              }} 
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5" onClick={() => handleDialogOpenChange(false)}>Cancel</Button>
            <Button
              className="bg-white text-black hover:bg-zinc-200"
              onClick={() => {
                if (project) {
                  db.transact([tx.projects[project.id].update({ title: newTitle })])
                  handleDialogOpenChange(false)
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
