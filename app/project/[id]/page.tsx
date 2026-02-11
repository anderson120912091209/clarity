'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { AppLayout } from '@/components/layout/app-layout'
import EditorSidebar from '@/components/layout/editor-sidebar'
import SidebarToggle from '@/components/layout/sidebar-toggle'
import LatexRenderer from '@/components/latex-render/latex'
import CursorEditorContainer from '@/components/editor/cursor-editor-container'
import type { EditorSelectionPayload } from '@/components/editor/editor'
import { ChatPanel, useChangeManagerState } from '@/features/agent'
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
import {
  applyAssistantInsertBlock,
  parseAssistantInsertBlocks,
  type InsertMode,
} from '@/features/agent/lib/assistant-insert'
import { editCodeService, type FileSuggestionApplyMode } from '@/services/agent/browser/editCodeService'
import { changeManagerService, type StagedFileChange } from '@/features/agent/services/change-manager'

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

interface PdfHighlightRequest {
  nonce: number
  boxes: SynctexPdfPosition[]
}

interface EditorGotoRequest {
  fileId: string
  lineNumber: number
  column: number
  nonce: number
}

interface HighlightCluster {
  page: number
  top: number
  bottom: number
  minLeft: number
  maxRight: number
}

function sampleLineNumbers(startLine: number, endLine: number, maxPoints = 24): number[] {
  const start = Math.max(1, Math.min(startLine, endLine))
  const end = Math.max(1, Math.max(startLine, endLine))
  const span = end - start + 1

  if (span <= maxPoints) {
    return Array.from({ length: span }, (_, index) => start + index)
  }

  const sampled = new Set<number>()
  const step = (span - 1) / (maxPoints - 1)
  for (let index = 0; index < maxPoints; index += 1) {
    sampled.add(Math.round(start + step * index))
  }
  sampled.add(start)
  sampled.add(end)

  return Array.from(sampled).sort((a, b) => a - b)
}

function buildSelectionHighlightBoxes(
  positions: SynctexPdfPosition[]
): SynctexPdfPosition[] {
  if (!positions.length) return []

  const byPage = new Map<number, SynctexPdfPosition[]>()
  for (const position of positions) {
    const list = byPage.get(position.page)
    if (list) {
      list.push(position)
    } else {
      byPage.set(position.page, [position])
    }
  }

  const clusters: HighlightCluster[] = []

  for (const [page, pagePositions] of byPage) {
    const sorted = pagePositions
      .slice()
      .sort((left, right) => left.v - right.v || left.h - right.h)
    if (!sorted.length) continue

    let current: HighlightCluster | null = null
    for (const position of sorted) {
      const top = position.v
      const bottom = position.v + Math.max(10, position.height)
      const left = position.h
      const right = position.h + Math.max(8, position.width)

      if (!current) {
        current = {
          page,
          top,
          bottom,
          minLeft: left,
          maxRight: right,
        }
        continue
      }

      // Merge nearby vertical boxes into one visual section highlight.
      if (top <= current.bottom + 26) {
        current.bottom = Math.max(current.bottom, bottom)
        current.minLeft = Math.min(current.minLeft, left)
        current.maxRight = Math.max(current.maxRight, right)
      } else {
        clusters.push(current)
        current = {
          page,
          top,
          bottom,
          minLeft: left,
          maxRight: right,
        }
      }
    }

    if (current) {
      clusters.push(current)
    }
  }

  return clusters
    .map((cluster) => ({
      page: cluster.page,
      h: Math.max(0, cluster.minLeft - 8),
      v: Math.max(0, cluster.top - 4),
      width: Math.max(24, cluster.maxRight - cluster.minLeft + 16),
      height: Math.max(14, cluster.bottom - cluster.top + 8),
    }))
    .sort((left, right) => left.page - right.page || left.v - right.v || left.h - right.h)
}

function EditorLayout() {
  const [isChatVisible, setIsChatVisible] = useState(false)
  const { currentlyOpen, project, files: projectFiles, projectId } = useProject()
  const { files: stagedChanges, anyStreaming: anyStagedStreaming } = useChangeManagerState()
  const isPdfNavigationEnabled = project?.isPdfCaretNavigationEnabled ?? true
  const pdfScrollNonceRef = useRef(0)
  const editorGotoNonceRef = useRef(0)
  const hasMountedRef = useRef(false)
  const syncFromCodeAbortRef = useRef<AbortController | null>(null)
  const syncFromPdfAbortRef = useRef<AbortController | null>(null)
  const syncSelectionAbortRef = useRef<AbortController | null>(null)
  const [editorSyntaxTheme, setEditorSyntaxTheme] = useState<EditorSyntaxTheme>(DEFAULT_EDITOR_SYNTAX_THEME)
  const [liveFileContentOverrides, setLiveFileContentOverrides] = useState<Record<string, string>>({})
  const fileContent = (currentlyOpen?.id ? liveFileContentOverrides[currentlyOpen.id] : undefined) ?? currentlyOpen?.content ?? ''

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
    if (!Array.isArray(projectFiles) || projectFiles.length === 0) {
      setLiveFileContentOverrides({})
      return
    }

    const contentById = new Map<string, string>()
    for (const file of projectFiles) {
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
  }, [projectFiles])

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
  const [pdfHighlightRequest, setPdfHighlightRequest] = useState<PdfHighlightRequest | null>(null)
  const [editorGotoRequest, setEditorGotoRequest] = useState<EditorGotoRequest | null>(null)

  const fileIdMap = useRef(new Map<string, any>())

  useEffect(() => {
    const map = new Map<string, any>()
    if (Array.isArray(projectFiles)) {
      for (const file of projectFiles) {
        if (!file?.id) continue
        map.set(file.id, file)
      }
    }
    fileIdMap.current = map
  }, [projectFiles])

  useEffect(() => {
    return () => {
      syncFromCodeAbortRef.current?.abort()
      syncFromPdfAbortRef.current?.abort()
      syncSelectionAbortRef.current?.abort()
      changeManagerService.clear()
    }
  }, [])

  useEffect(() => {
    if (isPdfNavigationEnabled) return
    syncFromCodeAbortRef.current?.abort()
    syncFromPdfAbortRef.current?.abort()
    syncSelectionAbortRef.current?.abort()
    setPdfScrollRequest(null)
    setPdfHighlightRequest(null)
  }, [isPdfNavigationEnabled])

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
      if (!normalizedTarget || !Array.isArray(projectFiles)) return null

      let basenameMatch: any | null = null
      for (const file of projectFiles) {
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
    [projectFiles, resolveFilePath]
  )

  const handleInsertAssistantContent = useCallback(
    (messageContent: string) => {
      const trimmed = messageContent.trim()
      if (!trimmed) return

      const parsedBlocks = parseAssistantInsertBlocks(trimmed)
      const blocksToApply =
        parsedBlocks.length > 0
          ? parsedBlocks
          : [
              {
                code: trimmed,
                insertMode: 'append' as InsertMode,
              },
            ]

      type PendingStageEntry = {
        file: any
        originalContent: string
        proposedContent: string
        focusLine: number
        diffs: StagedFileChange['diffs']
        summary: StagedFileChange['summary']
      }

      const stagedByFileId = new Map<string, PendingStageEntry>()
      let primaryTarget: { fileId: string; focusLine: number } | null = null

      for (const block of blocksToApply) {
        if (
          parsedBlocks.length > 0 &&
          block.insertMode === 'append' &&
          !block.hasExplicitInsertMode &&
          !block.anchorText &&
          !block.line
        ) {
          console.warn(
            '[AI Chat Apply] No explicit insert metadata detected for a code block. Skipping ambiguous append to avoid placing code at file bottom.'
          )
          continue
        }

        const explicitTargetPath = block.filePath?.trim()
        const targetFile = explicitTargetPath
          ? findFileByPath(explicitTargetPath)
          : currentlyOpen

        if (!targetFile?.id) {
          console.warn(
            explicitTargetPath
              ? `[AI Chat Insert] Unable to resolve target file "${explicitTargetPath}".`
              : '[AI Chat Insert] No active file available for insertion.'
          )
          continue
        }

        const baseContent =
          stagedByFileId.get(targetFile.id)?.proposedContent ??
          liveFileContentOverrides[targetFile.id] ??
          targetFile.content ??
          ''

        const isEditMode =
          block.insertMode === 'replace_file' || block.insertMode === 'search_replace'

        const { nextContent, focusLine } = isEditMode
          ? (() => {
              const editMode: FileSuggestionApplyMode =
                block.insertMode === 'search_replace' ? 'search_replace' : 'replace_file'
              const result = editCodeService.applySuggestionToFile(
                baseContent,
                block.code,
                editMode
              )

              if (result.warnings.length > 0) {
                console.warn(
                  `[AI Chat Apply] ${targetFile.name}: ${result.warnings.join(' ')}`
                )
              }

              console.info(
                `[AI Chat Apply] ${targetFile.name}: mode=${result.mode}, changedBlocks=${result.summary.totalChangedBlocks}, insertions=${result.summary.insertions}, deletions=${result.summary.deletions}, edits=${result.summary.edits}`
              )

              return {
                nextContent: result.nextContent,
                focusLine: result.firstChangedLine,
              }
            })()
          : applyAssistantInsertBlock(baseContent, block)

        if (nextContent === baseContent) continue

        const stageResult = editCodeService.applySuggestionToFile(
          baseContent,
          nextContent,
          'replace_file'
        )

        if (!stageResult.changed) continue

        stagedByFileId.set(targetFile.id, {
          file: targetFile,
          originalContent: baseContent,
          proposedContent: stageResult.nextContent,
          focusLine: stageResult.firstChangedLine || focusLine,
          diffs: stageResult.diffs,
          summary: stageResult.summary,
        })

        if (!primaryTarget) {
          primaryTarget = {
            fileId: targetFile.id,
            focusLine: stageResult.firstChangedLine || focusLine,
          }
        }
      }

      if (!stagedByFileId.size) return

      const stagedPayload: Array<Omit<StagedFileChange, 'updatedAt'>> = []
      stagedByFileId.forEach((entry, fileId) => {
        let isPreviewApplied = false
        if (fileId === currentlyOpen?.id) {
          const preview = editCodeService.previewSuggestionInActiveEditor(
            entry.proposedContent,
            'replace_file',
            { suppressPersistence: true }
          )
          if (preview?.appliedInEditor) {
            isPreviewApplied = true
            entry.focusLine = preview.firstChangedLine
            console.info(
              `[AI Chat Apply Preview] ${entry.file.name}: changedBlocks=${preview.summary.totalChangedBlocks}, insertions=${preview.summary.insertions}, deletions=${preview.summary.deletions}, edits=${preview.summary.edits}`
            )
          }
        }

        stagedPayload.push({
          fileId,
          fileName: entry.file.name ?? 'untitled',
          filePath: resolveFilePath(entry.file) ?? entry.file.name ?? 'untitled',
          originalContent: entry.originalContent,
          proposedContent: entry.proposedContent,
          diffs: entry.diffs,
          summary: entry.summary,
          firstChangedLine: entry.focusLine,
          isStreaming: false,
          isPreviewApplied,
        })
      })

      changeManagerService.stageChanges(stagedPayload)

      if (primaryTarget) {
        changeManagerService.setActiveFile(primaryTarget.fileId)
      }

      console.info(
        `[AI Chat Stage] Staged ${blocksToApply.length} block(s) across ${stagedByFileId.size} file(s).`
      )

      if (primaryTarget && primaryTarget.fileId === currentlyOpen?.id) {
        editorGotoNonceRef.current += 1
        setEditorGotoRequest({
          fileId: primaryTarget.fileId,
          lineNumber: Math.max(1, primaryTarget.focusLine),
          column: 1,
          nonce: editorGotoNonceRef.current,
        })
      }
    },
    [
      currentlyOpen,
      findFileByPath,
      liveFileContentOverrides,
      resolveFilePath,
    ]
  )

  const applyStagedEntries = useCallback(
    async (entries: StagedFileChange[]) => {
      if (!entries.length) return

      const operations = entries.map((entry) =>
        tx.files[entry.fileId].update({ content: entry.proposedContent })
      )

      try {
        await db.transact(operations)
      } catch (error) {
        console.warn('Failed to apply staged assistant changes:', error)
        return
      }

      for (const entry of entries) {
        handleLiveFileContentChange(entry.fileId, entry.proposedContent)
        if (entry.fileId === currentlyOpen?.id) {
          editCodeService.clearActiveInlinePreview()
        }
        changeManagerService.removeChange(entry.fileId)
      }
    },
    [currentlyOpen?.id, handleLiveFileContentChange]
  )

  const rejectStagedEntries = useCallback(
    async (entries: StagedFileChange[]) => {
      if (!entries.length) return

      const operations = entries.map((entry) =>
        tx.files[entry.fileId].update({ content: entry.originalContent })
      )

      try {
        await db.transact(operations)
      } catch (error) {
        console.warn('Failed to reject staged assistant changes:', error)
      }

      for (const entry of entries) {
        if (entry.fileId === currentlyOpen?.id) {
          editCodeService.replaceActiveEditorContent(entry.originalContent, {
            suppressPersistence: true,
          })
          editCodeService.clearActiveInlinePreview()
        }

        handleLiveFileContentChange(entry.fileId, entry.originalContent)
        changeManagerService.removeChange(entry.fileId)
      }
    },
    [currentlyOpen?.id, handleLiveFileContentChange]
  )

  const handleAcceptStagedFile = useCallback(
    async (fileId: string) => {
      const entry = changeManagerService.getChange(fileId)
      if (!entry) return
      await applyStagedEntries([entry])
    },
    [applyStagedEntries]
  )

  const handleRejectStagedFile = useCallback(
    async (fileId: string) => {
      const entry = changeManagerService.getChange(fileId)
      if (!entry) return
      await rejectStagedEntries([entry])
    },
    [rejectStagedEntries]
  )

  const handleAcceptAllStaged = useCallback(async () => {
    const entries = changeManagerService.getAllChanges()
    await applyStagedEntries(entries)
  }, [applyStagedEntries])

  const handleRejectAllStaged = useCallback(async () => {
    const entries = changeManagerService.getAllChanges()
    await rejectStagedEntries(entries)
  }, [rejectStagedEntries])

  const handleJumpToStagedFile = useCallback(
    async (fileId: string) => {
      const entry = changeManagerService.getChange(fileId)
      const file = fileIdMap.current.get(fileId)
      if (!entry || !file) return

      try {
        await db.transact([
          tx.files[fileId].update({ isOpen: true }),
          tx.projects[projectId].update({ activeFileId: fileId }),
        ])
      } catch (error) {
        console.warn('Failed to open staged file:', error)
      }

      changeManagerService.setActiveFile(fileId)

      editorGotoNonceRef.current += 1
      setEditorGotoRequest({
        fileId,
        lineNumber: Math.max(1, entry.firstChangedLine),
        column: 1,
        nonce: editorGotoNonceRef.current,
      })

      window.setTimeout(() => {
        const preview = editCodeService.previewSuggestionInActiveEditor(
          entry.proposedContent,
          'replace_file',
          { suppressPersistence: true }
        )
        if (!preview?.appliedInEditor) return
        changeManagerService.updateChange(fileId, {
          isPreviewApplied: true,
          firstChangedLine: preview.firstChangedLine,
          diffs: preview.diffs,
          summary: preview.summary,
        })
      }, 0)
    },
    [projectId]
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
      if (!isPdfNavigationEnabled) {
        return
      }

      const fallbackToRatio = () => {
        const safeLineCount = Math.max(1, lineCount)
        const ratio =
          safeLineCount <= 1 ? 0 : Math.min(1, Math.max(0, (lineNumber - 1) / (safeLineCount - 1)))

        pdfScrollNonceRef.current += 1
        setPdfScrollRequest({ mode: 'ratio', ratio, nonce: pdfScrollNonceRef.current })
        setPdfHighlightRequest(null)
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
          setPdfHighlightRequest(null)
        } catch (error: any) {
          if (controller.signal.aborted || error?.name === 'AbortError') return
          console.warn('SyncTeX source->pdf sync failed, falling back to ratio scroll', error)
          fallbackToRatio()
        }
      })()
    },
    [isPdfNavigationEnabled, synctexContext]
  )

  const handleFindSelectionInPdf = useCallback(
    (selection: EditorSelectionPayload) => {
      if (!isPdfNavigationEnabled) return

      const fallbackToRatio = () => {
        const safeLineCount = Math.max(1, selection.lineCount)
        const focusLine = Math.round((selection.startLineNumber + selection.endLineNumber) / 2)
        const ratio =
          safeLineCount <= 1 ? 0 : Math.min(1, Math.max(0, (focusLine - 1) / (safeLineCount - 1)))

        pdfScrollNonceRef.current += 1
        setPdfScrollRequest({ mode: 'ratio', ratio, nonce: pdfScrollNonceRef.current })
        setPdfHighlightRequest(null)
      }

      if (!synctexContext || !selection.filePath) {
        fallbackToRatio()
        return
      }

      syncSelectionAbortRef.current?.abort()
      const controller = new AbortController()
      syncSelectionAbortRef.current = controller

      void (async () => {
        try {
          const targetLines = sampleLineNumbers(selection.startLineNumber, selection.endLineNumber, 30)
          const settled = await Promise.allSettled(
            targetLines.map((lineNumber) =>
              syncSourceToPdf(
                synctexContext,
                {
                  file: selection.filePath!,
                  line: lineNumber,
                  column: lineNumber === selection.startLineNumber ? selection.startColumn : 1,
                },
                { signal: controller.signal }
              )
            )
          )

          if (controller.signal.aborted) return

          const positions = settled.flatMap((result) =>
            result.status === 'fulfilled' ? result.value : []
          )

          if (!positions.length) {
            fallbackToRatio()
            return
          }

          const ordered = positions
            .slice()
            .sort((left, right) => left.page - right.page || left.v - right.v || left.h - right.h)
          const highlightBoxes = buildSelectionHighlightBoxes(ordered)

          pdfScrollNonceRef.current += 1
          setPdfScrollRequest({
            mode: 'synctex',
            position: ordered[0],
            nonce: pdfScrollNonceRef.current,
          })
          setPdfHighlightRequest({
            nonce: pdfScrollNonceRef.current,
            boxes: (highlightBoxes.length ? highlightBoxes : ordered).slice(0, 80),
          })
        } catch (error: any) {
          if (controller.signal.aborted || error?.name === 'AbortError') return
          console.warn('SyncTeX selection->pdf sync failed, falling back to ratio scroll', error)
          fallbackToRatio()
        }
      })()
    },
    [isPdfNavigationEnabled, synctexContext]
  )

  const handlePdfPointSelect = useCallback(
    ({ page, h, v }: { page: number; h: number; v: number }) => {
      if (!isPdfNavigationEnabled) return
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
    [isPdfNavigationEnabled, synctexContext, findFileByPath, projectId]
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
            onChatToggle={() => setIsChatVisible((prev) => !prev)}
            isChatVisible={isChatVisible}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onDownload={handleDownload}
            onToggleLogs={() => setShowLogs(!showLogs)}
            showLogs={showLogs}
          />
        </div>
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
            onFindSelectionInPdf={handleFindSelectionInPdf}
            isPdfNavigationEnabled={isPdfNavigationEnabled}
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
            highlightRequest={pdfHighlightRequest}
            onPdfPointSelect={handlePdfPointSelect}
            isPdfNavigationEnabled={isPdfNavigationEnabled}
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
                activeFileName={currentlyOpen?.name}
                onInsertIntoEditor={handleInsertAssistantContent}
                stagedChanges={stagedChanges}
                anyStagedStreaming={anyStagedStreaming}
                onJumpToStagedFile={handleJumpToStagedFile}
                onAcceptStagedFile={handleAcceptStagedFile}
                onRejectStagedFile={handleRejectStagedFile}
                onAcceptAllStaged={handleAcceptAllStaged}
                onRejectAllStaged={handleRejectAllStaged}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </AppLayout>
  )
}
