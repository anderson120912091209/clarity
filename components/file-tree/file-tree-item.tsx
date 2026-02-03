'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, MoreHorizontal, FileIcon, Trash2, Edit2, FilePlus, FolderPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { FileSystemNode } from '@/hooks/useFileSystem'

interface FileTreeItemProps {
  node: FileSystemNode
  level: number
  onSelect: (node: FileSystemNode) => void
  onToggleExpand: (node: FileSystemNode) => void
  onCreateFile: (parentId: string) => void
  onCreateFolder: (parentId: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newName: string) => void
  selectedId?: string
}

export function FileTreeItem({
  node,
  level,
  onSelect,
  onToggleExpand,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  selectedId
}: FileTreeItemProps) {
  const isFolder = node.type === 'folder'
  const isSelected = selectedId === node.id
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRename(node.id, editName)
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditName(node.name)
    }
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors group",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation()
          if (isFolder) {
            onToggleExpand(node)
          } else {
            onSelect(node)
          }
        }}
      >
        <span className="shrink-0 opacity-70">
          {isFolder ? (
            node.isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
             <div className="w-3.5" /> // Spacer for alignment
          )}
        </span>

        <span className={cn("shrink-0", isFolder ? "text-blue-400" : "text-zinc-400")}>
          {isFolder ? (
            node.isExpanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
        </span>
        
        {isEditing ? (
           <Input
             value={editName}
             onChange={(e) => setEditName(e.target.value)}
             onKeyDown={handleKeyDown}
             onBlur={() =>setIsEditing(false)}
             autoFocus
             className="h-6 text-xs py-0 px-1"
             onClick={(e) => e.stopPropagation()}
           />
        ) : (
           <span className="text-xs truncate flex-1">{node.name}</span>
        )}

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div 
                  role="button" 
                  className="p-0.5 hover:bg-zinc-700/50 rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {isFolder && (
                  <>
                    <DropdownMenuItem onClick={() => onCreateFile(node.id)}>
                      <FilePlus className="mr-2 h-3.5 w-3.5" /> New File
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateFolder(node.id)}>
                      <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-3.5 w-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(node.id)} className="text-red-500 hover:text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {isFolder && node.isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDelete={onDelete}
              onRename={onRename}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
