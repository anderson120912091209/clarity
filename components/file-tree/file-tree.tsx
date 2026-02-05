'use client'

import React, { useMemo, useRef } from 'react'
import { FileSystemNode, useFileSystem } from '@/hooks/useFileSystem'
import { FileTreeItem } from './file-tree-item'
import { FilePlus, FolderPlus, Upload } from 'lucide-react'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'

interface FileTreeProps {
  files: any[]
  projectId: string
  userId: string
  onOpenFile: (file: any) => void
  currentlyOpenId?: string
}

export function FileTree({ files, projectId, userId, onOpenFile, currentlyOpenId }: FileTreeProps) {
  const { createFile, createFolder, deleteNode, renameNode, uploadFile } = useFileSystem(projectId, userId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Convert flat list to tree
  const treeData = useMemo(() => {
    if (!files) return []

    // 1. Create a map for quick access
    const nodeMap = new Map<string, FileSystemNode>()
    files.forEach(f => {
      nodeMap.set(f.id, { ...f, children: [] })
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
  }, [files])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadFile(file) // Upload to root by default for toolbar button
      // Reset input
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <div className="flex items-center justify-between px-1.5 pb-2 text-[12px] text-white/60 font-medium">
        <span>Files</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => createFile('new-file.tex')}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="New File"
            aria-label="New File"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => createFolder('New Folder')}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="New Folder"
            aria-label="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Upload File"
            aria-label="Upload File"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-1">
         {treeData.map(node => (
            <FileTreeItem
               key={node.id}
               node={node}
               level={0}
               onSelect={(n) => {
                 onOpenFile(files.find(f => f.id === n.id))
               }}
               onToggleExpand={(n) => {
                  const isExpanded = files.find(f => f.id === n.id)?.isExpanded
                  db.transact([tx.files[n.id].update({ isExpanded: !isExpanded })])
               }}
               onCreateFile={(parentId) => createFile('new-file.tex', '', parentId)}
               onCreateFolder={(parentId) => createFolder('New Folder', parentId)}
               onDelete={deleteNode}
               onRename={renameNode}
               selectedId={currentlyOpenId}
            />
         ))}
      </div>
    </div>
  )
}
