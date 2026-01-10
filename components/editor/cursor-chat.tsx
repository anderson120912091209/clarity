'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, Sparkles, X, MessageSquare, Paperclip, ChevronDown, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readStreamableValue } from 'ai/rsc'
import { chat } from '@/app/actions'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './markdown-renderer'
import { motion, AnimatePresence } from 'framer-motion'

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

  useEffect(() => {
    setCurrentFileContent(fileContent)
  }, [fileContent])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isTyping])

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
    <div className="chat-container h-full flex flex-col bg-background/95 backdrop-blur-sm border-l border-border/50 font-sans">
      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8 opacity-60"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">AI Assistant</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask questions about your code, debug issues, or generate new snippets.
                </p>
              </div>
            </motion.div>
          )}
          
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "group relative flex gap-4 select-text",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-medium border shadow-sm",
                msg.role === 'user' 
                  ? "bg-primary text-primary-foreground border-primary/20" 
                  : "bg-muted/50 text-muted-foreground border-transparent"
              )}>
                {msg.role === 'user' ? (
                   <User className="w-4 h-4" />
                ) : (
                   <Bot className="w-4 h-4" />
                )}
              </div>
              
              <div className={cn(
                "flex-1 min-w-0 max-w-[85%]",
                msg.role === 'user' ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 border border-border/50 text-foreground"
                )}>
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer 
                      content={msg.content} 
                      className="prose-sm dark:prose-invert max-w-none"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-muted/50 border border-transparent">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="inline-block rounded-2xl px-4 py-3 bg-muted/30 border border-border/50">
               <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
               </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/95 border-t border-border/40 shrink-0">
        <div className="relative group rounded-xl border border-border/50 bg-muted/20 shadow-sm focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/40 focus-within:bg-background transition-all">
            <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything (Cmd+L)..."
            className="w-full bg-transparent border-none rounded-xl px-4 py-3 text-sm resize-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground/40 min-h-[50px] max-h-[200px] scrollbar-thin"
            rows={1}
            onSelect={(e) => {
              // Allow text selection in textarea for editing
            }}
          />
          
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
               <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50">
                  <Paperclip className="h-3.5 w-3.5" />
               </Button>
               <div className="h-4 w-[1px] bg-border mx-1" />
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-muted-foreground border border-border/30">
                  <span className="max-w-[100px] truncate">Current Content</span>
               </div>
            </div>

            <Button 
              size="icon" 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={cn(
                "h-7 w-7 rounded-md transition-all duration-200",
                input.trim() 
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-center text-muted-foreground/40 font-medium">
          AI can make mistakes. Please check important info.
        </p>
      </div>
    </div>
  )
}

export function ChatNavContent({ onToggle }: { onToggle: () => void }) {
  return (
    <>
      <div 
        className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/80 cursor-pointer select-none"
        onMouseDown={(e) => e.preventDefault()}
      >
         <MessageSquare className="h-4 w-4" />
         <span className="text-xs font-semibold tracking-wide uppercase">Chat</span>
      </div>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
      >
        <X className="h-4 w-4" />
      </Button>
    </>
  )
}

