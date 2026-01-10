'use client'

import React, { useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useChat } from '../hooks/useChat'
import { ChatMessageComponent } from './chat-message'
import { ChatEmptyState } from './chat-empty-state'
import { ChatTypingIndicator } from './chat-typing-indicator'
import { ChatInput } from './chat-input'
import { ChatNavContent } from './chat-header'
import type { ChatPanelProps } from '../types/chat.types'

export const ChatPanel: React.FC<ChatPanelProps> = ({ fileContent, isVisible, onToggle }) => {
  const { messages, input, setInput, isLoading, handleSend } = useChat({
    fileContent,
    onError: (error) => {
      console.error('Chat error:', error)
    },
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && isVisible) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, isLoading, isVisible])

  if (!isVisible) {
    return null
  }

  return (
    <div className="chat-container h-full flex flex-col bg-background/95 backdrop-blur-sm border-l border-border/50 font-sans">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && <ChatEmptyState />}

          {messages.map((msg, i) => (
            <ChatMessageComponent key={msg.id || i} message={msg} index={i} />
          ))}

          {isLoading && <ChatTypingIndicator />}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isLoading}
      />
    </div>
  )
}

// Export ChatNavContent from here for convenience
export { ChatNavContent } from './chat-header'

