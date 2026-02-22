import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useEditorSetup } from './hooks/useEditorSetup'
import { useAIAssist } from '@/features/agent'
import { useEditorTheme } from './hooks/useEditorTheme'
import { editorDefaultOptions } from './constants/editorDefaults'
import { Loader2 } from 'lucide-react'
import { historyService } from '@/services/agent/browser/history/historyService'
import { chatApplyService } from '@/services/agent/browser/chat/chatApplyService'
import posthog from 'posthog-js'
import {
  isShikiMonacoReady,
  setupShikiMonaco,
  warmupShikiMonaco,
} from './utils/shiki-monaco'
import { useTheme } from 'next-themes'
import type { editor as MonacoEditorNamespace, IDisposable } from 'monaco-editor'
import type { JsonObject } from '@liveblocks/client'
import {
  applyMonarchTokensProvider,
  resolveEditorLanguageId,
} from './syntax/languages/registry'
import type { EditorLanguageId } from './syntax/languages/registry'
import { resolveMonacoThemeForSyntaxTheme } from './syntax/themes/catalog'
import { DEFAULT_EDITOR_SYNTAX_THEME, type EditorSyntaxTheme } from './types'
import { MonacoBinding } from 'y-monaco'
import { getYjsProviderForRoom } from '@liveblocks/yjs'
import type { Awareness as YjsAwareness } from 'y-protocols/awareness'
import {
  markRoomHydrated,
  resolveCollaborationRoomKey,
  shouldBlockInitialHydration,
} from '@/features/collaboration/editor-hydration'
import type { CollaborationRole } from '@/features/collaboration/types'
import type { CollaborationBridgeData } from './collaboration-editor-bridge'

type MonacoInstance = typeof import('monaco-editor')
type MonacoModel = MonacoEditorNamespace.ITextModel
type TokenizableMonacoModel = MonacoModel & {
  forceTokenization?: (lineNumber: number) => void
}

export interface EditorSelectionPayload {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  lineCount: number
  selectedText: string
  filePath?: string
  anchorLeftPx?: number
  anchorTopPx?: number
  anchorHeightPx?: number
  nonce: number
}

interface CodeEditorProps {
  onChange: (value: string) => void
  value: string
  setIsStreaming: (isStreaming: boolean) => void
  onCursorClick?: (payload: {
    lineNumber: number
    column: number
    lineCount: number
    filePath?: string
  }) => void
  syntaxTheme?: EditorSyntaxTheme
  fileName?: string
  filePath?: string
  onSelectionChange?: (payload: EditorSelectionPayload | null) => void
  onActionsReady?: (actions: { triggerQuickEdit: () => void }) => void
  onReady?: () => void
  gotoRequest?: {
    fileId: string
    lineNumber: number
    column: number
    nonce: number
  } | null
  collaboration?: EditorCollaborationConfig | null
  collaborationBridge?: CollaborationBridgeData | null
}

export interface EditorCollaborationConfig {
  enabled: boolean
  role: CollaborationRole
  userId: string
  userName: string
  userColor: string
  fileId: string
  filePath?: string
  shareToken?: string
  followConnectionId?: number | null
}

const EditorLoading = () => (
  <div className="flex items-center justify-center h-full w-full bg-zinc-950">
    <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
  </div>
)

function extractYjsClientIdFromPresence(presence: unknown): number | null {
  if (!presence || typeof presence !== 'object') return null
  const record = presence as Record<string, unknown>
  const candidate = record.__yjs_clientid
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return null
  return candidate
}

function sanitizeCssLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

const COLLAB_HYDRATION_TIMEOUT_MS = 6000

const noopUpdatePresence: CollaborationBridgeData['updateMyPresence'] = () => {}

export const CodeEditor = ({
  onChange,
  value,
  setIsStreaming,
  onCursorClick,
  syntaxTheme = DEFAULT_EDITOR_SYNTAX_THEME,
  fileName,
  filePath,
  onSelectionChange,
  onActionsReady,
  onReady,
  gotoRequest,
  collaboration,
  collaborationBridge,
}: CodeEditorProps) => {
  const isAiChatEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true'
  const activeLanguage = useMemo<EditorLanguageId>(
    () => resolveEditorLanguageId(fileName),
    [fileName]
  )
  const { editorRef, handleEditorDidMount } = useEditorSetup(
    onChange,
    value,
    activeLanguage
  )
  const room = collaborationBridge?.room ?? null
  const collaborationRoomKey = useMemo(
    () => resolveCollaborationRoomKey(room as { id?: string } | null),
    [room]
  )
  const updateMyPresence = collaborationBridge?.updateMyPresence ?? noopUpdatePresence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const others: any[] = (collaborationBridge?.others as any) ?? []
  const { handleAIAssist, triggerQuickEdit } = useAIAssist(onChange)
  const { setTheme } = useEditorTheme()
  const { theme, systemTheme } = useTheme()

  const monacoRef = useRef<MonacoInstance | null>(null)
  const originalSetThemeRef = useRef<((theme: string) => void) | null>(null)
  const defaultTokensDisposableRef = useRef<IDisposable | null>(null)
  const onCursorClickRef = useRef(onCursorClick)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const onActionsReadyRef = useRef(onActionsReady)
  const applySyntaxThemeRef = useRef<() => Promise<void>>(
    async () => {}
  )
  const yBindingRef = useRef<MonacoBinding | null>(null)
  const remoteSelectionStyleRef = useRef<HTMLStyleElement | null>(null)
  const presenceLastSentAtRef = useRef(0)
  const followRevealAtRef = useRef(0)
  const applySeqRef = useRef(0)
  const isMac =
    typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh')
  const isDark =
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
  const [isShikiReady, setIsShikiReady] = useState<boolean>(() =>
    isShikiMonacoReady()
  )
  const [isCollaborationHydrating, setIsCollaborationHydrating] =
    useState<boolean>(() =>
      shouldBlockInitialHydration(Boolean(collaboration?.enabled), collaborationRoomKey)
    )

  const applyDefaultSyntaxTheme = useCallback(
    (monacoInstance: MonacoInstance, model: MonacoModel) => {
      if (
        originalSetThemeRef.current &&
        monacoInstance.editor.setTheme !== originalSetThemeRef.current
      ) {
        monacoInstance.editor.setTheme = originalSetThemeRef.current
      }
      defaultTokensDisposableRef.current?.dispose()
      defaultTokensDisposableRef.current = applyMonarchTokensProvider(
        monacoInstance,
        activeLanguage
      )
      setTheme(monacoInstance)
      monacoInstance.editor.setModelLanguage(model, activeLanguage)
      ;(model as TokenizableMonacoModel).forceTokenization?.(model.getLineCount())
    },
    [activeLanguage, setTheme]
  )

  const applyShikiSyntaxTheme = useCallback(
    (monacoInstance: MonacoInstance, model: MonacoModel) => {
      monacoInstance.editor.setTheme(
        resolveMonacoThemeForSyntaxTheme('shiki', isDark)
      )
      monacoInstance.editor.setModelLanguage(model, activeLanguage)
      ;(model as TokenizableMonacoModel).forceTokenization?.(model.getLineCount())
    },
    [activeLanguage, isDark]
  )

  const applySyntaxTheme = useCallback(async () => {
    const seq = ++applySeqRef.current
    const monacoInstance = monacoRef.current
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!monacoInstance || !editor || !model) return

    if (syntaxTheme === 'shiki') {
      try {
        defaultTokensDisposableRef.current?.dispose()
        defaultTokensDisposableRef.current = null
        await setupShikiMonaco(monacoInstance)
        if (applySeqRef.current !== seq) return
        setIsShikiReady(true)
        applyShikiSyntaxTheme(monacoInstance, model)
      } catch (err) {
        console.warn('[Shiki] Theme setup failed; falling back to default:', err)
        if (applySeqRef.current !== seq) return
        applyDefaultSyntaxTheme(monacoInstance, model)
      }
      return
    }

    applyDefaultSyntaxTheme(monacoInstance, model)
  }, [applyDefaultSyntaxTheme, applyShikiSyntaxTheme, editorRef, syntaxTheme])

  useEffect(() => {
    applySyntaxThemeRef.current = applySyntaxTheme
  }, [applySyntaxTheme])

  useEffect(() => {
    if (syntaxTheme !== 'shiki') return

    void warmupShikiMonaco()
      .catch((error) => {
        console.warn('[Shiki] Warmup failed; using Monaco fallback:', error)
      })
  }, [syntaxTheme])

  useEffect(() => {
    applySyntaxTheme()
  }, [applySyntaxTheme])

  useEffect(
    () => () => {
      defaultTokensDisposableRef.current?.dispose()
      defaultTokensDisposableRef.current = null
      yBindingRef.current?.destroy()
      yBindingRef.current = null
      remoteSelectionStyleRef.current?.remove()
      remoteSelectionStyleRef.current = null
    },
    []
  )

  useEffect(() => {
    onCursorClickRef.current = onCursorClick
  }, [onCursorClick])

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  useEffect(() => {
    onActionsReadyRef.current = onActionsReady
  }, [onActionsReady])

  useEffect(() => {
    if (!collaboration?.enabled) {
      setIsCollaborationHydrating(false)
      return
    }

    setIsCollaborationHydrating(
      shouldBlockInitialHydration(true, collaborationRoomKey)
    )
  }, [collaboration?.enabled, collaborationRoomKey])

  useEffect(() => {
    if (!isAiChatEnabled) return
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    chatApplyService.bindActiveEditor({
      editor,
      monacoInstance: monaco,
      onChange,
    })
  }, [editorRef, isAiChatEnabled, onChange])

  useEffect(() => {
    if (!gotoRequest) return
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!editor || !model) return

    const maxLine = model.getLineCount()
    const lineNumber = Math.min(maxLine, Math.max(1, gotoRequest.lineNumber))
    const maxColumn = model.getLineMaxColumn(lineNumber)
    const column = Math.min(maxColumn, Math.max(1, gotoRequest.column))

    editor.setPosition({ lineNumber, column })
    editor.revealPositionInCenter({ lineNumber, column })
    editor.focus()
  }, [gotoRequest, editorRef])

  useEffect(() => {
    if (typeof document === 'undefined') return

    if (!collaboration?.enabled) {
      remoteSelectionStyleRef.current?.remove()
      remoteSelectionStyleRef.current = null
      return
    }

    const styleElement =
      remoteSelectionStyleRef.current ?? document.createElement('style')
    styleElement.setAttribute('data-collab-remote-cursors', 'true')
    if (!remoteSelectionStyleRef.current) {
      document.head.appendChild(styleElement)
      remoteSelectionStyleRef.current = styleElement
    }

    const rules: string[] = []
    for (const participant of others) {
      const yClientId = extractYjsClientIdFromPresence(participant.presence)
      if (yClientId === null) continue

      const color =
        typeof participant.info?.color === 'string' && participant.info.color.trim()
          ? participant.info.color.trim()
          : '#38BDF8'
      const name =
        typeof participant.info?.name === 'string' && participant.info.name.trim()
          ? participant.info.name.trim()
          : participant.id || `User ${participant.connectionId}`
      const safeName = sanitizeCssLabel(name)

      rules.push(`
.monaco-editor .yRemoteSelection-${yClientId} {
  background-color: ${color}33 !important;
  border-left: 1px solid ${color} !important;
}
.monaco-editor .yRemoteSelectionHead-${yClientId}::after {
  content: "${safeName}";
  position: absolute;
  top: -1.2rem;
  left: 4px;
  font-size: 10px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 999px;
  background: ${color};
  color: #0b0b0f;
  font-weight: 700;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  z-index: 41;
}
.monaco-editor .yRemoteSelectionHead-${yClientId} {
  position: relative;
  overflow: visible !important;
  border-left: 2px solid ${color} !important;
  z-index: 40;
}
      `)
    }

    styleElement.textContent = rules.join('\n')
  }, [collaboration?.enabled, others])

  useEffect(() => {
    if (!collaboration?.enabled) return
    if (!collaboration.followConnectionId) return

    const editor = editorRef.current
    const model = editor?.getModel()
    if (!editor || !model) return

    const target = others.find(
      (participant) => participant.connectionId === collaboration.followConnectionId
    )
    if (!target) return

    const presence = (target.presence ?? {}) as {
      cursor?: {
        lineNumber?: number
        column?: number
      }
      fileId?: string | null
      idle?: boolean
    }
    if (!presence.cursor) return
    if (presence.fileId && presence.fileId !== collaboration.fileId) return
    if (presence.idle) return

    const lineNumber =
      typeof presence.cursor.lineNumber === 'number' ? presence.cursor.lineNumber : 1
    const column = typeof presence.cursor.column === 'number' ? presence.cursor.column : 1

    const now = Date.now()
    if (now - followRevealAtRef.current < 120) return
    followRevealAtRef.current = now

    const safeLine = Math.min(Math.max(1, lineNumber), model.getLineCount())
    const safeColumn = Math.min(Math.max(1, column), model.getLineMaxColumn(safeLine))
    editor.revealPositionInCenter({ lineNumber: safeLine, column: safeColumn })
  }, [
    collaboration?.enabled,
    collaboration?.fileId,
    collaboration?.followConnectionId,
    editorRef,
    others,
  ])

  const editorTheme =
    syntaxTheme === 'shiki' && !isShikiReady
      ? isDark
        ? 'vs-dark'
        : 'vs'
      : resolveMonacoThemeForSyntaxTheme(syntaxTheme, isDark)

  return (
    <div className="relative h-full w-full">
      <Editor
        language={activeLanguage}
        height="100%"
        width="100%"
        value={collaboration?.enabled ? undefined : value}
        defaultValue={collaboration?.enabled ? value : undefined}
        theme={editorTheme}
        className="bg-transparent" // Let Monaco handle bg
        onMount={(editor, monaco) => {
        monacoRef.current = monaco
        if (!originalSetThemeRef.current) {
          originalSetThemeRef.current = monaco.editor.setTheme
        }
        if (isAiChatEnabled) {
          chatApplyService.bindActiveEditor({
            editor,
            monacoInstance: monaco,
            onChange,
          })
        }
        handleEditorDidMount(editor, monaco)
        if (collaboration?.enabled && room) {
          const model = editor.getModel()
          const yProvider = getYjsProviderForRoom(room)
          const yDoc = yProvider.getYDoc()
          const yText = yDoc.getText(`file:${collaboration.fileId}`)
          const shouldBlockHydration = shouldBlockInitialHydration(
            true,
            collaborationRoomKey
          )

          let disposed = false
          let didSeedFromSnapshot = false
          let didFinishHydration = false
          let hydrationTimeout: ReturnType<typeof setTimeout> | null = null

          const markCollaborationReady = (source: 'seed' | 'timeout') => {
            if (disposed || didFinishHydration) return
            didFinishHydration = true
            markRoomHydrated(collaborationRoomKey)

            if (source === 'timeout') {
              didSeedFromSnapshot = true
              posthog.capture('collab_hydration_timeout_fallback', {
                file_id: collaboration.fileId,
                room_id: collaborationRoomKey,
                provider_status: yProvider.getStatus(),
              })
            }

            if (hydrationTimeout) {
              clearTimeout(hydrationTimeout)
              hydrationTimeout = null
            }

            setIsCollaborationHydrating(false)
            editor.updateOptions({
              readOnly: collaboration.role !== 'editor',
            })
          }

          const maybeSeedFromSnapshot = () => {
            if (disposed || didSeedFromSnapshot) return
            didSeedFromSnapshot = true

            if (value && yText.length === 0) {
              yDoc.transact(() => {
                if (yText.length === 0) {
                  yText.insert(0, value)
                }
              }, 'initial-content-seed')
            }

            if (value && yText.toString() !== value) {
              posthog.capture('collab_conflict_recovery_applied', {
                file_id: collaboration.fileId,
                strategy: 'yjs_authoritative',
              })
            }

            markCollaborationReady('seed')
          }

          setIsCollaborationHydrating(shouldBlockHydration)
          editor.updateOptions({
            readOnly: shouldBlockHydration || collaboration.role !== 'editor',
          })

          if (shouldBlockHydration) {
            hydrationTimeout = setTimeout(() => {
              markCollaborationReady('timeout')
            }, COLLAB_HYDRATION_TIMEOUT_MS)
          }

          let cleanupSyncListener: (() => void) | null = null
          if (yProvider.synced || yProvider.getStatus() !== 'loading') {
            maybeSeedFromSnapshot()
          } else {
            const handleSynced = (synced: boolean) => {
              if (!synced) return
              maybeSeedFromSnapshot()
            }
            const handleStatus = () => {
              if (yProvider.getStatus() !== 'loading') {
                maybeSeedFromSnapshot()
              }
            }

            yProvider.on('synced', handleSynced)
            yProvider.on('sync', handleSynced)
            yProvider.on('status', handleStatus)
            cleanupSyncListener = () => {
              yProvider.off('synced', handleSynced)
              yProvider.off('sync', handleSynced)
              yProvider.off('status', handleStatus)
            }

            // Close the race where provider syncs between the initial status check and listener registration.
            if (yProvider.synced || yProvider.getStatus() !== 'loading') {
              maybeSeedFromSnapshot()
            }
          }

          if (model) {
            yBindingRef.current?.destroy()
            yBindingRef.current = new MonacoBinding(
              yText,
              model,
              new Set([editor]),
              yProvider.awareness as unknown as YjsAwareness
            )
          }

          const awarenessUserState: JsonObject = {
            id: collaboration.userId,
            name: collaboration.userName,
            color: collaboration.userColor,
          }
          yProvider.awareness.setLocalStateField('user', awarenessUserState)

          editor.onDidDispose(() => {
            disposed = true
            cleanupSyncListener?.()
            cleanupSyncListener = null
            if (hydrationTimeout) {
              clearTimeout(hydrationTimeout)
              hydrationTimeout = null
            }
          })
        }
        onReady?.()
        const cleanupAIAssist = handleAIAssist(editor, monaco, setIsStreaming, onChange)
        editor.onDidDispose(() => {
          if (isAiChatEnabled) {
            chatApplyService.unbindActiveEditor(editor)
          }
          yBindingRef.current?.destroy()
          yBindingRef.current = null
          if (typeof cleanupAIAssist === 'function') {
            cleanupAIAssist()
          }
          if (collaboration?.enabled) {
            updateMyPresence({
              cursor: null,
              selection: null,
              idle: true,
              lastActiveAt: Date.now(),
              fileId: collaboration.fileId,
              filePath: collaboration.filePath ?? null,
            })
          }
        })

        onActionsReadyRef.current?.({
          triggerQuickEdit: () => {
            editor.focus()
            triggerQuickEdit()
          },
        })

        // Inline chat hint on focused empty lines
        const hintNode = document.createElement('div')
        hintNode.className = 'inline-chat-hint'
        hintNode.textContent = isAiChatEnabled
          ? (isMac ? '⌘+L to chat, ⌘+K to generate' : 'Ctrl+L to chat, Ctrl+K to generate')
          : (isMac ? '⌘+K to generate' : 'Ctrl+K to generate')

        let hintPosition: { lineNumber: number; column: number } | null = null
        const hintWidget: MonacoEditorNamespace.IContentWidget = {
          getId: () => 'inline-chat-hint-widget',
          getDomNode: () => hintNode,
          getPosition: () =>
            hintPosition
              ? {
                  position: hintPosition,
                  preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
                }
              : null,
        }

        editor.addContentWidget(hintWidget)

        const updatePresence = (
          presence: Partial<{
            cursor: {
              lineNumber: number
              column: number
            } | null
            selection: {
              startLineNumber: number
              startColumn: number
              endLineNumber: number
              endColumn: number
            } | null
            idle: boolean
          }>,
          minIntervalMs = 40
        ) => {
          if (!collaboration?.enabled) return
          const now = Date.now()
          if (
            minIntervalMs > 0 &&
            now - presenceLastSentAtRef.current < minIntervalMs
          ) {
            return
          }
          presenceLastSentAtRef.current = now
          updateMyPresence({
            ...presence,
            fileId: collaboration.fileId,
            filePath: collaboration.filePath ?? null,
            lastActiveAt: now,
          })
        }

        const emitCursorPresence = () => {
          if (!collaboration?.enabled) return
          const position = editor.getPosition()
          if (!position) return
          updatePresence(
            {
              cursor: {
                lineNumber: position.lineNumber,
                column: position.column,
              },
              idle: false,
            },
            32
          )
        }

        const updateInlineChatHint = () => {
          const model = editor.getModel()
          const selection = editor.getSelection()
          if (!model || !selection || !editor.hasTextFocus()) {
            hintPosition = null
            editor.layoutContentWidget(hintWidget)
            return
          }

          if (!selection.isEmpty()) {
            hintPosition = null
            editor.layoutContentWidget(hintWidget)
            return
          }

          const lineNumber = selection.positionLineNumber
          const column = selection.positionColumn
          const lineContent = model.getLineContent(lineNumber)
          const isEmptyLine = lineContent.trim().length === 0
          hintPosition = isEmptyLine ? { lineNumber, column } : null
          editor.layoutContentWidget(hintWidget)
        }

        let selectionNonce = 0
        let selectionEmitTimeout: ReturnType<typeof setTimeout> | null = null
        let isSelectionSettled = false
        let isPointerDown = false

        const clearSelectionEmitTimeout = () => {
          if (!selectionEmitTimeout) return
          clearTimeout(selectionEmitTimeout)
          selectionEmitTimeout = null
        }

        const buildSelectionPayload = (): EditorSelectionPayload | null => {
          const model = editor.getModel()
          const selection = editor.getSelection()
          if (!model || !selection || selection.isEmpty()) return null

          const selectedText = model.getValueInRange(selection)
          if (!selectedText || selectedText.trim() === '') return null

          const startPosition = selection.getStartPosition()
          const visiblePosition = editor.getScrolledVisiblePosition(startPosition)

          selectionNonce += 1
          return {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn,
            lineCount: model.getLineCount(),
            selectedText,
            filePath,
            anchorLeftPx: visiblePosition?.left,
            anchorTopPx: visiblePosition?.top,
            anchorHeightPx: visiblePosition?.height,
            nonce: selectionNonce,
          }
        }

        const emitSelectionPayloadNow = () => {
          const selectionHandler = onSelectionChangeRef.current
          if (!selectionHandler) return

          const payload = buildSelectionPayload()
          if (!payload) {
            isSelectionSettled = false
            selectionHandler(null)
            updatePresence(
              {
                selection: null,
                idle: false,
              },
              50
            )
            return
          }

          isSelectionSettled = true
          selectionHandler(payload)
          updatePresence(
            {
              selection: {
                startLineNumber: payload.startLineNumber,
                startColumn: payload.startColumn,
                endLineNumber: payload.endLineNumber,
                endColumn: payload.endColumn,
              },
              idle: false,
            },
            50
          )
        }

        const scheduleSelectionPayload = () => {
          const selectionHandler = onSelectionChangeRef.current
          if (!selectionHandler) return

          clearSelectionEmitTimeout()
          isSelectionSettled = false
          selectionHandler(null)
          updatePresence(
            {
              selection: null,
              idle: false,
            },
            50
          )
          selectionEmitTimeout = setTimeout(() => {
            selectionEmitTimeout = null
            emitSelectionPayloadNow()
          }, 180)
        }

        const handlePointerRelease = () => {
          if (!isPointerDown) return
          isPointerDown = false
          scheduleSelectionPayload()
        }

        if (typeof window !== 'undefined') {
          window.addEventListener('mouseup', handlePointerRelease)
        }

        // Some Monaco tokenizers/themes can "snap back" after (re)focus; re-apply for stability.
        editor.onDidFocusEditorWidget(() => {
          void applySyntaxThemeRef.current()
          updateInlineChatHint()
          emitCursorPresence()
          updatePresence(
            {
              idle: false,
            },
            0
          )
        })
        editor.onDidBlurEditorWidget(() => {
          updateInlineChatHint()
          clearSelectionEmitTimeout()
          isSelectionSettled = false
          isPointerDown = false
          onSelectionChangeRef.current?.(null)
          updatePresence(
            {
              cursor: null,
              selection: null,
              idle: true,
            },
            0
          )
        })

        editor.onMouseDown((e) => {
          isPointerDown = true
          clearSelectionEmitTimeout()
          isSelectionSettled = false
          onSelectionChangeRef.current?.(null)

          const position = e.target.position
          const model = editor.getModel()
          const cursorClickHandler = onCursorClickRef.current
          if (!position || !model || !cursorClickHandler) return
          cursorClickHandler({
            lineNumber: position.lineNumber,
            column: position.column,
            lineCount: model.getLineCount(),
            filePath,
          })
          emitCursorPresence()
        })

        editor.onDidChangeCursorPosition(() => {
          updateInlineChatHint()
          emitCursorPresence()
        })
        editor.onDidChangeCursorSelection(() => {
          emitCursorPresence()
          if (isPointerDown) {
            clearSelectionEmitTimeout()
            isSelectionSettled = false
            onSelectionChangeRef.current?.(null)
            updatePresence(
              {
                selection: null,
              },
              50
            )
            return
          }
          scheduleSelectionPayload()
        })
        editor.onDidScrollChange(() => {
          if (!isSelectionSettled) return
          emitSelectionPayloadNow()
        })
        editor.onDidChangeModelContent(() => {
          updateInlineChatHint()
        })

        void applySyntaxThemeRef.current()
        updateInlineChatHint()
        emitCursorPresence()
        
        // Register undo/redo interception
        console.log('[Editor] Registering HistoryService', historyService)
        if (historyService && typeof historyService.register === 'function') {
           historyService.register(editor)
        } else {
           console.error('[Editor] historyService.register is not a function', historyService)
        }
        
        // Ensure layout updates if container changes (e.g. sidebar toggle)
        const resizeObserver = new ResizeObserver(() => {
           editor.layout();
        });
        const container = editor.getDomNode()?.parentElement;
        if (container) resizeObserver.observe(container);
        editor.onDidDispose(() => {
          clearSelectionEmitTimeout()
          if (typeof window !== 'undefined') {
            window.removeEventListener('mouseup', handlePointerRelease)
          }
        })
        }}
        options={{
          ...editorDefaultOptions,
          fontFamily: 'SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', // Premium cursor font stack
          fontSize: 13,
          lineHeight: 20,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'off',
          renderLineHighlight: 'line', // cleaner than 'all'
          readOnly: collaboration?.enabled
            ? isCollaborationHydrating || collaboration.role !== 'editor'
            : false,
          guides: {
            indentation: true,
            bracketPairs: true
          },
          minimap: {
            enabled: false // Minimalist
          }
        }}
        loading={<EditorLoading />}
      />
      {collaboration?.enabled && isCollaborationHydrating ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-zinc-950/70 backdrop-blur-[1px]">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
          <span className="text-xs text-zinc-300">Syncing collaboration...</span>
        </div>
      ) : null}
    </div>
  )
}

export default CodeEditor
