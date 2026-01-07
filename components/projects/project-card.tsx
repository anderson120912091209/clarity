'use client'
import { useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CopyIcon, DownloadIcon, Edit2Icon, MoreHorizontal, XIcon, MoreVertical } from 'lucide-react'
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
import { deleteFileFromStorage } from '@/lib/utils/db-utils';

export default function ProjectCard({ project, detailed = false }: { project: any; detailed?: boolean }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState(project.title)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [imageURL, setImageURL] = useState('')
  const [imageError, setImageError] = useState(false)
  const { user } = useFrontend();
  const { email, id: userId } = user
  const [downloadURL, setDownloadURL] = useState('');
  const { data: files} = getAllProjectFiles(project.id, userId)

  useEffect(() => {
    if (email && userId) {
      const pathname = createPathname(userId, project.id)
      if (project.cachedPdfExpiresAt < Date.now() || project.cachedPreviewExpiresAt < Date.now()) {
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
      } else {
        setImageURL(project.cachedPreviewUrl)
        setDownloadURL(project.cachedPdfUrl)
      }
    }
  }, [project.id, project.title, email, userId])

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation();

    db.transact([tx.projects[project.id].delete()]);
    if (files && files.files) {
      files.files.map((file) => db.transact([tx.files[file.id].delete()]))
    }
    deleteFileFromStorage(`${userId}/${project.id}/main.pdf`)
    deleteFileFromStorage(`${userId}/${project.id}/preview.webp`)
    setIsDropdownOpen(false)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDialogOpen(true)
    setIsDropdownOpen(false)
  }

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropdownOpen(false);
    if (!files) {
      return;
    }

    const newProjectId = id();

    // Create a mapping of old file IDs to new file IDs
    const fileIdMapping = new Map();
    files.files.forEach((file) => {
      fileIdMapping.set(file.id, id());
    });

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

  return (
    <>
      <Link href={`/project/${project.id}`} className="group relative block outline-none">
        {/* Card Cover */}
        <div className="relative aspect-[1.414/1] w-full overflow-hidden rounded-[4px] border border-white/10 bg-zinc-900 shadow-sm transition-all duration-200 hover:border-white/20">
          <Image
            src={!imageError && imageURL ? imageURL : '/placeholder.svg'}
            alt=""
            className="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
            width={400}
            height={300}
            loader={({ src }) => src}
            onError={() => setImageError(true)}
          />

          {/* More Options Overlay */}
          <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
             <div onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md bg-zinc-900/90 text-zinc-400 hover:bg-zinc-800 hover:text-white ring-1 ring-white/10"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-[#0A0A0A] border rounded-lg border-white/10 text-zinc-400 p-1"
                >
                  <DropdownMenuItem className="focus:bg-white/5 focus:text-white rounded-sm cursor-pointer text-xs font-medium py-2" onClick={handleEdit}>
                    <Edit2Icon className="mr-2 h-3.5 w-3.5" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-white/5 focus:text-white rounded-sm cursor-pointer text-xs font-medium py-2" onClick={handleDuplicate}>
                    <CopyIcon className="mr-2 h-3.5 w-3.5" />
                    <span>Duplicate</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-white/5 focus:text-white rounded-sm cursor-pointer text-xs font-medium py-2" onClick={handleDownload}>
                    <DownloadIcon className="mr-2 h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </DropdownMenuItem>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <DropdownMenuItem className="focus:bg-red-500/10 focus:text-red-400 text-red-400/80 rounded-sm cursor-pointer text-xs font-medium py-2" onClick={handleDelete}>
                    <XIcon className="mr-2 h-3.5 w-3.5" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Title & Info Below Card */}
        <div className="mt-3 flex flex-col gap-0.5 px-0.5">
          <h3 className="truncate text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors">{project.title}</h3>
          <p className="text-[11px] text-zinc-600">
            {project.last_compiled 
              ? `Edited ${getTimeAgo(new Date(project.last_compiled))}`
              : "Draft"}
          </p>
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
                if (e.key === 'Enter') {
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
                db.transact([tx.projects[project.id].update({ title: newTitle })])
                handleDialogOpenChange(false)
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


function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}mo ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}y ago`;
  }
}