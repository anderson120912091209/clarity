'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  ChevronsRight,
  Clock3,
  SquarePen,
  FileText,
  X,
  Check,
  ArrowDownToLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
}: ChatPanelProps) {
  // ── Local UI state ──

  const { settings } = useDashboardSettings()
  const [messageInput, setMessageInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<ChatModelPreference>(
    settings.defaultChatModel
  )
  const [showCurrentDocument, setShowCurrentDocument] = useState(
    settings.defaultChatIncludeCurrentDocument
  )
  const [showThreadList, setShowThreadList] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [insertingMessageId, setInsertingMessageId] = useState<string | null>(null)
  const [runningStagedAction, setRunningStagedAction] = useState<string | null>(null)

  useEffect(() => {
    setSelectedModel(settings.defaultChatModel)
  }, [settings.defaultChatModel])

  useEffect(() => {
    setShowCurrentDocument(settings.defaultChatIncludeCurrentDocument)
  }, [settings.defaultChatIncludeCurrentDocument])

  // ── Derived ──

  const libraryEnabled = useMemo(() => {
    if (activeFilePath?.toLowerCase().endsWith('.typ')) return true
    return workspaceFiles.some((file) => file.path?.toLowerCase().endsWith('.typ'))
  }, [activeFilePath, workspaceFiles])

  const currentDocumentLabel = useMemo(() => {
    if (!activeFileName) return 'Current document'
    return activeFileName.length > 30 ? `${activeFileName.slice(0, 27)}...` : activeFileName
  }, [activeFileName])

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
    includeCurrentDocument: showCurrentDocument,
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
    void navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(content)
      window.setTimeout(() => setCopiedMessageId(null), 1400)
    }).catch(() => {})
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
        'flex h-full w-full flex-col bg-[#101011]',
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
        <div className="border-b border-white/10 bg-[#111216] max-h-56 overflow-hidden">
          {session.isThreadsLoading ? (
            <div className="px-3 py-2 text-xs text-zinc-500">Loading chats...</div>
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
            <div className="mx-auto mt-6 max-w-xs text-center text-sm leading-6 text-zinc-500">
              {session.isThreadsLoading
                ? 'Loading chat history...'
                : 'Ask for edits, debugging help, or explanations for the current document.'}
            </div>
          ) : (
            <div className="space-y-6">
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
                  <div key={message.id} className="w-full space-y-2">
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
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Apply code to editor"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                            <span>
                              {insertingMessageId === message.id ? 'Applying...' : 'Apply Code'}
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
        <div className="p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {showCurrentDocument ? (
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
            ) : (
              <button
                type="button"
                onClick={() => setShowCurrentDocument(true)}
                className="inline-flex h-8 items-center gap-2 rounded-xl border border-[#343542] bg-[#1b1c22] px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#20212a] hover:text-zinc-100"
              >
                <FileText className="h-4 w-4 text-zinc-400" />
                <span>Attach current document</span>
              </button>
            )}
          </div>

          <ChatInputArea
            value={messageInput}
            onChange={setMessageInput}
            onSubmit={handleSubmit}
            onStop={session.stopStreaming}
            isSubmitting={session.isSubmitting}
            disabled={!canSubmit && !session.isSubmitting}
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
