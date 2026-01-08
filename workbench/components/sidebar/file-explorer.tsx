'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { 
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useFrontend } from '@/contexts/FrontendContext'

export function FileExplorer() {
  const { projectId } = useProject()
  const { user } = useFrontend()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const { data, isLoading } = db.useQuery({
    files: {
      $: {
        where: {
          projectId: projectId,
        },
      },
    },
  })

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-5 bg-[#2d2d30] rounded animate-pulse" />
        ))}
      </div>
    )
  }

  const files = (data?.files || []) as any[]

  // Build tree structure
  const buildTree = (parentId: string | null = null): any[] => {
    return files
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const createFile = (parentId: string | null = null) => {
    const newId = id()
    const parent = files.find(f => f.id === parentId)
    const pathname = parent ? `${parent.pathname}/${newId}` : newId
    
    db.transact([
      tx.files[newId].update({
        id: newId,
        name: 'untitled.tex',
        type: 'file',
        parent_id: parentId,
        projectId: projectId,
        content: '',
        pathname: pathname,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      })
    ])
    
    setEditingId(newId)
    setEditingName('untitled.tex')
  }

  const createFolder = (parentId: string | null = null) => {
    const newId = id()
    const parent = files.find(f => f.id === parentId)
    const pathname = parent ? `${parent.pathname}/${newId}` : newId
    
    db.transact([
      tx.files[newId].update({
        id: newId,
        name: 'New Folder',
        type: 'folder',
        parent_id: parentId,
        projectId: projectId,
        pathname: pathname,
        isExpanded: false,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      })
    ])
    
    setEditingId(newId)
    setEditingName('New Folder')
    if (parentId) {
      setExpandedFolders(prev => new Set(prev).add(parentId))
    }
  }

  const renameFile = (fileId: string, newName: string) => {
    if (!newName.trim()) return
    
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const parent = files.find(f => f.id === file.parent_id)
    const newPathname = parent ? `${parent.pathname}/${newName}` : newName

    db.transact([
      tx.files[fileId].update({
        name: newName,
        pathname: newPathname,
      })
    ])
  }

  const deleteFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const toDelete = [fileId]
    
    // If folder, collect all descendants
    if (file.type === 'folder') {
      const collectDescendants = (id: string) => {
        files.forEach(f => {
          if (f.parent_id === id) {
            toDelete.push(f.id)
            if (f.type === 'folder') {
              collectDescendants(f.id)
            }
          }
        })
      }
      collectDescendants(fileId)
    }

    db.transact(toDelete.map(id => tx.files[id].delete()))
  }

  const renderFile = (file: any, depth: number = 0) => {
    const isExpanded = expandedFolders.has(file.id)
    const isEditing = editingId === file.id
    const isFolder = file.type === 'folder'

    return (
      <div key={file.id}>
        <div
          className={cn(
            "group flex items-center h-7 hover:bg-[#2a2d2e]/60 cursor-pointer rounded-sm mx-1",
            "text-[#cccccc] hover:text-white transition-colors"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: '8px' }}
        >
          {/* Chevron */}
          <div 
            className="w-4 h-4 flex items-center justify-center shrink-0 mr-0.5"
            onClick={() => isFolder && toggleFolder(file.id)}
          >
            {isFolder && (
              isExpanded 
                ? <ChevronDown className="w-3.5 h-3.5 text-[#cccccc]" />
                : <ChevronRight className="w-3.5 h-3.5 text-[#858585]" />
            )}
          </div>

          {/* Icon */}
          <div className="w-4 h-4 flex items-center justify-center shrink-0 mr-2">
            {isFolder ? (
              isExpanded 
                ? <FolderOpen className="w-[15px] h-[15px] text-[#dcb67a]" />
                : <Folder className="w-[15px] h-[15px] text-[#dcb67a]" />
            ) : (
              <File className="w-[15px] h-[15px] text-[#6e7681]" />
            )}
          </div>

          {/* Name */}
          {isEditing ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => {
                if (editingName.trim()) {
                  renameFile(file.id, editingName)
                }
                setEditingId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingName.trim()) {
                    renameFile(file.id, editingName)
                  }
                  setEditingId(null)
                } else if (e.key === 'Escape') {
                  setEditingId(null)
                }
              }}
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-white"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-[13px] truncate font-normal">
              {file.name}
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 pr-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingId(file.id)
                  setEditingName(file.name)
                }}
                className="p-1 hover:bg-[#3e3e42] rounded"
                title="Rename"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteFile(file.id)
                }}
                className="p-1 hover:bg-[#3e3e42] rounded text-red-400"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {isFolder && isExpanded && (
          <div>
            {buildTree(file.id).map(child => renderFile(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootFiles = buildTree(null)

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="group px-4 py-2 flex items-center justify-between hover:bg-[#2a2d2e]/40 transition-colors">
        <span className="text-[11px] font-bold text-[#6e7681] uppercase tracking-[0.08em] select-none">
          Files
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => createFile(null)}
            className="p-1.5 hover:bg-[#3e3e42] rounded transition-colors text-[#858585] hover:text-[#cccccc]"
            title="New File"
          >
            <FilePlus className="w-[14px] h-[14px]" />
          </button>
          <button
            onClick={() => createFolder(null)}
            className="p-1.5 hover:bg-[#3e3e42] rounded transition-colors text-[#858585] hover:text-[#cccccc]"
            title="New Folder"
          >
            <FolderPlus className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto">
        {rootFiles.length === 0 ? (
          <div className="p-4 text-xs text-[#858585] text-center">
            No files yet. Click + to create one.
          </div>
        ) : (
          rootFiles.map(file => renderFile(file, 0))
        )}
      </div>
    </div>
  )
}
