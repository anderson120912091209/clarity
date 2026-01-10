'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { readStreamableValue } from 'ai/rsc'
import { chat } from '../services/chat-api'
import type { ChatMessage, ChatStreamDelta } from '../types/chat.types'

interface UseChatOptions {
  fileContent: string
  onError?: (error: string) => void
}

interface UseChatReturn {
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  handleSend: () => Promise<void>
  clearMessages: () => void
}

/**
 * Main hook for managing chat state and logic
 */
export function useChat({ fileContent, onError }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      id: `user-${Date.now()}`,
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const { output } = await chat(newMessages, fileContent)

      let assistantContent = ''
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        id: `assistant-${Date.now()}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      for await (const delta of readStreamableValue(output)) {
        if (delta && typeof delta === 'object') {
          if ('content' in delta && delta.content) {
            assistantContent += delta.content
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last?.role === 'assistant') {
                return [...prev.slice(0, -1), { ...last, content: assistantContent }]
              }
              return prev
            })
          }
          if ('error' in delta && delta.error) {
            const errorMessage: ChatMessage = {
              role: 'assistant',
              content: `Error: ${delta.error}`,
              id: `error-${Date.now()}`,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev.slice(0, -1), errorMessage])
            onError?.(String(delta.error))
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
        id: `error-${Date.now()}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
      onError?.(error.message || 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, fileContent, isLoading, onError])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSend,
    clearMessages,
  }
}

