import { EditorTabs } from './editor-tabs'
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
import type { EditorSyntaxTheme } from '@/components/editor/types'

const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Macintosh')

interface CursorEditorContainerProps {
  onChatToggle?: () => void
  isChatVisible?: boolean
  header?: React.ReactNode
  onCursorClick?: (payload: { lineNumber: number; column: number; lineCount: number }) => void
  syntaxTheme?: EditorSyntaxTheme
}

const CursorEditorContainer: React.FC<CursorEditorContainerProps> = ({ 
  onChatToggle, 
  isChatVisible = false,
  header,
  onCursorClick,
  syntaxTheme
}) => {
  const { theme, systemTheme } = useTheme()
  const [localContent, setLocalContent] = useState('')
  const [openFile, setOpenFile] = useState<any>(null)
  const { currentlyOpen, isFilesLoading, isProjectLoading } = useProject()
  const [isStreaming, setIsStreaming] = useState(false)
  const isStreamingRef = useRef(false)
  
  const fileType = getFileExtension(currentlyOpen?.name || '')
  const ext = fileType.toLowerCase()
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)
  const isPdfFile = ext === 'pdf'

  // ... useEffect for content updates ...
  useEffect(() => {
    if (currentlyOpen && currentlyOpen.id !== openFile?.id) {
      setOpenFile(currentlyOpen)
      setLocalContent(currentlyOpen.content)
    }
  }, [currentlyOpen?.id, currentlyOpen?.content]) // Added content dep for safety

  const handleCodeChange = useCallback(
    (newCode: string) => {
      // Only update if it's a text file (not image/pdf)
      if (!isImageFile && !isPdfFile && newCode !== localContent && !isStreamingRef.current && openFile) {
        setLocalContent(newCode)
        db.transact([tx.files[openFile.id].update({ content: newCode })])
      }
    },
    [localContent, openFile, isImageFile, isPdfFile]
  )
  
  // ... other handlers ...
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
      {/* Split Header, The left Side Panel Header  */}
      {header && (
        <div className="flex items-center justify-between shrink-0 bg-[#101011]">
          {header}
        </div>
      )}

      {/* Editor Content Area */}
      {!currentlyOpen ? (
        <div className="flex-grow flex items-center justify-center bg-zinc-950/50">
           {/* ... Empty State ... */}
           <div className="flex flex-col items-center gap-6 max-w-md w-full px-6 py-12 text-center">
             <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-xl">
               <Command className="w-8 h-8 text-zinc-700" />
             </div>
             <div className="space-y-1">
               <h3 className="text-lg font-medium text-zinc-200">No file is open</h3>
               <p className="text-sm text-zinc-500">
                 Select a file from the sidebar to start editing.
               </p>
             </div>
           </div>
        </div>
      ) : isImageFile ? (
        <div className="flex-grow flex items-center justify-center bg-zinc-950/30 relative h-[calc(100%-36px)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
          <div className="relative z-10 p-8 flex items-center justify-center h-full w-full">
             {/* Use existing ImageViewer or simple img tag logic from previous step, assuming prop compatibility */}
             {currentlyOpen.url ? (
                <img 
                  src={currentlyOpen.url} 
                  alt={currentlyOpen.name} 
                  className="max-w-full max-h-full object-contain shadow-2xl border border-white/10 rounded-lg"
                />
             ) : (
                <div className="text-red-400">Image URL not found</div>
             )}
          </div>
        </div>
      ) : isPdfFile ? (
        <div className="flex-grow h-[calc(100%-36px)] bg-zinc-800">
          {currentlyOpen.url ? (
            <iframe 
              src={currentlyOpen.url} 
              className="w-full h-full border-0"
              title={currentlyOpen.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-400">PDF URL not found</div>
          )}
        </div>
      ) : (
        <div className="relative flex-grow h-full overflow-hidden">
          <CodeEditor
            onChange={handleCodeChange}
            setIsStreaming={handleIsStreamingChange}
            value={localContent}
            onCursorClick={onCursorClick}
            syntaxTheme={syntaxTheme}
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

export function EditorNavContent({ 
  currentlyOpen, 
  onChatToggle, 
  isChatVisible 
}: { 
  currentlyOpen: any
  onChatToggle?: () => void
  isChatVisible?: boolean 
}) {
  const fileType = getFileExtension(currentlyOpen?.name || '')
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileType.toLowerCase())
  
  if (!currentlyOpen || isImageFile) return null
  
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground/80 flex-1 min-w-0">
        <File className="w-3.5 h-3.5 opacity-70 shrink-0" />
        <div className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity min-w-0">
           <span className="hover:text-foreground/90 cursor-pointer transition-colors shrink-0">Project</span>
           <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
           <span className="font-medium text-foreground truncate">{currentlyOpen.name}</span>
        </div>
        {currentlyOpen.unsaved && (
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 shrink-0" />
        )}
      </div>
      

    </>
  )
}

export default CursorEditorContainer
