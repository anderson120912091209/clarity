'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  FileText,
  X,
  Check,
  ArrowDownToLine,
  Plus,
  Search,
} from 'lucide-react'
import { QUICK_EDIT_GEMINI_MODEL_OPTIONS } from '@/lib/constants/gemini-models'
import {
  useDashboardSettings,
  type ChatModelPreference,
} from '@/contexts/DashboardSettingsContext'
import { useChatSession } from '@/features/agent/hooks/useChatSession'
import type {
  ChatPanelExternalPromptRequest,
  ExternalPromptResult,
  PanelMessage,
} from '@/features/agent/hooks/useChatSession'
import type { StagedFileChange } from '@/features/agent/services/change-manager'
import type { AgentWorkspaceFileContext } from '@/features/agent/types/chat-context'
import { cn } from '@/lib/utils'

// New decomposed components
import { ThinkingBlock } from './thinking-block'
import { AgentActivityPanel } from './agent-activity-panel'
import { StreamingIndicator } from './streaming-indicator'
import { UserMessage } from './user-message'
import { MessageActions } from './message-actions'
import { ChatHeader } from './chat-header'
import { ThreadList } from './thread-list'
import { StagedChangesBar } from './staged-changes-bar'
import { ChatMessageList } from './chat-message-list'
import { ChatInputArea } from './chat-input-area'
import { ChatMarkdown } from './chat-markdown'
import { AssistantFileBlock } from './assistant-file-block'

// Re-export for backwards compat
export type { ChatPanelExternalPromptRequest }

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
  externalPromptRequest?: ChatPanelExternalPromptRequest | null
  onExternalPromptConsumed?: (requestId: string) => void
  onExternalPromptSettled?: (result: ExternalPromptResult) => void
  onOpenWorkspaceFile?: (fileId: string) => void
}

function isChatModelPreference(value: string): value is ChatModelPreference {
  return QUICK_EDIT_GEMINI_MODEL_OPTIONS.some((option) => option.value === value)
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
  externalPromptRequest = null,
  onExternalPromptConsumed,
  onExternalPromptSettled,
  onOpenWorkspaceFile,
}: ChatPanelProps) {
  // ── Local UI state ──

  const { settings } = useDashboardSettings()
  const [messageInput, setMessageInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<ChatModelPreference>(
    settings.defaultChatModel
  )
  const [attachedFileIds, setAttachedFileIds] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (settings.defaultChatIncludeCurrentDocument && activeFileId) {
      initial.add(activeFileId)
    }
    return initial
  })
  const [showThreadList, setShowThreadList] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [filePickerSearch, setFilePickerSearch] = useState('')
  const [insertingMessageId, setInsertingMessageId] = useState<string | null>(null)
  const [runningStagedAction, setRunningStagedAction] = useState<string | null>(null)
  const filePickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setSelectedModel(settings.defaultChatModel)
  }, [settings.defaultChatModel])

  // Sync active file when it changes externally (tab switch)
  useEffect(() => {
    if (!activeFileId) return
    setAttachedFileIds((prev) => {
      // If the previous active file was the only thing in the set, swap to new active file
      if (prev.size === 1 && activeFileId && !prev.has(activeFileId)) {
        return new Set([activeFileId])
      }
      return prev
    })
  }, [activeFileId])

  // Close file picker when clicking outside
  useEffect(() => {
    if (!showFilePicker) return
    const handleClickOutside = (e: MouseEvent) => {
      if (filePickerRef.current && !filePickerRef.current.contains(e.target as Node)) {
        setShowFilePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilePicker])

  // ── Derived ──

  const libraryEnabled = useMemo(() => {
    if (activeFilePath?.toLowerCase().endsWith('.typ')) return true
    return workspaceFiles.some((file) => file.path?.toLowerCase().endsWith('.typ'))
  }, [activeFilePath, workspaceFiles])

  const includeCurrentDocument = Boolean(activeFileId && attachedFileIds.has(activeFileId))

  const attachedFileContexts = useMemo(
    () => workspaceFiles.filter((f) => attachedFileIds.has(f.fileId)),
    [workspaceFiles, attachedFileIds]
  )

  const attachedFileIdsArray = useMemo(() => Array.from(attachedFileIds), [attachedFileIds])

  const filteredWorkspaceFiles = useMemo(() => {
    if (!filePickerSearch.trim()) return workspaceFiles
    const q = filePickerSearch.toLowerCase()
    return workspaceFiles.filter(
      (f) => f.path.toLowerCase().includes(q)
    )
  }, [workspaceFiles, filePickerSearch])

  // ── Chat session hook ──

  const session = useChatSession({
    projectId,
    userId,
    initialActiveThreadId,
    activeFileId,
    activeFileName,
    activeFilePath,
    fileContent,
    workspaceFiles,
    compileLogs,
    compileError,
    selectedModel,
    includeCurrentDocument,
    attachedFileIds: attachedFileIdsArray,
    libraryEnabled,
    onInsertIntoEditor,
    stagedChanges,
    anyStagedStreaming,
    onAcceptStagedFile,
    externalPromptRequest,
    onExternalPromptConsumed,
    onExternalPromptSettled,
  })

  // ── Staged changes linkage ──

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

    return { linkedStagedChangesByMessageId: linked, unlinkedStagedChanges: unlinked }
  }, [stagedChanges])

  // ── Handlers ──

  const handleModelChange = useCallback((nextModel: string) => {
    if (!isChatModelPreference(nextModel)) return
    setSelectedModel(nextModel)
  }, [])

  const canSubmit =
    messageInput.trim().length > 0 &&
    !session.isSubmitting &&
    Boolean(projectId) &&
    Boolean(userId)

  const handleSubmit = useCallback(() => {
    const prompt = messageInput.trim()
    if (!prompt) return
    setMessageInput('')
    void session.sendPrompt(prompt).catch((error) => {
      console.warn('Failed to send chat prompt:', error)
    })
  }, [messageInput, session])

  const handleCopy = useCallback((content: string) => {
    void navigator.clipboard.writeText(content).catch(() => {})
  }, [])

  const handleRetry = useCallback(
    (messageId: string) => {
      session.retryAssistantMessage(messageId)
    },
    [session]
  )

  const handleApply = useCallback(
    async (message: PanelMessage) => {
      if (!onInsertIntoEditor) return
      const textToApply = message.content.trim()
      if (!textToApply) return
      setInsertingMessageId(message.id)
      try {
        await onInsertIntoEditor(textToApply, { sourceMessageId: message.id })
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

  const handleNewChat = useCallback(() => {
    void session.createNewChat()
    setMessageInput('')
    setShowThreadList(false)
  }, [session])

  const handleSwitchThread = useCallback(
    (threadId: string) => {
      session.switchThread(threadId)
      setShowThreadList(false)
    },
    [session]
  )

  // ── Thread list data ──

  const threadListItems = useMemo(
    () =>
      session.threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        lastModified: thread.lastMessageAt
          ? new Date(thread.lastMessageAt).getTime()
          : Date.now(),
        isActive: thread.id === session.activeThreadId,
      })),
    [session.threads, session.activeThreadId]
  )

  // ── Render ──

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col bg-[#121212]',
        !isVisible && 'pointer-events-none'
      )}
    >
      {/* ── Header ── */}
      <ChatHeader
        threadTitle={session.activeThread?.title?.trim() || undefined}
        onNewChat={handleNewChat}
        onToggleThreadList={() => setShowThreadList((v) => !v)}
        showThreadListToggle
        onHide={onToggle}
      />

      {/* ── Thread List ── */}
      {showThreadList && (
        <div className="border-b border-white/[0.07] bg-[#0f0f11] max-h-56 overflow-hidden">
          {session.isThreadsLoading ? (
            <div className="px-3 py-2 text-[11px] text-zinc-600">Loading chats…</div>
          ) : (
            <ThreadList
              threads={threadListItems}
              onSelectThread={handleSwitchThread}
              onDeleteThread={session.deleteThread}
            />
          )}
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="mx-2 my-2 flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-zinc-950/40 overflow-hidden">
        {/* Staged changes bar */}
        {hasStagedChanges && (
          <StagedChangesBar
            changeCount={stagedChanges.length}
            isStreaming={anyStagedStreaming}
            onAcceptAll={() => void runStagedAction('accept-all', onAcceptAllStaged)}
            onRejectAll={() => void runStagedAction('reject-all', onRejectAllStaged)}
          />
        )}

        {/* Message list */}
        <ChatMessageList autoScroll>
          {session.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              {session.isThreadsLoading ? (
                <p className="text-[12px] text-zinc-600">Loading chat history…</p>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-xl bg-[#6d78e7]/10 border border-[#6d78e7]/15 flex items-center justify-center">
                    <svg className="h-4 w-4 text-[#8b95f0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-zinc-300">Ask the AI assistant</p>
                    <p className="mt-1 text-[11px] text-zinc-600 max-w-[200px] leading-relaxed">
                      Get help with edits, debugging, and explanations.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {session.messages.map((message) => {
                if (message.role === 'user') {
                  return (
                    <UserMessage
                      key={message.id}
                      content={message.content}
                    />
                  )
                }

                const linkedChanges = linkedStagedChangesByMessageId.get(message.id) ?? []
                const toolCalls = message.toolCalls ?? []
                const messageFileEdits = message.fileEdits ?? []
                const hasAgentActivity = toolCalls.length > 0 || messageFileEdits.length > 0

                return (
                  <div key={message.id} className="w-full space-y-1.5 px-1">
                    {/* Thinking / Reasoning block */}
                    {message.thinking && message.thinking.trim().length > 0 && (
                      <ThinkingBlock
                        thinking={message.thinking.trim()}
                        isStreaming={message.isStreaming}
                        defaultOpen={message.isStreaming}
                      />
                    )}

                    {/* Agent Activity (tool calls + file edits) */}
                    {hasAgentActivity && (
                      <AgentActivityPanel
                        toolCalls={toolCalls.map((tc) => ({
                          toolCallId: tc.toolCallId,
                          toolName: tc.toolName,
                          status: tc.status,
                          startedAt: 0,
                          error: tc.detail,
                        }))}
                        isStreaming={Boolean(message.isStreaming)}
                      />
                    )}

                    {/* Main content */}
                    <div
                      className={cn(
                        message.isError ? 'text-rose-300' : 'text-zinc-300'
                      )}
                    >
                      <ChatMarkdown
                        content={message.content}
                        hideFencedCodeBlocks={linkedChanges.length > 0}
                        onFileClick={(filename) => {
                          // Try staged changes first
                          const stagedMatch = stagedChanges.find(
                            (c) => c.fileName === filename || c.filePath?.endsWith(`/${filename}`) || c.filePath === filename
                          )
                          if (stagedMatch) {
                            void onJumpToStagedFile?.(stagedMatch.fileId)
                            return
                          }
                          // Try workspace files
                          const wsMatch = workspaceFiles.find(
                            (f) => f.path === filename || f.path.endsWith(`/${filename}`)
                          )
                          if (wsMatch) {
                            onOpenWorkspaceFile?.(wsMatch.fileId)
                          }
                        }}
                        className={cn(
                          message.isError ? 'text-rose-300' : 'text-zinc-300'
                        )}
                      />
                    </div>

                    {/* File edit blocks */}
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

                    {/* Streaming indicator */}
                    {message.isStreaming && (
                      <StreamingIndicator
                        state={
                          message.toolCalls?.some((t) => t.status === 'running')
                            ? 'tool_executing'
                            : message.thinking
                              ? 'llm_generating'
                              : 'llm_generating'
                        }
                        toolName={
                          message.toolCalls?.find((t) => t.status === 'running')?.toolName
                        }
                      />
                    )}

                    {/* Message actions (copy, retry, apply) */}
                    {!message.isStreaming && (
                      <MessageActions
                        content={message.content}
                        messageId={message.id}
                        onCopy={handleCopy}
                        onRetry={handleRetry}
                      >
                        {onInsertIntoEditor && (
                          <button
                            type="button"
                            onClick={() => void handleApply(message)}
                            disabled={insertingMessageId === message.id}
                            className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Apply code to editor"
                          >
                            <ArrowDownToLine className="h-3 w-3" />
                            <span>
                              {insertingMessageId === message.id ? 'Applying…' : 'Apply'}
                            </span>
                          </button>
                        )}
                      </MessageActions>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ChatMessageList>

        {/* ── Input Area ── */}
        <div className="pt-2 relative" ref={filePickerRef}>
          {/* File picker popover */}
          {showFilePicker && (
            <div className="absolute bottom-full left-3 right-3 mb-1.5 z-50 rounded-xl border border-white/[0.09] bg-[#16171e] shadow-xl shadow-black/40 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
                <Search className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <input
                  type="text"
                  value={filePickerSearch}
                  onChange={(e) => setFilePickerSearch(e.target.value)}
                  placeholder="Search files…"
                  className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setShowFilePicker(false); setFilePickerSearch('') }}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {filteredWorkspaceFiles.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-zinc-600 text-center">No files found</p>
                ) : (
                  filteredWorkspaceFiles.map((file) => {
                    const isAttached = attachedFileIds.has(file.fileId)
                    const filename = file.path.split('/').pop() ?? file.path
                    const dir = file.path.includes('/') ? file.path.split('/').slice(0, -1).join('/') : ''
                    return (
                      <button
                        key={file.fileId}
                        type="button"
                        onClick={() => {
                          setAttachedFileIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(file.fileId)) next.delete(file.fileId)
                            else next.add(file.fileId)
                            return next
                          })
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                          isAttached
                            ? 'bg-[#6d78e7]/8 text-zinc-200'
                            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                        )}
                      >
                        <FileText className={cn('h-3.5 w-3.5 shrink-0', isAttached ? 'text-[#8b95f0]' : 'text-zinc-600')} />
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] font-medium">{filename}</span>
                          {dir && <span className="ml-1.5 text-[10px] text-zinc-600">{dir}</span>}
                        </div>
                        {isAttached && <Check className="h-3 w-3 text-[#8b95f0] shrink-0" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Attached file pills */}
          {(attachedFileContexts.length > 0 || workspaceFiles.length > 0) && (
            <div className="mb-2 px-3 flex flex-wrap items-center gap-1.5">
              {attachedFileContexts.map((file) => {
                const filename = file.path.split('/').pop() ?? file.path
                return (
                  <div
                    key={file.fileId}
                    className="inline-flex h-6 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] pl-2 pr-1 text-[11px] font-medium text-zinc-400"
                  >
                    <FileText className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span className="max-w-[130px] truncate">{filename}</span>
                    <button
                      type="button"
                      className="ml-0.5 rounded p-0.5 text-zinc-700 hover:text-zinc-300 transition-colors"
                      onClick={() =>
                        setAttachedFileIds((prev) => {
                          const next = new Set(prev)
                          next.delete(file.fileId)
                          return next
                        })
                      }
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
              {workspaceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setShowFilePicker((v) => !v); setFilePickerSearch('') }}
                  className={cn(
                    'inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors',
                    showFilePicker
                      ? 'border-[#6d78e7]/30 bg-[#6d78e7]/10 text-[#8b95f0]'
                      : 'border-white/[0.06] bg-white/[0.03] text-zinc-600 hover:border-white/10 hover:bg-white/[0.05] hover:text-zinc-400'
                  )}
                >
                  <Plus className="h-3 w-3" />
                  <span>Add file</span>
                </button>
              )}
            </div>
          )}

          <ChatInputArea
            value={messageInput}
            onChange={setMessageInput}
            onSubmit={handleSubmit}
            onStop={session.stopStreaming}
            isSubmitting={session.isSubmitting}
            disabled={session.isSubmitting}
            modelOptions={QUICK_EDIT_GEMINI_MODEL_OPTIONS}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            placeholder="Ask AI, use @ to mention specific PDFs or / to access saved prompts"
          />
        </div>

        {(session.submitError || session.threadsErrorMessage) && (
          <p className="px-3 pb-2 text-xs text-rose-300">
            {session.submitError ?? session.threadsErrorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
