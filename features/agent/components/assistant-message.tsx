'use client'

import { Bot } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { TrackedToolCall } from '@/features/agent/types/chat.types'
import type { FileEditDelta } from '@/services/agent/browser/chat/chatService'
import { ChatMarkdown } from './chat-markdown'
import { ThinkingBlock } from './thinking-block'
import { AgentActivityPanel } from './agent-activity-panel'
import { MessageActions } from './message-actions'

interface AssistantMessageProps {
  id: string
  content: string
  thinking?: string
  toolCalls?: TrackedToolCall[]
  fileEdits?: FileEditDelta[]
  isStreaming?: boolean
  onCopy?: (content: string) => void
  onRetry?: (messageId: string) => void
  onInsertCode?: (code: string) => void
}

export function AssistantMessage({
  id,
  content,
  thinking,
  toolCalls,
  fileEdits,
  isStreaming = false,
  onCopy,
  onRetry,
  onInsertCode,
}: AssistantMessageProps) {
  const hasThinking = Boolean(thinking)
  const hasToolCalls = Boolean(toolCalls && toolCalls.length > 0)
  const hasContent = Boolean(content.trim())

  return (
    <div className="group flex items-start gap-3 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">Assistant</span>
        </div>

        <div className="mt-1">
          {hasThinking && (
            <ThinkingBlock
              thinking={thinking!}
              isStreaming={isStreaming}
              defaultOpen={isStreaming}
            />
          )}

          {hasToolCalls && (
            <AgentActivityPanel
              toolCalls={toolCalls!}
              isStreaming={isStreaming}
            />
          )}

          {hasContent && (
            <ChatMarkdown content={content} />
          )}

          {!hasContent && isStreaming && (
            <div className="flex items-center gap-2 py-2 text-xs text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
              </span>
              <span>Generating...</span>
            </div>
          )}
        </div>

        {!isStreaming && hasContent && (
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <MessageActions
              content={content}
              messageId={id}
              onCopy={onCopy}
              onRetry={onRetry}
            />
          </div>
        )}
      </div>
    </div>
  )
}
