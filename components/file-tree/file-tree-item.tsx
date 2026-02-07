'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, MoreHorizontal, Trash2, Edit2, FilePlus, FolderPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileIcon } from './file-icon'
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
          "flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors group rounded-sm mb-0.5 last:mb-0 text-left",
          isSelected
            ? "bg-[#1C1D21] text-[#E4E4E7]"
            : "text-white/60 hover:text-white hover:bg-[#151619]"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
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

        <span className="shrink-0">
          <FileIcon
            name={node.name}
            isFolder={isFolder}
            isOpen={node.isExpanded}
            className={cn(
              "h-3.5 w-3.5",
              isSelected ? "text-white/80" : "text-white/50 group-hover:text-white/70"
            )}
          />
        </span>
        
        {isEditing ? (
           <Input
             value={editName}
             onChange={(e) => setEditName(e.target.value)}
             onKeyDown={handleKeyDown}
             onBlur={() =>setIsEditing(false)}
             autoFocus
             className="h-6 text-xs py-0 px-1 bg-white/5 border-white/10"
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
                className="p-0.5 hover:bg-zinc-700/50 rounded text-white/40 hover:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-[#1C1D1F] border-white/[0.08] text-white/90 shadow-xl p-1"
            >
              {isFolder && (
                <>
                  <DropdownMenuItem 
                    onClick={() => onCreateFile(node.id)}
                    className="focus:bg-[#151619] focus:text-white cursor-pointer text-[12px] px-2 py-1.5 rounded-sm"
                  >
                    <FilePlus className="mr-2 h-3.5 w-3.5 opacity-70" /> New File
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onCreateFolder(node.id)}
                    className="focus:bg-[#151619] focus:text-white cursor-pointer text-[12px] px-2 py-1.5 rounded-sm"
                  >
                    <FolderPlus className="mr-2 h-3.5 w-3.5 opacity-70" /> New Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.08] my-1" />
                </>
              )}
              <DropdownMenuItem 
                onClick={() => setIsEditing(true)}
                className="focus:bg-[#151619] focus:text-white cursor-pointer text-[12px] px-2 py-1.5 rounded-sm"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5 opacity-70" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(node.id)} 
                className="focus:bg-[#3f1616] focus:text-red-400 text-red-500 hover:text-red-400 cursor-pointer text-[12px] px-2 py-1.5 rounded-sm"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5 opacity-70" /> Delete
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
