'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { CodeEditor } from './editor'
import { useTheme } from 'next-themes'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject } from '@/contexts/ProjectContext'
import { getFileExtension } from '@/lib/utils/client-utils'
import ImageViewer from './image-viewer'
import { Sparkles, MessageSquare, Command, ChevronRight, File } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Macintosh')

interface CursorEditorContainerProps {
  onChatToggle?: () => void
  isChatVisible?: boolean
}

const CursorEditorContainer: React.FC<CursorEditorContainerProps> = ({ 
  onChatToggle, 
  isChatVisible = false 
}) => {
  const { theme, systemTheme } = useTheme()
  const [localContent, setLocalContent] = useState('')
  const [openFile, setOpenFile] = useState<any>(null)
  const { currentlyOpen, isFilesLoading, isProjectLoading } = useProject()
  const [isStreaming, setIsStreaming] = useState(false)
  const isStreamingRef = useRef(false)
  const fileType = getFileExtension(currentlyOpen?.name || '')
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileType.toLowerCase())

  useEffect(() => {
    if (currentlyOpen && currentlyOpen.id !== openFile?.id) {
      setOpenFile(currentlyOpen)
      setLocalContent(currentlyOpen.content)
    }
  }, [currentlyOpen?.id])

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (newCode !== localContent && !isStreamingRef.current) {
        setLocalContent(newCode)
        db.transact([tx.files[openFile.id].update({ content: newCode })])
      }
    },
    [localContent, openFile]
  )

  const handleIsStreamingChange = useCallback((streaming: boolean) => {
    setIsStreaming(streaming)
    isStreamingRef.current = streaming
  }, [])

  // Loading State
  if (isProjectLoading || isFilesLoading) {
    return (
      <div className="flex flex-col w-full h-full bg-background animate-pulse">
        <div className="h-10 border-b border-white/5 bg-zinc-900/50" />
        <div className="flex-1 bg-background" />
      </div>
    )
  }

  return (
    <div className="relative flex flex-col w-full h-full bg-background overflow-hidden group/editor">
      {/* Editor Header / Breadcrumbs */}
      {currentlyOpen && !isImageFile && (
        <div className="h-10 flex items-center justify-between px-4 bg-background border-b border-border/40 select-none">
          <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
            <File className="w-3.5 h-3.5 opacity-70" />
            <div className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
               <span className="hover:text-foreground/90 cursor-pointer transition-colors">Project</span>
               <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
               <span className="font-medium text-foreground">{currentlyOpen.name}</span>
            </div>
            {currentlyOpen.unsaved && (
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 border border-border/50 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer group/cmd"
              onClick={() => {
                 // Trigger AI command logic if implemented
                 // This visualizes the shortcut
              }}
            >
              <Command className="h-3 w-3 group-hover/cmd:text-foreground transition-colors" />
              <span className="text-[10px] font-mono font-medium group-hover/cmd:text-foreground transition-colors">K</span>
            </div>
            
            {onChatToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onChatToggle}
                className={cn(
                  "h-7 px-2.5 gap-2 text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all",
                  isChatVisible && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                )}
              >
                <MessageSquare className={cn("h-3.5 w-3.5", isChatVisible && "fill-current")} />
                <span className="hidden sm:inline">Chat</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      {!currentlyOpen ? (
        <div className="flex-grow flex items-center justify-center bg-zinc-950/50">
           <div className="flex flex-col items-center gap-6 max-w-md w-full px-6 py-12 text-center">
             <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-xl">
               <Command className="w-8 h-8 text-zinc-700" />
             </div>
             
             <div className="space-y-1">
               <h3 className="text-lg font-medium text-zinc-200">No file is open</h3>
               <p className="text-sm text-zinc-500">
                 Press <kbd className="font-sans px-1 text-zinc-400">Cmd+P</kbd> to search for files or select one from the sidebar.
               </p>
             </div>

             <div className="grid grid-cols-2 gap-3 w-full max-w-[300px]">
                <div className="col-span-2 p-3 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-between group cursor-pointer hover:bg-white/[0.04] transition-colors">
                   <span className="text-xs text-zinc-400">Search Files</span>
                   <kbd className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">⌘P</kbd>
                </div>
                <div className="col-span-2 p-3 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-between group cursor-pointer hover:bg-white/[0.04] transition-colors">
                   <span className="text-xs text-zinc-400">AI Command</span>
                   <kbd className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">⌘K</kbd>
                </div>
             </div>
           </div>
        </div>
      ) : isImageFile ? (
        <div className="flex-grow flex items-center justify-center bg-zinc-950/30 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
          <div className="relative z-10 p-8 rounded-xl border border-white/10 bg-zinc-900/50 shadow-2xl">
            <ImageViewer src={currentlyOpen?.content || ''} alt={currentlyOpen?.name || 'Image'} />
          </div>
        </div>
      ) : (
        <div className="relative flex-grow h-full overflow-hidden">
          <CodeEditor
            onChange={handleCodeChange}
            setIsStreaming={handleIsStreamingChange}
            value={localContent}
            key={`${theme || systemTheme}-${openFile?.id}`}
          />

          {/* AI Streaming Indicator */}
          <AnimatePresence>
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-6 right-8 z-50 pointer-events-none"
              >
                <div className="flex items-center gap-3 pl-3 pr-4 py-2.5 bg-zinc-900/90 backdrop-blur-xl border border-blue-500/20 rounded-full shadow-2xl shadow-blue-900/20 ring-1 ring-blue-500/30">
                  <div className="relative flex items-center justify-center w-4 h-4">
                     <span className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                     <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                     <span className="text-[11px] font-medium text-zinc-100">AI is writing...</span>
                     <span className="text-[9px] text-zinc-500">Generating code</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default CursorEditorContainer
