'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

const FOLDER_COLORS = [
  '#6D78E7', // Default indigo
  '#E76D6D', // Red
  '#E7A56D', // Orange
  '#E7D76D', // Yellow
  '#6DE78A', // Green
  '#6DD5E7', // Cyan
  '#B56DE7', // Purple
  '#E76DB5', // Pink
]

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateFolder: (name: string, color: string) => Promise<void>
}

function FolderPreview({ color }: { color: string }) {
  return (
    <div className="relative w-28 h-20">
      {/* Back face */}
      <div
        className="absolute inset-x-0 top-[8%] bottom-0 rounded-xl"
        style={{ background: `linear-gradient(160deg, ${color}bb, ${color}88)` }}
      >
        {/* Tab */}
        <div
          className="absolute -top-[8px] left-[6%] w-[32%] h-[11px] rounded-t-lg"
          style={{ background: `linear-gradient(160deg, ${color}cc, ${color}99)` }}
        />
      </div>

      {/* Blank document peeking out */}
      <div className="absolute left-[18%] right-[18%] top-[4%] bottom-[34%] z-10">
        <div className="absolute inset-0 bg-white rounded-[3px] shadow-[0_1px_6px_rgba(0,0,0,0.2)]">
          <div className="p-2 space-y-1.5">
            <div className="h-1 w-[55%] bg-zinc-200/80 rounded-full" />
            <div className="h-0.5 w-[40%] bg-zinc-100 rounded-full" />
            <div className="h-0.5 w-[50%] bg-zinc-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* Front face */}
      <div
        className="absolute inset-x-0 top-[42%] bottom-0 rounded-xl z-20"
        style={{
          background: `linear-gradient(175deg, ${color}dd, ${color}aa)`,
          boxShadow: `0 -1px 0 ${color}30 inset`,
        }}
      />
    </div>
  )
}

export function CreateFolderDialog({ open, onOpenChange, onCreateFolder }: CreateFolderDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(FOLDER_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (open) {
      setTimeout(() => document.getElementById('folder-name-input')?.focus(), 100)
    } else {
      setName('')
      setColor(FOLDER_COLORS[0])
      setIsCreating(false)
    }
  }, [open])

  const handleCreate = useCallback(async () => {
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    try {
      await onCreateFolder(name.trim(), color)
      onOpenChange(false)
    } catch {
      setIsCreating(false)
    }
  }, [name, color, isCreating, onCreateFolder, onOpenChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void handleCreate()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleCreate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] sm:top-[46%] p-0 gap-0 bg-[#1C1D1F] border-[#2C2C2C] shadow-2xl overflow-hidden">
        <DialogTitle className="sr-only">Create new folder</DialogTitle>

        <div className="p-6 pb-4 space-y-5">
          {/* Folder preview - macOS style */}
          <div className="flex justify-center">
            <FolderPreview color={color} />
          </div>

          {/* Name input */}
          <Input
            id="folder-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name..."
            className="text-lg font-medium bg-transparent border-none p-0 h-auto
             placeholder:text-zinc-600 focus-visible:ring-0 font-semibold text-white text-center"
            autoComplete="off"
          />

          {/* Color picker */}
          <div className="flex items-center justify-center gap-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "w-6 h-6 rounded-full transition-all duration-200 border-2",
                  color === c
                    ? "border-white scale-110 shadow-lg"
                    : "border-transparent hover:border-white/30 hover:scale-105"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 flex items-center justify-end border-t border-white/5">
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="h-8 bg-[#5E6AD3] hover:bg-[#6D78E7] text-white transition-all gap-2 text-xs
             font-medium px-3 pr-1.5 rounded-[6px] shadow-md border border-white/20 active:scale-95"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <span>Create Folder</span>
                <div className="flex items-center gap-0.5 bg-white/10 rounded px-1.5 py-0.5 ml-1 border border-white/5">
                  <Command className="w-2.5 h-2.5 text-white/90" />
                  <span className="font-sans text-[10px] font-medium text-white/90">&crarr;</span>
                </div>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
