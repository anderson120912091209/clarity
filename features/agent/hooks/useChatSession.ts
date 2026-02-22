import { id as instantId } from '@instantdb/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '@/lib/constants'
import { useChatThreadsState } from './useChatThreadsState'
import { useStreamingState } from './useStreamingState'
import {
  computeNextSeq,
  createRun,
  createThread,
  finishRun,
  setProjectActiveThread,
  upsertThreadMessage,
  archiveThread,
  type PersistedMessage,
} from '@/features/agent/services/chat-threads-store'
import {
  buildMemorySystemMessage,
  markMemoryItemsUsed,
  selectPromptMemories,
  sortMemoryItems,
  upsertMemoryCandidates,
  type PersistedMemoryItem,
} from '@/features/agent/services/chat-memory-store'
import { extractMemoryCandidatesFromUserMessage } from '@/features/agent/services/memory-extractor'
import {
  chatService,
  type ChatMessage,
  type FileEditDelta,
} from '@/services/agent/browser/chat/chatService'
import { parseRawResponse } from '@/features/agent/services/response-parser'
import { buildAgentRunIntro } from '@/lib/agent/chat-run-intro'
import { changeManagerService, type StagedFileChange } from '@/features/agent/services/change-manager'
import type {
  AgentChatContext,
  AgentWorkspaceFileContext,
} from '@/features/agent/types/chat-context'

// ── Local Types ──

export interface ChatPanelExternalPromptRequest {
  id: string
  prompt: string
  autoApplyStagedEdits?: boolean
}

export interface ExternalPromptResult {
  requestId: string
  status: 'completed' | 'interrupted' | 'error' | 'skipped'
  assistantMessageId: string | null
}

interface ToolCallInfo {
  toolCallId: string
  toolName: string
  status: 'running' | 'completed' | 'failed'
  detail?: string
}

export interface PanelMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  isStreaming?: boolean
  isError?: boolean
  toolCalls?: ToolCallInfo[]
  fileEdits?: FileEditDelta[]
}

interface MessageTrace {
  toolCalls: ToolCallInfo[]
  fileEdits: FileEditDelta[]
}

interface SendPromptOptions {
  autoApplyStagedEdits?: boolean
}

interface SendPromptResult {
  status: 'completed' | 'interrupted' | 'error' | 'skipped'
  assistantMessageId: string | null
}

// ── Constants ──

const MAX_ACTIVE_FILE_CHARS = 36000
const MAX_WORKSPACE_FILE_CHARS = 80000
const MAX_WORKSPACE_TOTAL_CHARS = 900000
const MAX_COMPILE_LOG_CHARS = 24000
const AUTO_APPLY_POLL_TIMEOUT_MS = 2200
const AUTO_APPLY_POLL_INTERVAL_MS = 120

// ── Utility functions ──

function trimWithNotice(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}\n\n[Truncated]`
}

function buildThreadTitle(prompt: string): string {
  const singleLine = prompt.trim().replace(/\s+/g, ' ')
  if (!singleLine) return 'New chat'
  if (singleLine.length <= 48) return singleLine
  return `${singleLine.slice(0, 45)}...`
}

function normalizePath(input: string): string {
  return input
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
    .trim()
    .toLowerCase()
}

function extractThinkBlocks(text: string): { thinking: string; cleaned: string } {
  const thinkPattern = /<think>([\s\S]*?)<\/think>/g
  const blocks: string[] = []
  let cleaned = text
  let match: RegExpExecArray | null
  thinkPattern.lastIndex = 0
  while ((match = thinkPattern.exec(text)) !== null) {
    const inner = match[1].trim()
    if (inner) blocks.push(inner)
  }
  if (blocks.length > 0) {
    cleaned = text.replace(thinkPattern, '').replace(/\n{3,}/g, '\n\n').trim()
  }
  return { thinking: blocks.join('\n\n'), cleaned }
}

function getToolFailureDetail(
  toolName: string,
  result: Record<string, unknown>
): string | null {
  if (toolName === 'apply_file_edit') {
    if (result.applied === false) {
      if (typeof result.error === 'string' && result.error.trim()) return result.error.trim()
      return 'Edit rejected by tool validation.'
    }
    return null
  }

  if (toolName === 'read_workspace_file') {
    if (result.found === false) {
      if (typeof result.message === 'string' && result.message.trim()) return result.message.trim()
      return 'File not found in workspace snapshot.'
    }
    return null
  }

  if (result.ok === false || result.success === false) {
    if (typeof result.error === 'string' && result.error.trim()) return result.error.trim()
    if (typeof result.message === 'string' && result.message.trim()) return result.message.trim()
    return 'Tool execution reported failure.'
  }

  if (typeof result.toolError === 'string' && result.toolError.trim()) {
    return result.toolError.trim()
  }

  return null
}

// ── Hook Options ──

export interface UseChatSessionOptions {
  projectId: string
  userId: string
  initialActiveThreadId?: string | null
  activeFileId?: string
  activeFileName?: string
  activeFilePath?: string
  fileContent?: string
  workspaceFiles?: AgentWorkspaceFileContext[]
  compileLogs?: string | null
  compileError?: string | null
  selectedModel: string
  includeCurrentDocument: boolean
  attachedFileIds?: string[]
  libraryEnabled: boolean
  onInsertIntoEditor?: (
    content: string,
    options?: {
      auto?: boolean
      sourceMessageId?: string
      skipEditorFocus?: boolean
    }
  ) => void | Promise<void>
  stagedChanges?: StagedFileChange[]
  anyStagedStreaming?: boolean
  onAcceptStagedFile?: (fileId: string) => void | Promise<void>
  externalPromptRequest?: ChatPanelExternalPromptRequest | null
  onExternalPromptConsumed?: (requestId: string) => void
  onExternalPromptSettled?: (result: ExternalPromptResult) => void
}

// ── Hook ──

export function useChatSession(opts: UseChatSessionOptions) {
  const {
    projectId,
    userId,
    initialActiveThreadId = null,
    activeFileId,
    activeFileName,
    activeFilePath,
    fileContent,
    workspaceFiles = [],
    compileLogs = null,
    compileError = null,
    selectedModel,
    includeCurrentDocument,
    attachedFileIds = [],
    libraryEnabled,
    onInsertIntoEditor,
    stagedChanges = [],
    anyStagedStreaming = false,
    onAcceptStagedFile,
    externalPromptRequest = null,
    onExternalPromptConsumed,
    onExternalPromptSettled,
  } = opts

  // ── Core state ──

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialActiveThreadId)
  const [liveAssistantMessage, setLiveAssistantMessage] = useState<PanelMessage | null>(null)
  const [messageTraceById, setMessageTraceById] = useState<Record<string, MessageTrace>>({})

  const streamingState = useStreamingState()

  // ── Refs ──

  const activeRequestIdRef = useRef<string | null>(null)
  const activeRunIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const manualStopRef = useRef(false)
  const persistedActiveThreadRef = useRef<string | null>(null)
  const consumedExternalPromptIdRef = useRef<string | null>(null)

  // ── Thread & Message queries ──

  const {
    threads: rawThreads,
    messages: persistedMessages,
    isLoading: isThreadsLoading,
    error: threadsQueryError,
  } = useChatThreadsState({
    projectId,
    userId,
    activeThreadId,
  })

  // ── Memory queries ──

  const memoryQuery = db.useQuery(
    userId
      ? {
          ai_memory_items: {
            $: {
              where: {
                user_id: userId,
              },
            },
          },
        }
      : null
  )

  const persistedMemoryItems = useMemo(
    () => sortMemoryItems((memoryQuery.data?.ai_memory_items ?? []) as PersistedMemoryItem[]),
    [memoryQuery.data?.ai_memory_items]
  )

  const promptMemoryItems = useMemo(
    () =>
      selectPromptMemories(persistedMemoryItems, {
        projectId,
        threadId: activeThreadId,
      }),
    [activeThreadId, persistedMemoryItems, projectId]
  )

  const memorySystemMessage = useMemo(
    () => buildMemorySystemMessage(promptMemoryItems),
    [promptMemoryItems]
  )

  // ── Derived thread data ──

  const threads = useMemo(
    () =>
      rawThreads.map((thread) => ({
        id: thread.id,
        title: thread.title?.trim() || 'Untitled chat',
        lastModified: thread.lastMessageAt
          ? new Date(thread.lastMessageAt).getTime()
          : thread.updated_at
            ? new Date(thread.updated_at).getTime()
            : thread.created_at
              ? new Date(thread.created_at).getTime()
              : 0,
        lastMessagePreview: thread.lastMessagePreview,
        lastMessageAt: thread.lastMessageAt,
      })),
    [rawThreads]
  )

  const activeThread = useMemo(
    () => rawThreads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, rawThreads]
  )

  // ── Thread auto-selection ──

  useEffect(() => {
    if (!rawThreads.length) return
    if (activeThreadId && rawThreads.some((thread) => thread.id === activeThreadId)) return

    const preferredThread =
      initialActiveThreadId && rawThreads.some((thread) => thread.id === initialActiveThreadId)
        ? initialActiveThreadId
        : null

    const nextThreadId = preferredThread ?? rawThreads[0]?.id ?? null
    if (nextThreadId && nextThreadId !== activeThreadId) {
      setActiveThreadId(nextThreadId)
    }
  }, [activeThreadId, initialActiveThreadId, rawThreads])

  // ── Persist active thread ──

  useEffect(() => {
    if (!activeThreadId || !projectId) return
    if (persistedActiveThreadRef.current === activeThreadId) return

    persistedActiveThreadRef.current = activeThreadId
    void setProjectActiveThread(projectId, activeThreadId).catch((error) => {
      console.warn('Failed to persist active chat thread:', error)
    })
  }, [activeThreadId, projectId])

  // ── Reset on thread switch ──

  useEffect(() => {
    setSubmitError(null)
    setLiveAssistantMessage(null)
    setMessageTraceById({})
    streamingState.reset()
  }, [activeThreadId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Staged changes workspace mapping ──

  const workspaceFileIdByPath = useMemo(() => {
    const map = new Map<string, string>()
    for (const file of workspaceFiles) {
      if (!file?.fileId || !file.path) continue
      map.set(normalizePath(file.path), file.fileId)
    }
    return map
  }, [workspaceFiles])

  const resolveStagedFileIdsForMessage = useCallback(
    (messageId: string, editedPaths: string[]): string[] => {
      const linkedFromProps = stagedChanges
        .filter((change) => change.sourceMessageId === messageId)
        .map((change) => change.fileId)
      if (linkedFromProps.length > 0) {
        return Array.from(new Set(linkedFromProps))
      }

      const linkedFromStore = changeManagerService
        .getAllChanges()
        .filter((change) => change.sourceMessageId === messageId)
        .map((change) => change.fileId)
      if (linkedFromStore.length > 0) {
        return Array.from(new Set(linkedFromStore))
      }

      const matchedByPath = editedPaths
        .map((path) => workspaceFileIdByPath.get(normalizePath(path)))
        .filter((fileId): fileId is string => Boolean(fileId))
      if (matchedByPath.length === 0) return []

      return matchedByPath.filter((fileId, index) => {
        if (matchedByPath.indexOf(fileId) !== index) return false
        const stagedEntry =
          stagedChanges.find((change) => change.fileId === fileId) ??
          changeManagerService.getChange(fileId)
        return stagedEntry?.sourceMessageId === messageId
      })
    },
    [stagedChanges, workspaceFileIdByPath]
  )

  const autoApplyLinkedToolEdits = useCallback(
    async (assistantMessageId: string, editedPaths: string[]) => {
      if (!onAcceptStagedFile) return
      if (editedPaths.length === 0) return

      const deadline = Date.now() + AUTO_APPLY_POLL_TIMEOUT_MS
      let fileIds: string[] = []
      while (Date.now() < deadline) {
        fileIds = resolveStagedFileIdsForMessage(assistantMessageId, editedPaths)
        if (fileIds.length > 0) break
        await new Promise((resolve) => setTimeout(resolve, AUTO_APPLY_POLL_INTERVAL_MS))
      }

      if (fileIds.length === 0) {
        console.warn(
          `[AI Chat] Auto-apply requested for message ${assistantMessageId}, but no linked staged files were found.`
        )
        return
      }

      for (const fileId of fileIds) {
        try {
          await onAcceptStagedFile(fileId)
        } catch (error) {
          console.warn(`[AI Chat] Failed to auto-apply staged change for ${fileId}:`, error)
        }
      }
    },
    [onAcceptStagedFile, resolveStagedFileIdsForMessage]
  )

  // ── Build request context ──

  const currentDocumentContext = useMemo(() => {
    if (!includeCurrentDocument || !fileContent) return ''
    const normalized = fileContent.trim()
    if (!normalized) return ''
    return trimWithNotice(normalized, MAX_ACTIVE_FILE_CHARS)
  }, [fileContent, includeCurrentDocument])

  const requestContext = useMemo<AgentChatContext>(() => {
    let remainingWorkspaceBudget = MAX_WORKSPACE_TOTAL_CHARS
    const normalizedWorkspaceFiles: AgentWorkspaceFileContext[] = []
    const activePathNormalized = activeFilePath ? normalizePath(activeFilePath) : null
    const compileHintText = `${compileError ?? ''}\n${compileLogs ?? ''}`.toLowerCase()
    const compileReferencedPaths = Array.from(
      new Set(
        (
          compileHintText.match(
            /[a-z0-9_./-]+\.(?:tex|typ|sty|cls|bib|bst|md|json|yml|yaml|toml|ts|tsx|js|jsx|py|rs|go|java|c|cpp|h)/g
          ) ?? []
        ).map((match) => normalizePath(match))
      )
    )

    const prioritizedWorkspaceFiles = workspaceFiles
      .filter(
        (file): file is AgentWorkspaceFileContext =>
          Boolean(file?.path && typeof file.content === 'string')
      )
      .map((file) => {
        const normalizedPath = normalizePath(file.path)
        const isActiveFile = activePathNormalized ? normalizedPath === activePathNormalized : false
        const isCompileReferenced = compileReferencedPaths.some(
          (compilePath) =>
            normalizedPath === compilePath ||
            normalizedPath.endsWith(`/${compilePath}`) ||
            compilePath.endsWith(`/${normalizedPath}`)
        )
        const isTexFamily = /\.(tex|typ|sty|cls|bib|bst)$/i.test(file.path)
        const isAttached = attachedFileIds.includes(file.fileId)
        const priorityScore =
          (isActiveFile ? 120 : 0) +
          (isAttached ? 110 : 0) +
          (isCompileReferenced ? 90 : 0) +
          (isTexFamily ? 40 : 0)

        return { file, priorityScore }
      })
      .sort((left, right) => {
        if (right.priorityScore !== left.priorityScore) {
          return right.priorityScore - left.priorityScore
        }
        return left.file.path.localeCompare(right.file.path)
      })

    for (const { file } of prioritizedWorkspaceFiles) {
      if (remainingWorkspaceBudget <= 0) break

      const trimmed = trimWithNotice(
        file.content,
        Math.min(MAX_WORKSPACE_FILE_CHARS, remainingWorkspaceBudget)
      )
      normalizedWorkspaceFiles.push({
        fileId: file.fileId,
        path: file.path,
        content: trimmed,
      })
      remainingWorkspaceBudget -= trimmed.length
    }

    return {
      userId,
      activeFileId: activeFileId ?? null,
      activeFileName: activeFileName ?? null,
      activeFilePath: activeFilePath ?? null,
      activeFileContent: currentDocumentContext,
      workspaceFiles: normalizedWorkspaceFiles,
      compile: {
        logs:
          compileLogs && compileLogs.trim().length > 0
            ? trimWithNotice(compileLogs.trim(), MAX_COMPILE_LOG_CHARS)
            : null,
        error: compileError ?? null,
      },
      settings: {
        includeCurrentDocument,
        webEnabled: false,
        libraryEnabled,
      },
    }
  }, [
    activeFileId,
    activeFileName,
    activeFilePath,
    attachedFileIds,
    compileError,
    compileLogs,
    currentDocumentContext,
    libraryEnabled,
    includeCurrentDocument,
    userId,
    workspaceFiles,
  ])

  // ── Combined messages ──

  const messages = useMemo<PanelMessage[]>(() => {
    const persisted = persistedMessages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        id: message.id,
        role: message.role as 'user' | 'assistant',
        content: message.content ?? '',
        thinking: undefined as string | undefined,
        isStreaming: false,
        isError: message.status === 'error',
        toolCalls: messageTraceById[message.id]?.toolCalls,
        fileEdits: messageTraceById[message.id]?.fileEdits,
      }))

    if (!liveAssistantMessage) return persisted
    if (persisted.some((message) => message.id === liveAssistantMessage.id)) return persisted

    return [...persisted, liveAssistantMessage]
  }, [liveAssistantMessage, messageTraceById, persistedMessages])

  // ── Error message ──

  const threadsErrorMessage = threadsQueryError
    ? 'Failed to load saved chats.'
    : memoryQuery.error
      ? 'Failed to load persistent memory.'
      : null

  // ── Cleanup on unmount ──

  useEffect(() => {
    return () => {
      if (activeRequestIdRef.current) {
        chatService.abort(activeRequestIdRef.current)
      }
      abortControllerRef.current?.abort()
      activeRequestIdRef.current = null
      activeRunIdRef.current = null
      abortControllerRef.current = null
    }
  }, [])

  // ── Core actions ──

  const stopStreaming = useCallback(() => {
    manualStopRef.current = true
    if (activeRequestIdRef.current) {
      chatService.abort(activeRequestIdRef.current)
      activeRequestIdRef.current = null
    }
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    streamingState.dispatch({ type: 'ABORT' })
  }, [streamingState])

  const ensureActiveThread = useCallback(
    async (titleSeed?: string) => {
      if (activeThreadId) return activeThreadId

      const nextThreadId = await createThread({
        projectId,
        userId,
        title: titleSeed ? buildThreadTitle(titleSeed) : 'New chat',
      })

      setActiveThreadId(nextThreadId)
      return nextThreadId
    },
    [activeThreadId, projectId, userId]
  )

  const createNewChat = useCallback(async () => {
    stopStreaming()
    setSubmitError(null)
    setIsSubmitting(false)
    setLiveAssistantMessage(null)
    streamingState.reset()
    const nextThreadId = await createThread({
      projectId,
      userId,
      title: 'New chat',
    })
    setActiveThreadId(nextThreadId)
  }, [projectId, stopStreaming, streamingState, userId])

  const switchThread = useCallback(
    (threadId: string) => {
      stopStreaming()
      setSubmitError(null)
      setLiveAssistantMessage(null)
      setActiveThreadId(threadId)
    },
    [stopStreaming]
  )

  const deleteThread = useCallback(
    (threadId: string) => {
      void archiveThread(threadId).catch((error) => {
        console.warn('Failed to archive thread:', error)
      })
      if (activeThreadId === threadId) {
        const nextThread = rawThreads.find((t) => t.id !== threadId)
        if (nextThread) {
          setActiveThreadId(nextThread.id)
        } else {
          setActiveThreadId(null)
        }
      }
    },
    [activeThreadId, rawThreads]
  )

  // ── Send prompt (core streaming loop) ──

  const sendPrompt = useCallback(
    async (prompt: string, options: SendPromptOptions = {}): Promise<SendPromptResult> => {
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt || isSubmitting) {
        return {
          status: 'skipped',
          assistantMessageId: null,
        }
      }

      const threadId = await ensureActiveThread(trimmedPrompt)

      const conversationHistory: ChatMessage[] = persistedMessages
        .filter(
          (message) =>
            (message.role === 'user' || message.role === 'assistant') &&
            (message.content?.trim().length ?? 0) > 0
        )
        .map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content ?? '',
        }))

      const requestMessages: ChatMessage[] = [
        ...(memorySystemMessage
          ? [
              {
                role: 'user',
                content: `Context from prior interactions:\n${memorySystemMessage}`,
              } as ChatMessage,
            ]
          : []),
        ...conversationHistory,
        { role: 'user', content: trimmedPrompt },
      ]

      const baseSeq = computeNextSeq(persistedMessages as Array<Pick<PersistedMessage, 'seq'>>)
      const assistantMessageId = instantId()
      const controller = new AbortController()
      const initialRunIntro = buildAgentRunIntro({
        prompt: trimmedPrompt,
        compileError: requestContext.compile?.error,
      })
      const initialAssistantContent = initialRunIntro ? `${initialRunIntro}\n\n` : ''

      let runId: string | null = null
      let streamedResponse = initialAssistantContent
      const collectedFileEdits: FileEditDelta[] = []
      const collectedToolCalls = new Map<string, ToolCallInfo>()
      let collectedThinking = ''
      let completionStatus: SendPromptResult['status'] = 'completed'
      let editChainPromise: Promise<void> = Promise.resolve()

      const userMessageId = await upsertThreadMessage({
        threadId,
        projectId,
        userId,
        role: 'user',
        content: trimmedPrompt,
        seq: baseSeq,
        status: 'completed',
      })

      if (promptMemoryItems.length > 0) {
        void markMemoryItemsUsed(promptMemoryItems.map((item) => item.id)).catch((error) => {
          console.warn('Failed to update memory usage timestamps:', error)
        })
      }

      const memoryCandidates = extractMemoryCandidatesFromUserMessage(trimmedPrompt)
      if (memoryCandidates.length > 0) {
        void upsertMemoryCandidates({
          userId,
          projectId,
          threadId,
          sourceMessageId: userMessageId,
          existing: persistedMemoryItems,
          candidates: memoryCandidates,
        }).catch((error) => {
          console.warn('Failed to persist extracted memory items:', error)
        })
      }

      setSubmitError(null)
      setIsSubmitting(true)
      manualStopRef.current = false
      abortControllerRef.current = controller
      streamingState.reset()
      streamingState.dispatch({ type: 'START_GENERATION' })

      setLiveAssistantMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: initialAssistantContent,
        isStreaming: true,
      })

      try {
        const { output, requestId } = await chatService.generate({
          messages: requestMessages,
          stream: true,
          abortSignal: controller.signal,
          model: selectedModel,
          context: requestContext,
        })

        activeRequestIdRef.current = requestId
        runId = await createRun({
          threadId,
          messageId: assistantMessageId,
          userId,
          requestId,
          model: selectedModel,
        })
        activeRunIdRef.current = runId

        for await (const delta of output) {
          if (delta.error) throw new Error(delta.error)
          if (delta.done) break

          if (delta.content) {
            streamedResponse += delta.content
            streamingState.dispatch({ type: 'TEXT_DELTA', content: delta.content })
            setLiveAssistantMessage((prev) =>
              prev && prev.id === assistantMessageId
                ? { ...prev, content: streamedResponse, isStreaming: true }
                : prev
            )
          }

          if (delta.thinking) {
            collectedThinking += delta.thinking
            streamingState.dispatch({ type: 'THINKING_DELTA', content: delta.thinking })
            setLiveAssistantMessage((prev) =>
              prev && prev.id === assistantMessageId
                ? { ...prev, thinking: collectedThinking, isStreaming: true }
                : prev
            )
          }

          if (delta.toolCall) {
            const tc = delta.toolCall
            collectedToolCalls.set(tc.toolCallId, {
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              status: 'running',
            })
            streamingState.dispatch({
              type: 'TOOL_CALL_START',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
            })
            setLiveAssistantMessage((prev) => {
              if (!prev || prev.id !== assistantMessageId) return prev
              const existing = prev.toolCalls ?? []
              const alreadyTracked = existing.some((t) => t.toolCallId === tc.toolCallId)
              if (alreadyTracked) return prev
              return {
                ...prev,
                toolCalls: [
                  ...existing,
                  { toolCallId: tc.toolCallId, toolName: tc.toolName, status: 'running' as const },
                ],
              }
            })
          }

          if (delta.toolResult) {
            const toolName = delta.toolResult.toolName
            const existingTool = collectedToolCalls.get(delta.toolResult.toolCallId)
            const failureDetail = getToolFailureDetail(toolName, delta.toolResult.result)
            const toolFailed = Boolean(failureDetail)
            collectedToolCalls.set(delta.toolResult.toolCallId, {
              toolCallId: delta.toolResult.toolCallId,
              toolName: toolName || existingTool?.toolName || 'tool',
              status: toolFailed ? 'failed' : 'completed',
              detail: failureDetail ?? undefined,
            })
            streamingState.dispatch({
              type: 'TOOL_CALL_RESULT',
              toolCallId: delta.toolResult.toolCallId,
              success: !toolFailed,
            })
            setLiveAssistantMessage((prev) => {
              if (!prev || prev.id !== assistantMessageId) return prev
              const updated = (prev.toolCalls ?? []).map((t) =>
                t.toolCallId === delta.toolResult!.toolCallId
                  ? {
                      ...t,
                      status: toolFailed ? ('failed' as const) : ('completed' as const),
                      detail: failureDetail ?? t.detail,
                    }
                  : t
              )
              const toolCalls =
                updated.length > 0
                  ? updated
                  : [
                      {
                        toolCallId: delta.toolResult!.toolCallId,
                        toolName: toolName || 'tool',
                        status: toolFailed ? ('failed' as const) : ('completed' as const),
                        detail: failureDetail ?? undefined,
                      },
                    ]
              return { ...prev, toolCalls }
            })
          }

          if (delta.fileEdit) {
            const edit = delta.fileEdit
            collectedFileEdits.push(edit)
            streamingState.dispatch({
              type: 'FILE_EDIT_APPLIED',
              filePath: edit.filePath,
              editType: edit.editType,
            })

            setLiveAssistantMessage((prev) => {
              if (!prev || prev.id !== assistantMessageId) return prev
              return { ...prev, fileEdits: [...collectedFileEdits] }
            })

            if (onInsertIntoEditor) {
              // Queue edits sequentially — wait for previous edit to complete
              // before starting the next one to prevent race conditions that
              // cause diff previews to flicker and disappear.
              editChainPromise = editChainPromise.then(async () => {
                try {
                  await onInsertIntoEditor(JSON.stringify(edit), {
                    auto: true,
                    sourceMessageId: assistantMessageId,
                    skipEditorFocus: true,
                  })
                } catch (error) {
                  console.warn('[AI Chat] Failed to stage streamed tool edit:', error)
                }
              })
            }
          }

          if (delta.stepMetadata) {
            streamingState.dispatch({
              type: 'STEP_COMPLETE',
              finishReason: delta.stepMetadata.finishReason,
            })
          }
        }

        // Wait for all queued file edits to finish before finalizing
        await editChainPromise

        streamingState.dispatch({ type: 'GENERATION_COMPLETE' })

        const { thinking: extractedThinking, cleaned: cleanedResponse } =
          extractThinkBlocks(streamedResponse)
        const allThinking = [collectedThinking, extractedThinking].filter(Boolean).join('\n\n')

        const parsed = parseRawResponse(cleanedResponse)
        const toolCallsList = Array.from(collectedToolCalls.values())
        const noTextResponse =
          parsed.displayText.trim().length === 0 && cleanedResponse.trim().length === 0
        const toolOnlySummary = noTextResponse
          ? (() => {
              if (collectedFileEdits.length > 0) {
                const fileList = Array.from(
                  new Set(collectedFileEdits.map((edit) => edit.filePath))
                )
                const descriptions = collectedFileEdits
                  .map((edit) => edit.description)
                  .filter((d) => d && d.trim() && !d.startsWith('Edit '))
                if (descriptions.length > 0) {
                  return `${descriptions.join('. ')}. Review the changes above and accept when you're ready.`
                }
                return fileList.length === 1
                  ? `Made changes to **${fileList[0]}** — review above and accept when you're ready.`
                  : `Made changes to ${fileList.length} files — review above and accept when you're ready.`
              }
              if (toolCallsList.length > 0) {
                return 'Done! Check the activity section above for details.'
              }
              return 'No response received from model stream. Try again or switch model.'
            })()
          : null

        const finalContent =
          parsed.displayText.trim().length > 0
            ? parsed.displayText
            : cleanedResponse.trim().length > 0
              ? cleanedResponse
              : toolOnlySummary ?? 'No response received.'
        const generatedEditSummary =
          collectedFileEdits.length > 0
            ? (() => {
                const uniqueFiles = Array.from(
                  new Set(collectedFileEdits.map((edit) => edit.filePath))
                )
                const descriptions = collectedFileEdits
                  .map((edit) => edit.description)
                  .filter((d) => d && d.trim() && !d.startsWith('Edit '))
                const descriptionText =
                  descriptions.length > 0
                    ? descriptions.map((d) => `- ${d}`).join('\n')
                    : null
                const fileText =
                  uniqueFiles.length === 1
                    ? `Updated **${uniqueFiles[0]}**`
                    : `Updated ${uniqueFiles.length} files: ${uniqueFiles.map((f) => `**${f}**`).join(', ')}`
                return descriptionText
                  ? `${fileText}\n${descriptionText}\n\nReview the changes above and hit accept when you're ready.`
                  : `${fileText} — review the changes above and hit accept when you're ready.`
              })()
            : ''
        const finalContentWithSummary =
          generatedEditSummary && !finalContent.includes('Updated **')
            ? `${finalContent.trim()}\n\n${generatedEditSummary}`
            : finalContent

        if (parsed.fileEdits.length > 0 && onInsertIntoEditor) {
          for (const edit of parsed.fileEdits) {
            collectedFileEdits.push(edit)
            try {
              await onInsertIntoEditor(JSON.stringify(edit), {
                auto: true,
                sourceMessageId: assistantMessageId,
                skipEditorFocus: true,
              })
            } catch (error) {
              console.warn('[AI Chat] Failed to stage parsed file edit:', error)
            }
          }
        }

        await upsertThreadMessage({
          messageId: assistantMessageId,
          threadId,
          projectId,
          userId,
          role: 'assistant',
          content: finalContentWithSummary,
          seq: baseSeq + 1,
          status: 'completed',
          sourceMessageId: assistantMessageId,
        })

        if (runId) {
          await finishRun(runId, 'completed')
        }

        setMessageTraceById((prev) => ({
          ...prev,
          [assistantMessageId]: {
            toolCalls: toolCallsList,
            fileEdits: [...collectedFileEdits],
          },
        }))

        if (options.autoApplyStagedEdits) {
          const editedPaths = collectedFileEdits.map((edit) => edit.filePath)
          await autoApplyLinkedToolEdits(assistantMessageId, editedPaths)
        }
      } catch (error) {
        const aborted = manualStopRef.current || controller.signal.aborted
        completionStatus = aborted ? 'interrupted' : 'error'
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to stream chat response.'
        const fallbackContent =
          streamedResponse.trim().length > 0
            ? streamedResponse
            : aborted
              ? 'Generation stopped.'
              : 'Failed to generate a response. Please try again.'

        if (aborted) {
          streamingState.dispatch({ type: 'ABORT' })
        } else {
          streamingState.dispatch({ type: 'ERROR', message: errorMessage, recoverable: false })
        }

        await upsertThreadMessage({
          messageId: assistantMessageId,
          threadId,
          projectId,
          userId,
          role: 'assistant',
          content: fallbackContent,
          seq: baseSeq + 1,
          status: aborted ? 'interrupted' : 'error',
          error: aborted ? '' : errorMessage,
          sourceMessageId: assistantMessageId,
        })

        if (runId) {
          await finishRun(
            runId,
            aborted ? 'aborted' : 'failed',
            aborted ? undefined : errorMessage
          )
        }

        setMessageTraceById((prev) => ({
          ...prev,
          [assistantMessageId]: {
            toolCalls: Array.from(collectedToolCalls.values()),
            fileEdits: [...collectedFileEdits],
          },
        }))

        if (!aborted) {
          setSubmitError(errorMessage)
        }
      } finally {
        setIsSubmitting(false)
        setLiveAssistantMessage(null)
        activeRequestIdRef.current = null
        activeRunIdRef.current = null
        abortControllerRef.current = null
        manualStopRef.current = false
      }

      return {
        status: completionStatus,
        assistantMessageId,
      }
    },
    [
      autoApplyLinkedToolEdits,
      ensureActiveThread,
      isSubmitting,
      memorySystemMessage,
      onInsertIntoEditor,
      persistedMessages,
      persistedMemoryItems,
      projectId,
      promptMemoryItems,
      requestContext,
      selectedModel,
      streamingState,
      userId,
    ]
  )

  // ── External prompt handling ──

  useEffect(() => {
    if (!externalPromptRequest) return
    const requestId = externalPromptRequest.id.trim()
    if (!requestId) return
    if (consumedExternalPromptIdRef.current === requestId) return
    if (isSubmitting) return

    consumedExternalPromptIdRef.current = requestId
    onExternalPromptConsumed?.(requestId)
    setSubmitError(null)

    void (async () => {
      try {
        const result = await sendPrompt(externalPromptRequest.prompt, {
          autoApplyStagedEdits: externalPromptRequest.autoApplyStagedEdits,
        })

        onExternalPromptSettled?.({
          requestId,
          status: result.status,
          assistantMessageId: result.assistantMessageId,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to run external chat prompt.'
        setSubmitError(message)
        onExternalPromptSettled?.({
          requestId,
          status: 'error',
          assistantMessageId: null,
        })
      }
    })()
  }, [
    externalPromptRequest,
    isSubmitting,
    onExternalPromptConsumed,
    onExternalPromptSettled,
    sendPrompt,
  ])

  // ── Retry last message ──

  const retryLastMessage = useCallback(() => {
    if (isSubmitting) return
    // Find the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        // Find the preceding user message
        for (let j = i - 1; j >= 0; j--) {
          if (messages[j].role === 'user') {
            void sendPrompt(messages[j].content).catch((error) => {
              const msg = error instanceof Error ? error.message : 'Failed to retry prompt.'
              setSubmitError(msg)
              console.warn('Failed to retry chat prompt:', error)
            })
            return
          }
        }
        return
      }
    }
  }, [isSubmitting, messages, sendPrompt])

  // ── Retry specific message ──

  const retryAssistantMessage = useCallback(
    (assistantMessageId: string) => {
      if (isSubmitting) return
      const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId)
      if (assistantIndex <= 0) return

      for (let index = assistantIndex - 1; index >= 0; index -= 1) {
        const candidate = messages[index]
        if (candidate.role === 'user') {
          void sendPrompt(candidate.content).catch((error) => {
            const msg = error instanceof Error ? error.message : 'Failed to retry prompt.'
            setSubmitError(msg)
            console.warn('Failed to retry chat prompt:', error)
          })
          return
        }
      }
    },
    [isSubmitting, messages, sendPrompt]
  )

  return {
    // Thread state
    threads,
    activeThreadId,
    activeThread,
    switchThread,
    createNewChat,
    deleteThread,
    isThreadsLoading,

    // Messages
    messages,
    isSubmitting,

    // Actions
    sendPrompt,
    stopStreaming,
    retryLastMessage,
    retryAssistantMessage,

    // Streaming state
    streamingState,

    // File edits from current response
    currentFileEdits: liveAssistantMessage?.fileEdits ?? [],

    // Memory
    memoryItems: persistedMemoryItems,

    // Error
    submitError,
    threadsErrorMessage,
  }
}
