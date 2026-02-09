'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { AppLayout } from '@/components/layout/app-layout'
import EditorSidebar from '@/components/layout/editor-sidebar'
import SidebarToggle from '@/components/layout/sidebar-toggle'
import LatexRenderer from '@/components/latex-render/latex'
import CursorEditorContainer from '@/components/editor/cursor-editor-container'
import { ChatPanel, ChatNavContent } from '@/features/agent'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { EditorTabs } from '@/components/editor/editor-tabs'
import { PDFNavContent, useLatex } from '@/components/latex-render/latex'
import { DEFAULT_EDITOR_SYNTAX_THEME, type EditorSyntaxTheme } from '@/components/editor/types'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import {
  normalizeComparablePath,
  syncPdfToSource,
  syncSourceToPdf,
  type SynctexPdfPosition,
} from '@/lib/utils/synctex-utils'

export const maxDuration = 30

export default function Home() {
  const { id } = useParams<{ id: string }>()

  return (
    <ProjectProvider projectId={id}>
      <EditorLayout />
    </ProjectProvider>
  )
}

interface PdfScrollRequest {
  mode: 'ratio' | 'synctex'
  nonce: number
  ratio?: number
  position?: SynctexPdfPosition
}

interface EditorGotoRequest {
  fileId: string
  lineNumber: number
  column: number
  nonce: number
}

function EditorLayout() {
  const [isChatVisible, setIsChatVisible] = useState(false)
  const { currentlyOpen, project, files, projectId } = useProject()
  const fileContent = currentlyOpen?.content || ''
  const isPdfCaretNavigationEnabled = project?.isPdfCaretNavigationEnabled ?? true
  const pdfScrollNonceRef = useRef(0)
  const editorGotoNonceRef = useRef(0)
  const hasMountedRef = useRef(false)
  const syncFromCodeAbortRef = useRef<AbortController | null>(null)
  const syncFromPdfAbortRef = useRef<AbortController | null>(null)
  const [editorSyntaxTheme, setEditorSyntaxTheme] = useState<EditorSyntaxTheme>(DEFAULT_EDITOR_SYNTAX_THEME)
  const [liveFileContentOverrides, setLiveFileContentOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('editor.syntaxTheme')
      if (saved === 'shiki' || saved === 'default') {
        setEditorSyntaxTheme(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    try {
      window.localStorage.setItem('editor.syntaxTheme', editorSyntaxTheme)
    } catch {}
  }, [editorSyntaxTheme])

  useEffect(() => {
    if (!Array.isArray(files) || files.length === 0) {
      setLiveFileContentOverrides({})
      return
    }

    const contentById = new Map<string, string>()
    for (const file of files) {
      if (!file?.id) continue
      contentById.set(file.id, file.content ?? '')
    }

    setLiveFileContentOverrides((prev) => {
      let changed = false
      const next: Record<string, string> = {}

      for (const [fileId, content] of Object.entries(prev)) {
        const persisted = contentById.get(fileId)
        if (persisted === undefined) {
          changed = true
          continue
        }

        if (persisted === content) {
          changed = true
          continue
        }

        next[fileId] = content
      }

      return changed ? next : prev
    })
  }, [files])

  const handleLiveFileContentChange = useCallback((fileId: string, content: string) => {
    setLiveFileContentOverrides((prev) => {
      if (prev[fileId] === content) return prev
      return { ...prev, [fileId]: content }
    })
  }, [])

  const { 
    pdfUrl, 
    isLoading, 
    error, 
    compile, 
    scale, 
    autoFetch, 
    handleZoomIn, 
    handleZoomOut, 
    handleResetZoom, 
    handleDownload,
    logs,
    synctexContext,
  } = useLatex(liveFileContentOverrides)
  
  const [showLogs, setShowLogs] = useState(false)
  const [pdfScrollRequest, setPdfScrollRequest] = useState<PdfScrollRequest | null>(null)
  const [editorGotoRequest, setEditorGotoRequest] = useState<EditorGotoRequest | null>(null)

  const fileIdMap = useRef(new Map<string, any>())

  useEffect(() => {
    const map = new Map<string, any>()
    if (Array.isArray(files)) {
      for (const file of files) {
        if (!file?.id) continue
        map.set(file.id, file)
      }
    }
    fileIdMap.current = map
  }, [files])

  useEffect(() => {
    return () => {
      syncFromCodeAbortRef.current?.abort()
      syncFromPdfAbortRef.current?.abort()
    }
  }, [])

  const resolveFilePath = useCallback((file: any): string | null => {
    if (!file?.name) return null

    const parts = [file.name]
    let current = file
    const map = fileIdMap.current

    while (current?.parent_id && map.has(current.parent_id)) {
      current = map.get(current.parent_id)
      if (!current?.name) break
      parts.unshift(current.name)
    }

    return parts.join('/')
  }, [])

  const findFileByPath = useCallback(
    (inputPath: string): any | null => {
      const normalizedTarget = normalizeComparablePath(inputPath)
      if (!normalizedTarget || !Array.isArray(files)) return null

      let basenameMatch: any | null = null
      for (const file of files) {
        if (file?.type !== 'file') continue
        const resolved = resolveFilePath(file)
        if (!resolved) continue
        const normalizedResolved = normalizeComparablePath(resolved)
        if (normalizedResolved === normalizedTarget) {
          return file
        }

        const targetBasename = normalizedTarget.split('/').pop()
        const resolvedBasename = normalizedResolved.split('/').pop()
        if (
          targetBasename &&
          resolvedBasename &&
          targetBasename === resolvedBasename
        ) {
          if (basenameMatch) {
            basenameMatch = null
            break
          }
          basenameMatch = file
        }
      }

      return basenameMatch
    },
    [files, resolveFilePath]
  )

  const handleEditorCursorClick = useCallback(
    ({
      lineNumber,
      column,
      lineCount,
      filePath,
    }: {
      lineNumber: number
      column: number
      lineCount: number
      filePath?: string
    }) => {
      if (!isPdfCaretNavigationEnabled) {
        return
      }

      const fallbackToRatio = () => {
        const safeLineCount = Math.max(1, lineCount)
        const ratio =
          safeLineCount <= 1 ? 0 : Math.min(1, Math.max(0, (lineNumber - 1) / (safeLineCount - 1)))

        pdfScrollNonceRef.current += 1
        setPdfScrollRequest({ mode: 'ratio', ratio, nonce: pdfScrollNonceRef.current })
      }

      if (!synctexContext || !filePath) {
        fallbackToRatio()
        return
      }

      syncFromCodeAbortRef.current?.abort()
      const controller = new AbortController()
      syncFromCodeAbortRef.current = controller

      void (async () => {
        try {
          const positions = await syncSourceToPdf(
            synctexContext,
            {
              file: filePath,
              line: lineNumber,
              column,
            },
            { signal: controller.signal }
          )

          if (!positions.length) {
            fallbackToRatio()
            return
          }

          pdfScrollNonceRef.current += 1
          setPdfScrollRequest({
            mode: 'synctex',
            position: positions[0],
            nonce: pdfScrollNonceRef.current,
          })
        } catch (error: any) {
          if (controller.signal.aborted || error?.name === 'AbortError') return
          console.warn('SyncTeX source->pdf sync failed, falling back to ratio scroll', error)
          fallbackToRatio()
        }
      })()
    },
    [isPdfCaretNavigationEnabled, synctexContext]
  )

  const handlePdfPointSelect = useCallback(
    ({ page, h, v }: { page: number; h: number; v: number }) => {
      if (!synctexContext) return

      syncFromPdfAbortRef.current?.abort()
      const controller = new AbortController()
      syncFromPdfAbortRef.current = controller

      void (async () => {
        try {
          const codePositions = await syncPdfToSource(
            synctexContext,
            { page, h, v },
            { signal: controller.signal }
          )

          if (!codePositions.length) return
          const target = codePositions[0]
          const file = findFileByPath(target.file)
          if (!file?.id) return

          await db.transact([
            tx.files[file.id].update({ isOpen: true }),
            tx.projects[projectId].update({ activeFileId: file.id }),
          ])

          editorGotoNonceRef.current += 1
          setEditorGotoRequest({
            fileId: file.id,
            lineNumber: Math.max(1, target.line),
            column: Math.max(1, target.column),
            nonce: editorGotoNonceRef.current,
          })
        } catch (error: any) {
          if (controller.signal.aborted || error?.name === 'AbortError') return
          console.warn('SyncTeX pdf->source sync failed', error)
        }
      })()
    },
    [synctexContext, findFileByPath, projectId]
  )

  // Header content for the editor pane
  const editorHeader = (
    <div className="flex items-center w-full h-full gap-3 overflow-hidden">
        <div className="pl-2 flex items-center">
            <SidebarToggle />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden pl-2">
           <EditorTabs />
        </div>
    </div>
  )

  // Header content for the PDF pane
  const pdfHeader = (
    <div className="flex items-center justify-between w-full h-full overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-end gap-2 pr-1">
          <PDFNavContent 
            isLoading={isLoading}
            autoFetch={autoFetch}
            scale={scale}
            projectId={currentlyOpen?.projectId || ''}
            onCompile={compile}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onDownload={handleDownload}
            onToggleLogs={() => setShowLogs(!showLogs)}
            showLogs={showLogs}
          />
        </div>
        {/* Chat controls when visible */}
        {isChatVisible && (
           <div className="flex items-center ml-2 border-l border-white/10 pl-2 shrink-0">
             <ChatNavContent onToggle={() => setIsChatVisible(false)} />
           </div>
         )}
    </div>
  )

  return (
    <AppLayout
      sidebar={<EditorSidebar syntaxTheme={editorSyntaxTheme} onSyntaxThemeChange={setEditorSyntaxTheme} />}
      header={null}
      showHeader={false}
    >
      {/* Content Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1" autoSaveId="project-editor-layout">
        <ResizablePanel defaultSize={50} minSize={25}>
          <CursorEditorContainer 
            onChatToggle={() => setIsChatVisible(!isChatVisible)}
            isChatVisible={isChatVisible}
            header={editorHeader}
            onCursorClick={handleEditorCursorClick}
            syntaxTheme={editorSyntaxTheme}
            onFileContentChange={handleLiveFileContentChange}
            gotoRequest={editorGotoRequest}
          />
        </ResizablePanel>
        <ResizableHandle className="w-2 bg-transparent flex items-center justify-center group outline-none">
          <div className="h-8 w-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-all" />
        </ResizableHandle>
        <ResizablePanel defaultSize={50} minSize={20} collapsible={true}>
          <LatexRenderer 
            pdfUrl={pdfUrl}
            isLoading={isLoading}
            error={error}
            logs={logs}
            showLogs={showLogs}
            header={pdfHeader}
            scrollRequest={pdfScrollRequest}
            onPdfPointSelect={handlePdfPointSelect}
          />
        </ResizablePanel>
        {isChatVisible && (
          <>
            <ResizableHandle className="w-2 bg-transparent flex items-center justify-center group outline-none">
              <div className="h-8 w-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-all" />
            </ResizableHandle>
            <ResizablePanel defaultSize={20} minSize={20} maxSize={45} collapsible={true}>
              <ChatPanel 
                fileContent={fileContent}
                isVisible={isChatVisible}
                onToggle={() => setIsChatVisible(false)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </AppLayout>
  )
}
