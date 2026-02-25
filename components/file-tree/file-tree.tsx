'use client'

import React, { useMemo, useRef, useState, useCallback } from 'react'
import { FileSystemNode, useFileSystem } from '@/hooks/useFileSystem'
import { FileTreeItem } from './file-tree-item'
import { FilePlus, FolderPlus, Upload, Check, X } from 'lucide-react'
import type { CollaborationRole } from '@/features/collaboration/types'
import { cn } from '@/lib/utils'
import { db } from '@/lib/constants'

interface UploadEntry {
  id: string
  name: string
  size: number
  status: 'uploading' | 'done' | 'error'
  progress: number // 0-100
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileTreeProps {
  files: FileSystemNode[]
  projectId: string
  userId: string
  ownerUserId?: string
  shareToken?: string
  role?: CollaborationRole
  onOpenFile: (file: { id: string }) => void
  currentlyOpenId?: string
}

export function FileTree({
  files,
  projectId,
  userId,
  ownerUserId,
  shareToken,
  role,
  onOpenFile,
  currentlyOpenId,
}: FileTreeProps) {
  const shouldLoadProjectShareTokens = !shareToken && role === 'editor'
  const { data: shareLinksData } = db.useQuery(
    shouldLoadProjectShareTokens && projectId
      ? {
          project_share_links: {
            $: {
              where: {
                projectId,
              },
            },
          },
        }
      : null
  )
  const projectShareTokens = useMemo(() => {
    const rows = Array.isArray(shareLinksData?.project_share_links)
      ? shareLinksData.project_share_links
      : []
    const now = Date.now()
    const values = new Set<string>()

    rows.forEach((row) => {
      if (typeof row?.revoked_at === 'string' && row.revoked_at.trim()) return
      if (typeof row?.expires_at_ms === 'number' && row.expires_at_ms <= now) return
      const rawToken =
        (typeof row?.token === 'string' && row.token) ||
        (typeof row?.comment_token === 'string' && row.comment_token) ||
        (typeof row?.edit_token === 'string' && row.edit_token) ||
        ''

      const token = rawToken.trim()
      if (!token) return
      values.add(token)
    })

    return Array.from(values)
  }, [shareLinksData?.project_share_links])

  const {
    canEdit,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    toggleNodeExpansion,
    uploadFile,
    uploadZip,
  } = useFileSystem(projectId, userId, {
    ownerUserId,
    shareToken,
    projectShareTokens,
    role,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadEntry[]>([])

  const dismissUpload = useCallback((entryId: string) => {
    setUploads(prev => prev.filter(u => u.id !== entryId))
  }, [])

  const progressTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const startProgressAnimation = useCallback((entryId: string) => {
    const timer = setInterval(() => {
      setUploads(prev => prev.map(u => {
        if (u.id !== entryId || u.status !== 'uploading') return u
        // Ease toward 90% — never reaches 100 until actually done
        const next = u.progress + (90 - u.progress) * 0.08
        return { ...u, progress: Math.min(next, 90) }
      }))
    }, 100)
    progressTimersRef.current.set(entryId, timer)
  }, [])

  const stopProgressAnimation = useCallback((entryId: string) => {
    const timer = progressTimersRef.current.get(entryId)
    if (timer) {
      clearInterval(timer)
      progressTimersRef.current.delete(entryId)
    }
  }, [])

  const markUploadDone = useCallback((entryId: string) => {
    stopProgressAnimation(entryId)
    setUploads(prev => prev.map(u => u.id === entryId ? { ...u, status: 'done', progress: 100 } : u))
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.id !== entryId))
    }, 1500)
  }, [stopProgressAnimation])

  const markUploadError = useCallback((entryId: string, error: string) => {
    stopProgressAnimation(entryId)
    setUploads(prev => prev.map(u => u.id === entryId ? { ...u, status: 'error', error } : u))
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.id !== entryId))
    }, 4000)
  }, [stopProgressAnimation])

  // Convert flat list to tree
  const treeData = useMemo(() => {
    if (!files) return []

    // 1. Create a map for quick access
    const nodeMap = new Map<string, FileSystemNode>()
    files.forEach(f => {
      nodeMap.set(f.id, {
        ...f,
        isExpanded: canEdit ? f.isExpanded : true,
        children: [],
      })
    })

    // 2. Build tree
    const roots: FileSystemNode[] = []
    files.forEach(f => {
      const node = nodeMap.get(f.id)!
      if (f.parent_id && nodeMap.has(f.parent_id)) {
        nodeMap.get(f.parent_id)!.children!.push(node)
      } else {
        roots.push(node)
      }
    })
    
    // 3. Sort folders first, then files, alphabetical
    const sortNodes = (nodes: FileSystemNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'folder' ? -1 : 1
      })
      nodes.forEach(n => {
        if (n.children) sortNodes(n.children)
      })
    }
    sortNodes(roots)
    return roots
  }, [canEdit, files])

  const isTypstProject = useMemo(
    () => files?.some(f => f.type === 'file' && f.name.toLowerCase().endsWith('.typ')) ?? false,
    [files]
  )

  const defaultNewFileExt = isTypstProject ? 'new-file.typ' : 'new-file.tex'

  const handleUploadClick = () => {
    if (!canEdit) return
    fileInputRef.current?.click()
  }

  const processFileList = useCallback(async (fileList: FileList | File[]) => {
    const fileArr = Array.from(fileList)
    if (fileArr.length === 0) return

    for (const file of fileArr) {
      const isZip =
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip')

      if (isZip) {
        const entryId = `${Date.now()}-${file.name}`
        const entry: UploadEntry = { id: entryId, name: file.name, size: file.size, status: 'uploading', progress: 0 }
        setUploads(prev => [...prev, entry])
        let msgCount = 0
        try {
          await uploadZip(file, null, (message) => {
            msgCount++
            // Estimate: progress messages come per-entry, ease toward 95%
            const estimated = Math.min(95, msgCount * 3)
            setUploads(prev => prev.map(u => u.id === entryId ? { ...u, progress: estimated } : u))
          })
          markUploadDone(entryId)
        } catch (err) {
          console.error('ZIP extraction failed:', err)
          markUploadError(entryId, 'Extraction failed')
        }
      } else {
        const entryId = `${Date.now()}-${file.name}`
        const entry: UploadEntry = { id: entryId, name: file.name, size: file.size, status: 'uploading', progress: 0 }
        setUploads(prev => [...prev, entry])
        startProgressAnimation(entryId)
        try {
          await uploadFile(file)
          markUploadDone(entryId)
        } catch (err) {
          console.error('Upload failed:', file.name, err)
          markUploadError(entryId, 'Upload failed')
        }
      }
    }
  }, [uploadFile, uploadZip, markUploadDone, markUploadError, startProgressAnimation])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    await processFileList(fileList)
    e.target.value = ''
  }

  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canEdit) return
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (!canEdit) return
    const fileList = e.dataTransfer.files
    if (fileList.length > 0) {
      await processFileList(fileList)
    }
  }

  return (
    <div
      className="flex flex-col h-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-white/25 bg-[#09090b]/80 backdrop-blur-[2px]">
          <Upload className="w-5 h-5 text-white/50 mb-1.5" />
          <span className="text-[11px] font-medium text-white/60">Drop to upload</span>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept=".zip,image/*,.pdf,.tex,.bib,.sty,.cls,.txt,.typ,.ttf,.otf,.woff,.woff2,.tfm,.vf,.pfb,.enc,application/zip,application/x-zip-compressed,font/ttf,font/otf,font/woff,font/woff2"
      />

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div className="mx-1.5 mb-1.5 space-y-1">
          {uploads.map(entry => (
            <div key={entry.id} className="rounded border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                {entry.status === 'done' && <Check className="w-3 h-3 shrink-0 text-emerald-400" />}
                {entry.status === 'error' && <X className="w-3 h-3 shrink-0 text-red-400" />}
                {entry.status === 'uploading' && <Upload className="w-3 h-3 shrink-0 text-white/40" />}
                <span className="truncate flex-1 text-white/60">{entry.name}</span>
                <span className="shrink-0 text-[10px] text-white/30">{formatFileSize(entry.size)}</span>
              </div>
              {entry.status === 'uploading' && (
                <div className="h-[2px] bg-white/[0.04]">
                  <div
                    className="h-full bg-white/25 transition-all duration-150 ease-out"
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              )}
              {entry.status === 'done' && (
                <div className="h-[2px] bg-emerald-500/30" />
              )}
              {entry.status === 'error' && (
                <div className="h-[2px] bg-red-500/30" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-1.5 pb-2 text-[12px] text-white/60 font-medium">
        <span>Files</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (!canEdit) return
              void createFile(defaultNewFileExt)
            }}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="New File"
            aria-label="New File"
            disabled={!canEdit}
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canEdit) return
              void createFolder('New Folder')
            }}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="New Folder"
            aria-label="New Folder"
            disabled={!canEdit}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Upload File"
            aria-label="Upload File"
            disabled={!canEdit}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {shareToken && (!Array.isArray(files) || files.length === 0) && (
        <div className="mx-1.5 mb-2 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
          Shared session has no visible files. Add <code className="font-mono">?collabDebug=1</code>{' '}
          to URL and check browser console for <code className="font-mono">[collab-debug]</code>.
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto pb-1">
         {treeData.map(node => (
            <FileTreeItem
               key={node.id}
               node={node}
               level={0}
               onSelect={(n) => {
                 onOpenFile(n)
               }}
               onToggleExpand={(n) => {
                 if (!canEdit) return
                 const isExpanded = files.find(f => f.id === n.id)?.isExpanded
                 void toggleNodeExpansion(n.id, !isExpanded)
               }}
               onCreateFile={(parentId) => {
                 if (!canEdit) return
                 void createFile(defaultNewFileExt, '', parentId)
               }}
               onCreateFolder={(parentId) => {
                 if (!canEdit) return
                 void createFolder('New Folder', parentId)
               }}
               onDelete={deleteNode}
               onRename={renameNode}
               canEdit={canEdit}
               selectedId={currentlyOpenId}
            />
         ))}
      </div>
    </div>
  )
}
