'use client'

import React, { useMemo, useState, useRef } from 'react'
import { FileSystemNode, useFileSystem } from '@/hooks/useFileSystem'
import { FileTreeItem } from './file-tree-item'
import { FilePlus, FolderPlus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  
  // Local state for expansion (could be persisted in DB too, but local is fine for MVP)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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

  const handleToggleExpand = (node: FileSystemNode) => {
    // ... logic for toggling local state or DB state ...
  }

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
      <div className="flex items-center justify-between p-2 pb-1 text-xs text-muted-foreground font-medium">
         <span>FILES</span>
         <div className="flex gap-2">
             <div role="button" onClick={() => createFile('new-file.tex')} className="hover:text-foreground cursor-pointer" title="New File">
                <FilePlus className="w-3.5 h-3.5" />
             </div>
             <div role="button" onClick={() => createFolder('New Folder')} className="hover:text-foreground cursor-pointer" title="New Folder">
                <FolderPlus className="w-3.5 h-3.5" />
             </div>
             <div role="button" onClick={handleUploadClick} className="hover:text-foreground cursor-pointer" title="Upload File">
                <Upload className="w-3.5 h-3.5" />
             </div>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-1">
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
