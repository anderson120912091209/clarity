'use client'

import React, { useState } from 'react'
import { FolderPlus, X, ChevronDown, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Folder {
  id: string
  name: string
  color?: string
}

interface SelectionToolbarProps {
  selectedCount: number
  folders: Folder[]
  onAddToFolder: (folderId: string) => void
  onCreateFolder: () => void
  onDeselect: () => void
}

export function SelectionToolbar({
  selectedCount,
  folders,
  onAddToFolder,
  onCreateFolder,
  onDeselect,
}: SelectionToolbarProps) {
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 bg-[#1C1D1F] border border-white/10 rounded-xl px-4 py-2.5 shadow-2xl shadow-black/60">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="w-5 h-5 rounded-md bg-[#6D78E7] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{selectedCount}</span>
          </div>
          <span className="text-sm text-zinc-300 font-medium whitespace-nowrap">
            {selectedCount === 1 ? 'project' : 'projects'} selected
          </span>
        </div>

        {/* Add to Folder */}
        <div className="relative">
          <button
            onClick={() => setShowFolderPicker(!showFolderPicker)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              showFolderPicker
                ? "bg-[#6D78E7] text-white"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <FolderPlus className="w-4 h-4" />
            Add to Folder
            <ChevronDown className={cn("w-3 h-3 transition-transform", showFolderPicker && "rotate-180")} />
          </button>

          {/* Folder picker dropdown */}
          {showFolderPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1C1D1F] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="p-1.5">
                {folders.length > 0 && (
                  <div className="mb-1">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          onAddToFolder(folder.id)
                          setShowFolderPicker(false)
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-left"
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-sm shrink-0"
                          style={{ backgroundColor: folder.color || '#6D78E7' }}
                        />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className={cn(folders.length > 0 && "border-t border-white/5 pt-1")}>
                  <button
                    onClick={() => {
                      onCreateFolder()
                      setShowFolderPicker(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-[#6D78E7] hover:bg-[#6D78E7]/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Folder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Deselect */}
        <button
          onClick={onDeselect}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
