'use client'

import React, { useMemo, useRef, useState } from 'react'
import { FileSystemNode, useFileSystem } from '@/hooks/useFileSystem'
import { FileTreeItem } from './file-tree-item'
import { FilePlus, FolderPlus, Upload } from 'lucide-react'
import type { CollaborationRole } from '@/features/collaboration/types'
import { db } from '@/lib/constants'

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
  const [zipStatus, setZipStatus] = useState<string | null>(null)
  
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

  const handleUploadClick = () => {
    if (!canEdit) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isZip =
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed' ||
      file.name.toLowerCase().endsWith('.zip')

    if (isZip) {
      setZipStatus('Extracting ZIP…')
      try {
        await uploadZip(file, null, (message) => setZipStatus(message))
        setZipStatus(null)
      } catch (err) {
        console.error('ZIP extraction failed:', err)
        setZipStatus('Extraction failed — see console for details')
        setTimeout(() => setZipStatus(null), 4000)
      }
    } else {
      await uploadFile(file)
    }

    // Reset input
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden"
        accept=".zip,image/*,.pdf,.tex,.bib,.sty,.cls,.txt,.typ,application/zip,application/x-zip-compressed"
      />
      {zipStatus && (
        <div className="mx-1.5 mb-2 rounded border border-[#6D78E7]/30 bg-[#6D78E7]/10 px-2 py-1.5 text-[11px] text-[#a5acf0] flex items-center gap-1.5">
          <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span className="truncate">{zipStatus}</span>
        </div>
      )}
      <div className="flex items-center justify-between px-1.5 pb-2 text-[12px] text-white/60 font-medium">
        <span>Files</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (!canEdit) return
              void createFile('new-file.tex')
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
                 void createFile('new-file.tex', '', parentId)
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
