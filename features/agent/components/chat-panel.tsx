'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUp,
  AtSign,
  Check,
  ChevronsRight,
  Clock3,
  Copy,
  FileText,
  Image as ImageIcon,
  Link2,
  RotateCcw,
  Slash,
  Square,
  SquarePen,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { QUICK_EDIT_GEMINI_MODEL_OPTIONS } from '@/lib/constants/gemini-models'
import { chatService, type ChatMessage } from '@/services/agent/browser/quick-edit/chatService'
import { cn } from '@/lib/utils'
import { ChatMarkdown } from './chat-markdown'

interface ChatPanelProps {
  fileContent?: string
  isVisible?: boolean
  onToggle?: () => void
  activeFileName?: string
  onInsertIntoEditor?: (content: string) => void | Promise<void>
}

interface PanelMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  isError?: boolean
}

const CHAT_SYSTEM_PROMPT = [
  'You are an AI assistant for a LaTeX and PDF editing workspace.',
  'Give concise, practical responses.',
  'When proposing edits, focus on actionable changes and explain tradeoffs briefly.',
  'Use inline math for symbols and short equations (e.g. $x$, $dS=0$).',
  'Use display math ($$...$$) only for standalone multi-line equations.',
  'When providing code meant to be inserted, put it in fenced code blocks and add metadata lines at the top of the block.',
  'Use metadata format: @file: relative/path/to/file.ext and @insert: after_line 120 (or before_line 120, line 120, after <anchor>, before <anchor>, append).',
  'For full-file edits use @insert: replace_file. For targeted replacement use @insert: search_replace with SEARCH/REPLACE blocks.',
  'Metadata lines must appear before code.',
].join(' ')

function createMessageId(prefix: 'user' | 'assistant'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ChatPanel({
  fileContent,
  isVisible = false,
  onToggle,
  activeFileName,
  onInsertIntoEditor,
}: ChatPanelProps) {
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<PanelMessage[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('auto')
  const [webEnabled, setWebEnabled] = useState(false)
  const [libraryEnabled, setLibraryEnabled] = useState(false)
  const [showCurrentDocument, setShowCurrentDocument] = useState(true)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [insertingMessageId, setInsertingMessageId] = useState<string | null>(null)

  const activeRequestIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const manualStopRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const canSubmit = messageInput.trim().length > 0 && !isSubmitting
  const currentDocumentLabel = useMemo(() => {
    if (!activeFileName) return 'Current document'
    return activeFileName.length > 30 ? `${activeFileName.slice(0, 27)}...` : activeFileName
  }, [activeFileName])

  const currentDocumentContext = useMemo(() => {
    if (!showCurrentDocument || !fileContent) return ''
    const normalized = fileContent.trim()
    if (!normalized) return ''
    return normalized.length > 14000 ? `${normalized.slice(0, 14000)}\n\n[Truncated]` : normalized
  }, [fileContent, showCurrentDocument])

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

  const resetChat = useCallback(() => {
    stopStreaming()
    setMessages([])
    setSubmitError(null)
    setMessageInput('')
    setIsSubmitting(false)
  }, [stopStreaming])

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt || isSubmitting) return

      const userMessage: PanelMessage = {
        id: createMessageId('user'),
        role: 'user',
        content: trimmedPrompt,
      }
      const assistantMessageId = createMessageId('assistant')

      const conversationHistory: ChatMessage[] = messages
        .filter((msg) => msg.content.trim().length > 0)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

      const requestMessages: ChatMessage[] = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...(currentDocumentContext
          ? [
              {
                role: 'system' as const,
                content: `Current file (${activeFileName ?? 'untitled'}):\n${currentDocumentContext}`,
              },
            ]
          : []),
        ...conversationHistory,
        { role: 'user', content: trimmedPrompt },
      ]

      setSubmitError(null)
      setIsSubmitting(true)
      manualStopRef.current = false
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true },
      ])

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const { output, requestId } = await chatService.generate({
          messages: requestMessages,
          stream: true,
          abortSignal: controller.signal,
          model: selectedModel,
        })

        activeRequestIdRef.current = requestId

        let streamedResponse = ''
        for await (const delta of output) {
          if (delta.error) throw new Error(delta.error)
          if (!delta.content) continue

          streamedResponse += delta.content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: streamedResponse, isStreaming: true }
                : msg
            )
          )
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: msg.content.trim().length > 0 ? msg.content : 'No response received.',
                }
              : msg
          )
        )
      } catch (error) {
        if (manualStopRef.current || controller.signal.aborted) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    isStreaming: false,
                    content: msg.content.trim().length > 0 ? msg.content : 'Generation stopped.',
                  }
                : msg
            )
          )
          return
        }

        const message = error instanceof Error ? error.message : 'Failed to stream chat response.'
        setSubmitError(message)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  isError: true,
                  content:
                    msg.content.trim().length > 0
                      ? msg.content
                      : 'Failed to generate a response. Please try again.',
                }
              : msg
          )
        )
      } finally {
        setIsSubmitting(false)
        activeRequestIdRef.current = null
        abortControllerRef.current = null
        manualStopRef.current = false
      }
    },
    [activeFileName, currentDocumentContext, isSubmitting, messages, selectedModel]
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
      const assistantIndex = messages.findIndex((msg) => msg.id === assistantMessageId)
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
        await onInsertIntoEditor(textToApply)
      } catch (error) {
        console.warn('Failed to apply assistant response to editor:', error)
      } finally {
        setInsertingMessageId((current) => (current === message.id ? null : current))
      }
    },
    [onInsertIntoEditor]
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
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            title="Recent chats"
          >
            <Clock3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={resetChat}
            className="h-8 w-8 rounded-lg bg-[#6D78E7] hover:bg-[#5b65d6] text-white"
            title="New chat"
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mx-2 my-2 flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-zinc-950/40 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {messages.length === 0 ? (
            <div className="mx-auto mt-6 max-w-xs text-center text-sm leading-6 text-zinc-500">
              Ask for edits, debugging help, or explanations for the current document.
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex w-full justify-end">
                      <div className="max-w-[92%] rounded-2xl bg-[#40414f] px-4 py-3 text-[15px] leading-7 text-zinc-100">
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className="w-full space-y-2">
                    <div
                      className={cn(
                        'text-[15px] leading-7',
                        msg.isError ? 'text-rose-200' : 'text-zinc-200'
                      )}
                    >
                      <ChatMarkdown
                        content={msg.content}
                        className={cn('text-[15px] leading-8', msg.isError ? 'text-rose-200' : 'text-zinc-200')}
                      />
                    </div>

                    {msg.isStreaming && (
                      <div className="flex items-center gap-2 pl-1 text-xs text-zinc-500">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
                        <span>Thinking...</span>
                      </div>
                    )}

                    {!msg.isStreaming && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <button
                          type="button"
                          onClick={() => void handleCopyAssistantResponse(msg)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-zinc-100"
                          title="Copy response"
                        >
                          {copiedMessageId === msg.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedMessageId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRetryAssistantResponse(msg.id)}
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
                            onClick={() => void handleApplyAssistantResponse(msg)}
                            disabled={insertingMessageId === msg.id}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Apply code to editor"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                            <span>{insertingMessageId === msg.id ? 'Applying...' : 'Apply Code'}</span>
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
            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-xl border border-[#343542] bg-[#1b1c22] px-3 text-sm font-medium text-zinc-200 hover:bg-[#20212a] transition-colors"
            >
              <AtSign className="h-4 w-4 text-zinc-400" />
              <span>Add context</span>
            </button>

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

            {submitError && <p className="mt-2 text-xs text-rose-300">{submitError}</p>}

            <div className="mt-3 flex items-end gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2 text-zinc-400">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-white/5 hover:text-zinc-100"
                  title="Quick command"
                >
                  <Slash className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-white/5 hover:text-zinc-100"
                  title="Attach link"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-white/5 hover:text-zinc-100"
                  title="Attach image"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>

                <div className="mx-1 h-4 w-px bg-white/10" />

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

                <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-300">
                  <Switch
                    checked={webEnabled}
                    onCheckedChange={setWebEnabled}
                    className="h-5 w-9 data-[state=unchecked]:bg-zinc-700/80 data-[state=checked]:bg-[#6D78E7]"
                  />
                  <span>Web</span>
                </label>

                <label className="ml-1 flex shrink-0 items-center gap-2 text-sm text-zinc-300">
                  <Switch
                    checked={libraryEnabled}
                    onCheckedChange={setLibraryEnabled}
                    className="h-5 w-9 data-[state=unchecked]:bg-zinc-700/80 data-[state=checked]:bg-[#6D78E7]"
                  />
                  <span>Library</span>
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
