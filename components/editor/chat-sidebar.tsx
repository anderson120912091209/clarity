'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, User, Bot, Loader2, ChevronRight, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readStreamableValue } from 'ai/rsc'
import { chat } from '@/app/actions'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './markdown-renderer'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  fileContent: string
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, fileContent }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)

    try {
      const { output } = await chat(newMessages, fileContent)
      
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
          alert(`Chat Error: ${delta.error}`)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 h-full w-[420px] z-[100] bg-[hsl(var(--background))] border-l border-border/50 shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="h-12 px-4 border-b border-border/50 flex items-center justify-between bg-[hsl(var(--muted)/0.2)]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/10 rounded-md">
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">AI Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Context-aware</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-7 w-7 rounded-md hover:bg-muted/50"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-grow overflow-y-auto p-4 space-y-3 scroll-smooth scrollbar-thin"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-6">
                <div className="w-12 h-12 bg-blue-500/5 rounded-2xl flex items-center justify-center animate-pulse">
                  <Sparkles className="h-6 w-6 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground/80">How can I help you?</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed text-balance">
                    I can see your LaTeX code and help you write, fix, or analyze your document.
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={cn(
                  "flex gap-3 max-w-[90%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border",
                  msg.role === 'user' ? "bg-muted" : "bg-blue-500/10 border-blue-500/20"
                )}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-blue-500" />}
                </div>
                <div className={cn(
                  "px-3 py-2.5 rounded-lg text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-blue-500 text-white ml-auto max-w-[85%]" 
                    : "bg-[hsl(var(--muted)/0.3)] border border-border/50 mr-auto max-w-[90%]"
                )}>
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer 
                      content={msg.content} 
                      className="text-foreground"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex gap-3 mr-auto items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500/5 flex items-center justify-center animate-pulse">
                  <Bot className="h-4 w-4 text-blue-500/50" />
                </div>
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-blue-500/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-blue-500/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-blue-500/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[hsl(var(--muted)/0.2)] border-t border-border/50">
            <div className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask about your document..."
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm resize-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[40px] max-h-32 scrollbar-thin"
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
