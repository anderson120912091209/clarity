'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { CodeEditor } from './editor'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject } from '@/contexts/ProjectContext'
import { getFileExtension } from '@/lib/utils/client-utils';
import ImageViewer from './image-viewer'
import { MousePointer2, Sparkles, MessageSquare } from 'lucide-react'
import { Command } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatSidebar } from './chat-sidebar'
import { cn } from '@/lib/utils'


const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Macintosh');

const EditorContainer = () => {
  const { theme, systemTheme } = useTheme()
  const [localContent, setLocalContent] = useState('')
  const [openFile, setOpenFile] = useState<any>(null)
  const { currentlyOpen, isFilesLoading, isProjectLoading } = useProject();
  const [isStreaming,setIsStreaming] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isStreamingRef = useRef(false);
  const fileType = getFileExtension(currentlyOpen?.name || '');
  

  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileType.toLowerCase());

  useEffect(() => {
    if (currentlyOpen && currentlyOpen.id !== openFile?.id) {
      setOpenFile(currentlyOpen)
      setLocalContent(currentlyOpen.content)
    }
  }, [currentlyOpen?.id])
  
  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (newCode !== localContent && !isStreamingRef.current) {
        setLocalContent(newCode);
        db.transact([tx.files[openFile.id].update({ content: newCode })]);
      }
    },
    [localContent, openFile]
  )

  const handleIsStreamingChange = useCallback((streaming: boolean) => {
    setIsStreaming(streaming);
    isStreamingRef.current = streaming;
  }, []);

  if (isProjectLoading || isFilesLoading) {
    return (
      <div className="flex flex-col w-full h-full">
        <div className="flex justify-end items-center border-b shadow-sm p-2">
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="flex-grow" />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      <div className="flex justify-end w-full items-center border-b shadow-sm p-2 bg-background/50 backdrop-blur-sm z-10 gap-x-2">
        <div className="flex items-center border space-x-2 px-3 h-9 rounded-md text-sm text-muted-foreground bg-background/50">
          <span>Select and</span>
          {isMac ? (
            <>
              <Command className="h-4 w-4" />
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background/50 border rounded">K</kbd>
            </>
          ) : (
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background border rounded">Ctrl+K</kbd>
          )}
          <span>for AI Autocomplete</span>
        </div>
        
        <div className="h-4 w-[1px] bg-border mx-1" />
        
        <Button 
          variant={isChatOpen ? "secondary" : "ghost"} 
          size="sm" 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn(
            "h-9 px-3 gap-2 rounded-md transition-all",
            isChatOpen && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
          )}
        >
          <MessageSquare className={cn("h-4 w-4", isChatOpen && "fill-blue-500/20")} />
          <span className="text-xs font-medium">AI Chat</span>
        </Button>
      </div>

      {!currentlyOpen ? (
        <div className="flex-grow flex items-center justify-center text-muted-foreground">
          No file open
        </div>
      ) : isImageFile ? (
        <div className="flex-grow flex items-center justify-center bg-background">
          <div className="relative w-full h-full" style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}>
            <ImageViewer
              src={currentlyOpen?.content || ''}
              alt={currentlyOpen?.name || 'Image'}
            />
          </div>
        </div>
      ) : (
        <div className="relative flex-grow h-full flex overflow-hidden">
          <div className={cn(
            "flex-grow h-full transition-all duration-300",
            isChatOpen ? "mr-[400px]" : "mr-0"
          )}>
            <CodeEditor onChange={handleCodeChange} setIsStreaming={handleIsStreamingChange} value={localContent} key={`${theme || systemTheme}-${openFile?.id}`} />
          </div>

          <ChatSidebar 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
            fileContent={localContent}
          />
          
          <AnimatePresence>
            {isStreaming && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute bottom-6 right-6 z-50 pointer-events-none"
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-background/80 backdrop-blur-md border border-blue-500/30 rounded-full shadow-2xl shadow-blue-500/20 ring-1 ring-blue-500/20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-sm opacity-50 animate-pulse" />
                    <Sparkles className="h-4 w-4 text-blue-500 relative animate-spin-slow" />
                  </div>
                  <span className="text-[12px] font-semibold text-foreground/80 tracking-tight">AI is crafting your code...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default EditorContainer
