import { EditorTabs } from './editor-tabs'
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { CodeEditor } from './editor'
import { useTheme } from 'next-themes'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject } from '@/contexts/ProjectContext'
import { getFileExtension } from '@/lib/utils/client-utils'
import ImageViewer from './image-viewer'
import { Command, ChevronRight, File } from 'lucide-react'
import type { EditorSyntaxTheme } from '@/components/editor/types'

const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Macintosh')

interface CursorEditorContainerProps {
  onChatToggle?: () => void
  isChatVisible?: boolean
  header?: React.ReactNode
  onCursorClick?: (payload: {
    lineNumber: number
    column: number
    lineCount: number
    filePath?: string
  }) => void
  syntaxTheme?: EditorSyntaxTheme
  onFileContentChange?: (fileId: string, content: string) => void
  gotoRequest?: {
    fileId: string
    lineNumber: number
    column: number
    nonce: number
  } | null
}

const CursorEditorContainer: React.FC<CursorEditorContainerProps> = ({ 
  onChatToggle, 
  isChatVisible = false,
  header,
  onCursorClick,
  syntaxTheme,
  onFileContentChange,
  gotoRequest
}) => {
  const { theme, systemTheme } = useTheme()
  const [localContent, setLocalContent] = useState('')
  const [openFile, setOpenFile] = useState<any>(null)
  const { currentlyOpen, isFilesLoading, isProjectLoading, files } = useProject()
  const isStreamingRef = useRef(false)
  const localContentRef = useRef('')
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPersistRef = useRef<{ fileId: string; content: string } | null>(null)
  const isPersistingRef = useRef(false)
  
  const fileType = getFileExtension(currentlyOpen?.name || '')
  const ext = fileType.toLowerCase()
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)
  const isPdfFile = ext === 'pdf'

  const openFilePath = useMemo(() => {
    if (!openFile?.name) return undefined
    if (!Array.isArray(files) || files.length === 0) return openFile.name

    const fileMap = new Map<string, any>()
    for (const file of files) {
      if (!file?.id) continue
      fileMap.set(file.id, file)
    }

    const parts = [openFile.name]
    let current = openFile
    while (current?.parent_id && fileMap.has(current.parent_id)) {
      current = fileMap.get(current.parent_id)
      if (!current?.name) break
      parts.unshift(current.name)
    }

    return parts.join('/')
  }, [files, openFile])

  const activeGotoRequest = useMemo(() => {
    if (!gotoRequest || !openFile?.id) return null
    return gotoRequest.fileId === openFile.id ? gotoRequest : null
  }, [gotoRequest, openFile?.id])

  const flushPendingPersist = useCallback(async () => {
    if (isPersistingRef.current) return

    const pending = pendingPersistRef.current
    if (!pending) return

    pendingPersistRef.current = null
    isPersistingRef.current = true

    try {
      await db.transact([tx.files[pending.fileId].update({ content: pending.content })])
    } catch (error) {
      console.error('Failed to persist editor content:', error)
    } finally {
      isPersistingRef.current = false
      if (pendingPersistRef.current) {
        void flushPendingPersist()
      }
    }
  }, [])

  const schedulePersist = useCallback(
    (fileId: string, content: string) => {
      pendingPersistRef.current = { fileId, content }

      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }

      persistTimeoutRef.current = setTimeout(() => {
        persistTimeoutRef.current = null
        void flushPendingPersist()
      }, 180)
    },
    [flushPendingPersist]
  )

  useEffect(() => {
    localContentRef.current = localContent
  }, [localContent])

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }
      void flushPendingPersist()
    }
  }, [flushPendingPersist])

  // ... useEffect for content updates ...
  useEffect(() => {
    if (currentlyOpen && currentlyOpen.id !== openFile?.id) {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
        persistTimeoutRef.current = null
      }
      void flushPendingPersist()
      setOpenFile(currentlyOpen)
      const initialContent = currentlyOpen.content ?? ''
      setLocalContent(initialContent)
      localContentRef.current = initialContent
    }
  }, [currentlyOpen?.id, currentlyOpen?.content, openFile?.id, flushPendingPersist])

  const handleCodeChange = useCallback(
    (newCode: string) => {
      // Only update if it's a text file (not image/pdf)
      if (isImageFile || isPdfFile || isStreamingRef.current || !openFile) return
      if (newCode === localContentRef.current) return

      localContentRef.current = newCode
      setLocalContent(newCode)
      onFileContentChange?.(openFile.id, newCode)
      schedulePersist(openFile.id, newCode)
    },
    [openFile, isImageFile, isPdfFile, onFileContentChange, schedulePersist]
  )
  
  // ... other handlers ...
  const handleIsStreamingChange = useCallback((streaming: boolean) => {
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
              fileName={openFile?.name}
              filePath={openFilePath}
              gotoRequest={activeGotoRequest}
              key={`${theme || systemTheme}-${openFile?.id}`}
            />
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
