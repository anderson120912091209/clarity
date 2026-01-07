'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, Sparkles, X, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readStreamableValue } from 'ai/rsc'
import { chat } from '@/app/actions'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './markdown-renderer'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface CursorChatProps {
  fileContent: string
  isVisible: boolean
  onToggle: () => void
}

export const CursorChat: React.FC<CursorChatProps> = ({ fileContent, isVisible, onToggle }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentFileContent, setCurrentFileContent] = useState(fileContent)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Update file content when it changes
  useEffect(() => {
    setCurrentFileContent(fileContent)
  }, [fileContent])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isVisible])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)

    try {
      const { output } = await chat(newMessages, currentFileContent)
      
      let assistantContent = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      for await (const delta of readStreamableValue(output)) {
        if (delta?.content) {
          assistantContent += delta.content
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, content: assistantContent }]
          })
        }
        if (delta?.error) {
          console.error('Chat Error:', delta.error)
          setMessages((prev) => [...prev, { 
            role: 'assistant', 
            content: `Error: ${delta.error}` 
          }])
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, an error occurred. Please try again.' 
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] border-l border-border/50">
      {/* Header */}
      <div className="h-10 px-3 border-b border-border/50 flex items-center justify-between bg-[hsl(var(--muted)/0.2)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Chat</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-6 w-6 rounded hover:bg-muted/50"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 px-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-foreground">How can I help you?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                I can see your LaTeX code and help you write, fix, or analyze your document.
              </p>
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center",
              msg.role === 'user' 
                ? "bg-blue-500 text-white" 
                : "bg-[hsl(var(--muted)/0.5)] border border-border/50"
            )}>
              {msg.role === 'user' ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-foreground" />
              )}
            </div>
            
            <div className={cn(
              "flex-1 min-w-0",
              msg.role === 'user' ? "flex justify-end" : "flex justify-start"
            )}>
              <div className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                msg.role === 'user'
                  ? "bg-blue-500 text-white"
                  : "bg-[hsl(var(--muted)/0.3)] border border-border/50 text-foreground"
              )}>
                {msg.role === 'assistant' ? (
                  <MarkdownRenderer 
                    content={msg.content} 
                    className="text-foreground prose-sm"
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center bg-[hsl(var(--muted)/0.5)] border border-border/50">
              <Bot className="h-3.5 w-3.5 text-foreground" />
            </div>
            <div className="flex gap-1.5 px-3 py-2 bg-[hsl(var(--muted)/0.3)] border border-border/50 rounded-lg">
              <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border/50 bg-[hsl(var(--muted)/0.2)] flex-shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your document..."
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm resize-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[40px] max-h-[120px] scrollbar-thin"
              rows={1}
            />
          </div>
          <Button 
            size="icon" 
            disabled={!input.trim() || isTyping}
            onClick={handleSend}
            className="h-10 w-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-center text-muted-foreground/60">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

