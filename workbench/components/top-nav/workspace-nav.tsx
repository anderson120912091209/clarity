'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface WorkspaceNavProps {
  editorSection?: React.ReactNode
  pdfSection?: React.ReactNode
  chatSection?: React.ReactNode
  isChatVisible?: boolean
}

export function WorkspaceNav({ 
  editorSection, 
  pdfSection, 
  chatSection,
  isChatVisible = false 
}: WorkspaceNavProps) {
  return (
    <div className="h-10 flex items-center bg-zinc-900/50 border-b border-white/5 select-none shrink-0">
      {/* Editor Section */}
      {editorSection && (
        <div className="flex-1 flex items-center px-4 min-w-0">
          {editorSection}
        </div>
      )}
      
      {/* Separator */}
      {editorSection && pdfSection && (
        <div className="h-6 w-px bg-zinc-800/80" />
      )}
      
      {/* PDF Section */}
      {pdfSection && (
        <div className="flex-1 flex items-center px-3 min-w-0">
          {pdfSection}
        </div>
      )}
      
      {/* Separator */}
      {pdfSection && chatSection && isChatVisible && (
        <div className="h-6 w-px bg-zinc-800/80" />
      )}
      
      {/* Chat Section */}
      {chatSection && isChatVisible && (
        <div className="flex items-center px-4 min-w-0">
          {chatSection}
        </div>
      )}
    </div>
  )
}
