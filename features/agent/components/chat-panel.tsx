'use client'

import { id as instantId } from '@instantdb/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUp,
  Check,
  ChevronsRight,
  Clock3,
  Copy,
  FileText,
  RotateCcw,
  Square,
  SquarePen,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QUICK_EDIT_GEMINI_MODEL_OPTIONS } from '@/lib/constants/gemini-models'
import { db } from '@/lib/constants'
import { useChatThreadsState } from '@/features/agent'
import {
  computeNextSeq,
  createRun,
  createThread,
  finishRun,
  setProjectActiveThread,
  upsertThreadMessage,
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
import { chatService, type ChatMessage, type FileEditDelta } from '@/services/agent/browser/chat/chatService'
import { parseRawResponse } from '@/features/agent/services/response-parser'
import { cn } from '@/lib/utils'
import { ChatMarkdown } from './chat-markdown'
import { AssistantFileBlock } from './assistant-file-block'
import type { StagedFileChange } from '@/features/agent/services/change-manager'
import type {
  AgentChatContext,
  AgentWorkspaceFileContext,
} from '@/features/agent/types/chat-context'

interface ChatPanelProps {
  projectId: string
  userId: string
  initialActiveThreadId?: string | null
  fileContent?: string
  isVisible?: boolean
  onToggle?: () => void
  activeFileId?: string
  activeFileName?: string
  activeFilePath?: string
  workspaceFiles?: AgentWorkspaceFileContext[]
  compileLogs?: string | null
  compileError?: string | null
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
  onJumpToStagedFile?: (fileId: string) => void | Promise<void>
  onAcceptStagedFile?: (fileId: string) => void | Promise<void>
  onRejectStagedFile?: (fileId: string) => void | Promise<void>
  onAcceptAllStaged?: () => void | Promise<void>
  onRejectAllStaged?: () => void | Promise<void>
}

interface ToolCallInfo {
  toolCallId: string
  toolName: string
  status: 'running' | 'completed'
}

interface PanelMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  isError?: boolean
  toolCalls?: ToolCallInfo[]
  fileEdits?: FileEditDelta[]
}

const MAX_ACTIVE_FILE_CHARS = 36000
const MAX_WORKSPACE_FILE_CHARS = 18000
const MAX_WORKSPACE_TOTAL_CHARS = 150000
const MAX_COMPILE_LOG_CHARS = 24000

function trimWithNotice(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}\n\n[Truncated]`
}

// countClosedCodeBlocks removed — edits are now handled via structured tool calls

function buildThreadTitle(prompt: string): string {
  const singleLine = prompt.trim().replace(/\s+/g, ' ')
  if (!singleLine) return 'New chat'
  if (singleLine.length <= 48) return singleLine
  return `${singleLine.slice(0, 45)}...`
}

function formatThreadDate(iso?: string): string {
  if (!iso) return 'No activity'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'No activity'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ChatPanel({
  projectId,
  userId,
  initialActiveThreadId = null,
  fileContent,
  isVisible = false,
  onToggle,
  activeFileId,
  activeFileName,
  activeFilePath,
  workspaceFiles = [],
  compileLogs = null,
  compileError = null,
  onInsertIntoEditor,
  stagedChanges = [],
  anyStagedStreaming = false,
  onJumpToStagedFile,
  onAcceptStagedFile,
  onRejectStagedFile,
  onAcceptAllStaged,
  onRejectAllStaged,
}: ChatPanelProps) {
  const [messageInput, setMessageInput] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('auto')
  const [showCurrentDocument, setShowCurrentDocument] = useState(true)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [insertingMessageId, setInsertingMessageId] = useState<string | null>(null)
  const [runningStagedAction, setRunningStagedAction] = useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialActiveThreadId)
  const [showThreadList, setShowThreadList] = useState(false)
  const [liveAssistantMessage, setLiveAssistantMessage] = useState<PanelMessage | null>(null)

  const activeRequestIdRef = useRef<string | null>(null)
  const activeRunIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const manualStopRef = useRef(false)
  const persistedActiveThreadRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const {
    threads,
    messages: persistedMessages,
    isLoading: isThreadsLoading,
    error: threadsQueryError,
  } = useChatThreadsState({
    projectId,
    userId,
    activeThreadId,
  })

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

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  )

  useEffect(() => {
    if (!threads.length) return
    if (activeThreadId && threads.some((thread) => thread.id === activeThreadId)) return

    const preferredThread =
      initialActiveThreadId && threads.some((thread) => thread.id === initialActiveThreadId)
        ? initialActiveThreadId
        : null

    const nextThreadId = preferredThread ?? threads[0]?.id ?? null
    if (nextThreadId && nextThreadId !== activeThreadId) {
      setActiveThreadId(nextThreadId)
    }
  }, [activeThreadId, initialActiveThreadId, threads])

  useEffect(() => {
    if (!activeThreadId || !projectId) return
    if (persistedActiveThreadRef.current === activeThreadId) return

    persistedActiveThreadRef.current = activeThreadId
    void setProjectActiveThread(projectId, activeThreadId).catch((error) => {
      console.warn('Failed to persist active chat thread:', error)
    })
  }, [activeThreadId, projectId])

  useEffect(() => {
    setSubmitError(null)
    setLiveAssistantMessage(null)
  }, [activeThreadId])

  const canSubmit =
    messageInput.trim().length > 0 && !isSubmitting && Boolean(projectId) && Boolean(userId)
  const hasStagedChanges = stagedChanges.length > 0
  const stagedActionsDisabled = anyStagedStreaming || runningStagedAction !== null
  const { linkedStagedChangesByMessageId, unlinkedStagedChanges } = useMemo(() => {
    const linked = new Map<string, StagedFileChange[]>()
    const unlinked: StagedFileChange[] = []

    for (const change of stagedChanges) {
      const messageId = change.sourceMessageId?.trim()
      if (!messageId) {
        unlinked.push(change)
        continue
      }

      const list = linked.get(messageId)
      if (list) {
        list.push(change)
      } else {
        linked.set(messageId, [change])
      }
    }

    for (const list of linked.values()) {
      list.sort((left, right) => right.updatedAt - left.updatedAt)
    }

    unlinked.sort((left, right) => right.updatedAt - left.updatedAt)

    return {
      linkedStagedChangesByMessageId: linked,
      unlinkedStagedChanges: unlinked,
    }
  }, [stagedChanges])

  const currentDocumentLabel = useMemo(() => {
    if (!activeFileName) return 'Current document'
    return activeFileName.length > 30 ? `${activeFileName.slice(0, 27)}...` : activeFileName
  }, [activeFileName])

  const currentDocumentContext = useMemo(() => {
    if (!showCurrentDocument || !fileContent) return ''
    const normalized = fileContent.trim()
    if (!normalized) return ''
    return trimWithNotice(normalized, MAX_ACTIVE_FILE_CHARS)
  }, [fileContent, showCurrentDocument])

  const libraryEnabled = useMemo(() => {
    if (activeFilePath?.toLowerCase().endsWith('.typ')) return true
    return workspaceFiles.some((file) => file.path?.toLowerCase().endsWith('.typ'))
  }, [activeFilePath, workspaceFiles])

  const requestContext = useMemo<AgentChatContext>(() => {
    let remainingWorkspaceBudget = MAX_WORKSPACE_TOTAL_CHARS
    const normalizedWorkspaceFiles: AgentWorkspaceFileContext[] = []

    for (const file of workspaceFiles) {
      if (!file?.path || typeof file.content !== 'string') continue
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
        includeCurrentDocument: showCurrentDocument,
        webEnabled: false,
        libraryEnabled,
      },
    }
  }, [
    activeFileId,
    activeFileName,
    activeFilePath,
    compileError,
    compileLogs,
    currentDocumentContext,
    libraryEnabled,
    showCurrentDocument,
    workspaceFiles,
  ])

  const messages = useMemo(() => {
    const persisted = persistedMessages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        id: message.id,
        role: message.role as 'user' | 'assistant',
        content: message.content ?? '',
        isStreaming: false,
        isError: message.status === 'error',
      }))

    if (!liveAssistantMessage) return persisted
    if (persisted.some((message) => message.id === liveAssistantMessage.id)) return persisted

    return [...persisted, liveAssistantMessage]
  }, [liveAssistantMessage, persistedMessages])

  const threadsErrorMessage = threadsQueryError
    ? 'Failed to load saved chats.'
    : memoryQuery.error
      ? 'Failed to load persistent memory.'
      : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, isSubmitting])

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

  const stopStreaming = useCallback(() => {
    manualStopRef.current = true
    if (activeRequestIdRef.current) {
      chatService.abort(activeRequestIdRef.current)
      activeRequestIdRef.current = null
    }
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

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

  const resetChat = useCallback(async () => {
    stopStreaming()
    setSubmitError(null)
    setMessageInput('')
    setIsSubmitting(false)
    setLiveAssistantMessage(null)
    const nextThreadId = await createThread({
      projectId,
      userId,
      title: 'New chat',
    })
    setActiveThreadId(nextThreadId)
    setShowThreadList(false)
  }, [projectId, stopStreaming, userId])

  const switchToThread = useCallback(
    (threadId: string) => {
      stopStreaming()
      setSubmitError(null)
      setLiveAssistantMessage(null)
      setActiveThreadId(threadId)
      setShowThreadList(false)
    },
    [stopStreaming]
  )

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt || isSubmitting) return

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
                role: 'system',
                content: memorySystemMessage,
              } as ChatMessage,
            ]
          : []),
        ...conversationHistory,
        { role: 'user', content: trimmedPrompt },
      ]

      const baseSeq = computeNextSeq(persistedMessages as Array<Pick<PersistedMessage, 'seq'>>)
      const assistantMessageId = instantId()
      const controller = new AbortController()

      let runId: string | null = null
      let streamedResponse = ''
      const collectedFileEdits: FileEditDelta[] = []

      setSubmitError(null)
      setIsSubmitting(true)
      manualStopRef.current = false
      abortControllerRef.current = controller

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

      setLiveAssistantMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: '',
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

          // Handle text content
          if (delta.content) {
            streamedResponse += delta.content
            setLiveAssistantMessage((prev) =>
              prev && prev.id === assistantMessageId
                ? { ...prev, content: streamedResponse, isStreaming: true }
                : prev
            )
          }

          // Handle tool call start (show status pill)
          if (delta.toolCall) {
            const tc = delta.toolCall
            setLiveAssistantMessage((prev) => {
              if (!prev || prev.id !== assistantMessageId) return prev
              const existing = prev.toolCalls ?? []
              const alreadyTracked = existing.some((t) => t.toolCallId === tc.toolCallId)
              if (alreadyTracked) return prev
              return {
                ...prev,
                toolCalls: [...existing, { toolCallId: tc.toolCallId, toolName: tc.toolName, status: 'running' as const }],
              }
            })
          }

          // Handle tool result (mark complete, stage file edits)
          if (delta.toolResult) {
            setLiveAssistantMessage((prev) => {
              if (!prev || prev.id !== assistantMessageId) return prev
              const updated = (prev.toolCalls ?? []).map((t) =>
                t.toolCallId === delta.toolResult!.toolCallId
                  ? { ...t, status: 'completed' as const }
                  : t
              )
              return { ...prev, toolCalls: updated }
            })
          }

          // Handle file edit from apply_file_edit tool
          if (delta.fileEdit) {
            const edit = delta.fileEdit
            collectedFileEdits.push(edit)

            setLiveAssistantMessage((prev) => {
              if (!prev || prev.id !== assistantMessageId) return prev
              return { ...prev, fileEdits: [...collectedFileEdits] }
            })

            // Stage the change via changeManager so it shows as an AssistantFileBlock
            if (onInsertIntoEditor) {
              void onInsertIntoEditor(JSON.stringify(edit), {
                auto: true,
                sourceMessageId: assistantMessageId,
                skipEditorFocus: true,
              })
            }
          }
        }
        // Apply fallback parsing to clean any raw @file: metadata that leaked through
        const parsed = parseRawResponse(streamedResponse)
        const finalContent = parsed.displayText.trim().length > 0
          ? parsed.displayText
          : streamedResponse.trim().length > 0
            ? streamedResponse
            : 'No response received.'

        // If fallback parser found edits, stage them too
        if (parsed.fileEdits.length > 0 && onInsertIntoEditor) {
          for (const edit of parsed.fileEdits) {
            void onInsertIntoEditor(JSON.stringify(edit), {
              auto: true,
              sourceMessageId: assistantMessageId,
              skipEditorFocus: true,
            })
          }
        }

        await upsertThreadMessage({
          messageId: assistantMessageId,
          threadId,
          projectId,
          userId,
          role: 'assistant',
          content: finalContent,
          seq: baseSeq + 1,
          status: 'completed',
          sourceMessageId: assistantMessageId,
        })

        if (runId) {
          await finishRun(runId, 'completed')
        }
      } catch (error) {
        const aborted = manualStopRef.current || controller.signal.aborted
        const errorMessage = error instanceof Error ? error.message : 'Failed to stream chat response.'
        const fallbackContent = streamedResponse.trim().length > 0
          ? streamedResponse
          : aborted
            ? 'Generation stopped.'
            : 'Failed to generate a response. Please try again.'

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
          await finishRun(runId, aborted ? 'aborted' : 'failed', aborted ? undefined : errorMessage)
        }

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
    },
    [
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
      userId,
    ]
  )

  const handleSubmit = useCallback(() => {
    const prompt = messageInput.trim()
    if (!prompt) return
    setMessageInput('')
    void sendPrompt(prompt)
  }, [messageInput, sendPrompt])

  const handleRetryAssistantResponse = useCallback(
    (assistantMessageId: string) => {
      if (isSubmitting) return
      const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId)
      if (assistantIndex <= 0) return

      for (let index = assistantIndex - 1; index >= 0; index -= 1) {
        const candidate = messages[index]
        if (candidate.role === 'user') {
          void sendPrompt(candidate.content)
          return
        }
      }
    },
    [isSubmitting, messages, sendPrompt]
  )

  const handleCopyAssistantResponse = useCallback(async (message: PanelMessage) => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedMessageId(message.id)
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? null : current))
      }, 1400)
    } catch (error) {
      console.warn('Failed to copy assistant response:', error)
    }
  }, [])

  const handleApplyAssistantResponse = useCallback(
    async (message: PanelMessage) => {
      if (!onInsertIntoEditor) return
      const textToApply = message.content.trim()
      if (!textToApply) return

      setInsertingMessageId(message.id)
      try {
        await onInsertIntoEditor(textToApply, {
          sourceMessageId: message.id,
        })
      } catch (error) {
        console.warn('Failed to apply assistant response to editor:', error)
      } finally {
        setInsertingMessageId((current) => (current === message.id ? null : current))
      }
    },
    [onInsertIntoEditor]
  )

  const runStagedAction = useCallback(
    async (actionId: string, action: (() => void | Promise<void>) | undefined) => {
      if (!action || stagedActionsDisabled) return
      setRunningStagedAction(actionId)
      try {
        await action()
      } catch (error) {
        console.warn('Failed staged change action:', error)
      } finally {
        setRunningStagedAction((current) => (current === actionId ? null : current))
      }
    },
    [stagedActionsDisabled]
  )

  return (
    <>
      <div className={cn('flex h-full w-full flex-col bg-[#101011]', !isVisible && 'pointer-events-none')}>
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-[#101011] border-b border-white/5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-7 w-7 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              title="Hide AI Chat"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold tracking-tight text-zinc-100">AI Chat</span>
            <span className="text-xs text-zinc-500">
              {activeThread?.title?.trim() || 'New chat'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              title="Recent chats"
              onClick={() => setShowThreadList((value) => !value)}
            >
              <Clock3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={() => {
                void resetChat()
              }}
              className="h-8 w-8 rounded-lg bg-[#6D78E7] hover:bg-[#6D78E7]/90 text-white border border-white/10 shadow-sm transition-all"
              title="New chat"
            >
              <SquarePen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showThreadList && (
          <div className="border-b border-white/10 bg-[#111216] max-h-56 overflow-y-auto">
            {isThreadsLoading ? (
              <div className="px-3 py-2 text-xs text-zinc-500">Loading chats...</div>
            ) : threads.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-500">No chats yet. Start a new one.</div>
            ) : (
              <div className="py-1">
                {threads.map((thread) => {
                  const isActive = thread.id === activeThreadId
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => switchToThread(thread.id)}
                      className={cn(
                        'w-full px-3 py-2 text-left transition-colors',
                        isActive ? 'bg-white/10' : 'hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-zinc-200">
                          {thread.title?.trim() || 'Untitled chat'}
                        </span>
                        <span className="shrink-0 text-[10px] text-zinc-500">
                          {formatThreadDate(thread.lastMessageAt)}
                        </span>
                      </div>
                      {thread.lastMessagePreview?.trim() ? (
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {thread.lastMessagePreview}
                        </p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="mx-2 my-2 flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-zinc-950/40 overflow-hidden">
          {hasStagedChanges && (
            <div className="border-b border-white/10 bg-[#15161c] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-zinc-300">
                  {stagedChanges.length} file{stagedChanges.length === 1 ? '' : 's'} with staged changes
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void runStagedAction('reject-all', onRejectAllStaged)}
                    disabled={stagedActionsDisabled}
                    className="inline-flex h-6 items-center gap-1 rounded-md border border-[#3b3d46] px-2 text-[11px] text-zinc-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <X className="h-3 w-3" />
                    <span>Reject All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void runStagedAction('accept-all', onAcceptAllStaged)}
                    disabled={stagedActionsDisabled}
                    className="inline-flex h-6 items-center gap-1 rounded-md bg-[#6D78E7] px-2 text-[11px] text-white transition-colors hover:bg-[#5b65d6] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Check className="h-3 w-3" />
                    <span>Accept All</span>
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Open each assistant response to review file blocks and jump directly to the diff in-editor.
              </p>
              {unlinkedStagedChanges.length > 0 && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  {unlinkedStagedChanges.length} change
                  {unlinkedStagedChanges.length === 1 ? '' : 's'} are not linked to a message yet.
                </p>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="mx-auto mt-6 max-w-xs text-center text-sm leading-6 text-zinc-500">
                {isThreadsLoading
                  ? 'Loading chat history...'
                  : 'Ask for edits, debugging help, or explanations for the current document.'}
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => {
                  if (message.role === 'user') {
                    return (
                      <div key={message.id} className="flex w-full justify-end">
                        <div className="max-w-[92%] rounded-2xl bg-[#40414f] px-4 py-3 text-[15px] leading-7 text-zinc-100">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    )
                  }

                  const linkedChanges = linkedStagedChangesByMessageId.get(message.id) ?? []

                  return (
                    <div key={message.id} className="w-full space-y-2">
                      <div
                        className={cn(
                          'text-[15px] leading-7',
                          message.isError ? 'text-rose-200' : 'text-zinc-200'
                        )}
                      >
                        <ChatMarkdown
                          content={message.content}
                          hideFencedCodeBlocks={linkedChanges.length > 0}
                          className={cn(
                            'text-[15px] leading-8',
                            message.isError ? 'text-rose-200' : 'text-zinc-200'
                          )}
                        />
                      </div>

                      {linkedChanges.length > 0 && (
                        <div className="space-y-1.5">
                          {linkedChanges.map((change) => {
                            const openActionId = `open-${message.id}-${change.fileId}`
                            const rejectActionId = `reject-${message.id}-${change.fileId}`
                            const acceptActionId = `accept-${message.id}-${change.fileId}`

                            return (
                              <AssistantFileBlock
                                key={`${message.id}-${change.fileId}`}
                                change={change}
                                disabled={stagedActionsDisabled}
                                isOpening={runningStagedAction === openActionId}
                                isRejecting={runningStagedAction === rejectActionId}
                                isAccepting={runningStagedAction === acceptActionId}
                                onOpen={() =>
                                  void runStagedAction(openActionId, () =>
                                    onJumpToStagedFile?.(change.fileId)
                                  )
                                }
                                onReject={() =>
                                  void runStagedAction(rejectActionId, () =>
                                    onRejectStagedFile?.(change.fileId)
                                  )
                                }
                                onAccept={() =>
                                  void runStagedAction(acceptActionId, () =>
                                    onAcceptStagedFile?.(change.fileId)
                                  )
                                }
                              />
                            )
                          })}
                        </div>
                      )}

                      {message.isStreaming && (
                        <div className="flex items-center gap-2 pl-1 text-xs text-zinc-500">
                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
                          <span>Thinking...</span>
                        </div>
                      )}

                      {!message.isStreaming && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <button
                            type="button"
                            onClick={() => void handleCopyAssistantResponse(message)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-zinc-100"
                            title="Copy response"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{copiedMessageId === message.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRetryAssistantResponse(message.id)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Retry this prompt"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Retry</span>
                          </button>

                          {onInsertIntoEditor && (
                            <button
                              type="button"
                              onClick={() => void handleApplyAssistantResponse(message)}
                              disabled={insertingMessageId === message.id}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Apply code to editor"
                            >
                              <ArrowDownToLine className="h-3.5 w-3.5" />
                              <span>{insertingMessageId === message.id ? 'Applying...' : 'Apply Code'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {showCurrentDocument && (
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-xl border border-[#343542] bg-[#1b1c22] px-3 text-sm font-medium text-zinc-200 hover:bg-[#20212a] transition-colors"
                >
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>{currentDocumentLabel}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 text-zinc-400 hover:text-zinc-200"
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowCurrentDocument(false)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        setShowCurrentDocument(false)
                      }
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-[#3a3b45] bg-[#202228] p-3">
              <textarea
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                rows={3}
                placeholder="Ask AI, use @ to mention specific PDFs or / to access saved prompts"
                className="w-full resize-none bg-transparent text-[15px] leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />

              {(submitError || threadsErrorMessage) && (
                <p className="mt-2 text-xs text-rose-300">{submitError ?? threadsErrorMessage}</p>
              )}

              <div className="mt-3 flex items-end gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2 text-zinc-400">
                  <label className="mr-1 flex shrink-0 items-center gap-1.5 text-sm text-zinc-300">
                    <span className="text-zinc-400">Model</span>
                    <select
                      value={selectedModel}
                      onChange={(event) => setSelectedModel(event.target.value)}
                      className="h-7 max-w-[8.5rem] rounded-md border border-[#3a3b45] bg-[#1b1c22] px-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#6D78E7]"
                    >
                      {QUICK_EDIT_GEMINI_MODEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <Button
                  type="button"
                  size="icon"
                  disabled={!canSubmit && !isSubmitting}
                  onClick={isSubmitting ? stopStreaming : handleSubmit}
                  className="h-10 w-10 shrink-0 rounded-full bg-[#6D78E7] text-white hover:bg-[#5b65d6] disabled:opacity-50"
                  title={isSubmitting ? 'Stop generating' : 'Send message'}
                >
                  {isSubmitting ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
