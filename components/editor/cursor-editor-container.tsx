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
import { Sparkles, MessageSquare, Command } from 'lucide-react'
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

  if (isProjectLoading || isFilesLoading) {
    return (
      <div className="flex flex-col w-full h-full bg-background">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="flex-grow" />
      </div>
    )
  }

  return (
    <div className="relative flex flex-col w-full h-full bg-background overflow-hidden">
      {/* Editor Toolbar */}
      {currentlyOpen && !isImageFile && (
        <div className="h-8 flex items-center justify-between px-3 bg-[hsl(var(--muted)/0.2)] border-b border-border/50">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium">{currentlyOpen.name}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="uppercase">{fileType || 'text'}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-muted-foreground bg-background/50 border border-border/50">
              <Command className="h-3 w-3" />
              <kbd className="text-[10px] font-mono">K</kbd>
              <span className="text-[10px]">AI</span>
            </div>
            
            {onChatToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onChatToggle}
                className={cn(
                  "h-6 px-2 gap-1.5 text-[11px] rounded transition-all",
                  isChatVisible && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                )}
              >
                <MessageSquare className={cn("h-3.5 w-3.5", isChatVisible && "fill-blue-500/20")} />
                <span>Chat</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editor Content */}
      {!currentlyOpen ? (
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-muted-foreground text-sm">No file open</div>
            <div className="text-xs text-muted-foreground/60">Select a file from the sidebar to start editing</div>
          </div>
        </div>
      ) : isImageFile ? (
        <div className="flex-grow flex items-center justify-center bg-background">
          <div
            className="relative w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          >
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

          <AnimatePresence>
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute bottom-4 right-4 z-50 pointer-events-none"
              >
                <div className="flex items-center gap-2.5 px-3 py-2 bg-background/95 backdrop-blur-md border border-blue-500/30 rounded-lg shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-sm opacity-40 animate-pulse" />
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 relative" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground">AI is writing...</span>
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

