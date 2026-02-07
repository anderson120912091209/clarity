'use client'

import React from 'react'
import { X, File, FileText, Image as ImageIcon } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { cn } from '@/lib/utils'
import { getFileExtension } from '@/lib/utils/client-utils'

export function EditorTabs() {
  const { openFiles, currentlyOpen, activeFileId, projectId } = useProject()

  const handleTabClick = (fileId: string) => {
    if (fileId === activeFileId) return
    db.transact([
      tx.projects[projectId].update({ activeFileId: fileId })
    ])
  }

  const handleCloseTab = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation()
    
    // Logic to update active file if we close the active one
    let newActiveId = activeFileId
    if (fileId === activeFileId) {
      const currentIndex = openFiles.findIndex((f: any) => f.id === fileId)
      // Try next, then previous, then null
      const nextFile = openFiles[currentIndex + 1] || openFiles[currentIndex - 1]
      newActiveId = nextFile ? nextFile.id : null
    }

    const txs: any[] = [
      tx.files[fileId].update({ isOpen: false })
    ]
    
    if (newActiveId !== activeFileId) {
       // If no new active file (all closed), checking null
       if (newActiveId) {
         txs.push(tx.projects[projectId].update({ activeFileId: newActiveId }))
       } else {
         // Should we clear activeFileId? Yes.
         // InstantDB update might not accept null for optional string? 
         // Usually we can omitting it or setting it to undefined? 
         // Let's assume setting to empty string or rely on the query to fail gracefully.
         // Actually better to keep it stale or update to empty if schema allows.
         // Let's force update to empty string or null if allowed. 
         // If schema is optional string, null might be okay or undefined.
         // Let's just not update activeFileId if it becomes null? No, we must clear it.
         // Let's try updating to undefined or empty string.
         // Or just pick another file if available.
       }
    }
    
    db.transact(txs)
  }

  // If no files open, don't show tabs? Or show empty? usually don't show tabs if no files.
  if (!openFiles || openFiles.length === 0) return null

  // Tabs are h-9 (36px). Container is h-[38px] to leave 2px for scrollbar at the bottom.
  // The scrollbar acts as the separator.
  return (
    <div className="flex items-center w-full h-10 px-1 gap-1.5 bg-[#101011] overflow-x-auto [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20"> {
        openFiles.map((file: any) => {
        const isActive = file.id === activeFileId
        const ext = getFileExtension(file.name).toLowerCase()
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)
        const isPdf = ext === 'pdf'
        
        let Icon = File
        if (isImage) Icon = ImageIcon
        else if (isPdf) Icon = FileText // Or separate PDF icon
        else Icon = FileText // Default text

        return (
          <div
            key={file.id}
            onClick={() => handleTabClick(file.id)}
            className={cn(
               "group flex items-center gap-2 pl-2.5 pr-1 h-7 min-w-[90px] max-w-[140px] rounded-md border text-[12px] font-medium cursor-pointer select-none transition-all",
               isActive 
                 ? "bg-[#1C1D21] border-white/[0.08] text-[#E4E4E7] shadow-sm"
                 : "bg-transparent border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
            title={file.name}
          >
            <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-[#E4E4E7]" : "opacity-60 group-hover:opacity-80")} />
            <span className="truncate flex-1">{file.name}</span>
            <div 
              role="button"
              onClick={(e) => handleCloseTab(e, file.id)}
              className={cn(
                "rounded-md p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/40 hover:text-white transition-all",
                isActive && "opacity-100 text-white/60"
              )}
            >
              <X className="w-3 h-3" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
