import { useState, useCallback } from 'react'
import { chatService } from '../services/chat-service'
import { Message } from '../types'

export const useChat = (initialMessages: Message[] = []) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string, context: string) => {
    if (!content.trim() || isTyping) return

    const userMessage: Message = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    
    setMessages(newMessages)
    setIsTyping(true)
    setError(null)

    try {
      const { output } = await chatService.chat(newMessages, context)
      
      let assistantContent = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      for await (const _delta of chatService.readStream(output)) {
        const delta = _delta as any
        if (delta?.content) {
          assistantContent += delta.content
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, content: assistantContent }]
          })
        }
        if (delta?.error) {
          setError(delta.error)
          setMessages((prev) => [...prev, { 
            role: 'assistant', 
            content: `Error: ${delta.error}` 
          }])
        }
      }
    } catch (e) {
      console.error('Chat failed:', e)
      setError('Failed to send message')
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setIsTyping(false)
    }
  }, [messages, isTyping])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isTyping,
    error,
    sendMessage,
    clearMessages
  }
}
