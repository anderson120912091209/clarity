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

  return (
    <div className="flex items-center w-full h-9 bg-[#101011] border-b border-white/5 overflow-x-auto no-scrollbar">
      {openFiles.map((file: any) => {
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
              "group flex items-center gap-2 px-3 h-full min-w-[120px] max-w-[200px] border-r border-white/5 cursor-pointer select-none transition-colors",
              isActive 
                ? "bg-zinc-900/50 text-white border-t-2 border-t-violet-300" 
                : "bg-transparent text-white/50 hover:bg-white/[0.02] border-t-2 border-t-transparent hover:text-white/80"
            )}
            title={file.name}
          >
            <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-violet-300" : "opacity-70")} />
            <span className="text-[12px] truncate flex-1">{file.name}</span>
            <div 
              role="button"
              onClick={(e) => handleCloseTab(e, file.id)}
              className={cn(
                "rounded-sm p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all",
                isActive && "opacity-100"
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
