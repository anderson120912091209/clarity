import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useChat } from '../hooks/use-chat'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  fileContent: string // Context for the AI
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, fileContent }) => {
  const { messages, isTyping, sendMessage } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 h-full w-[450px] z-[100] bg-[#09090b] border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="h-14 px-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">AI Companion</h3>
                <p className="text-[11px] text-zinc-500 font-medium">Context-aware assistant</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-grow overflow-y-auto p-5 space-y-6 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-10 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-xl">
                       <Sparkles className="h-8 w-8 text-blue-500" />
                    </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg text-zinc-100 tracking-tight">How can I help you?</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed text-balance">
                    I have context of your current file. Ask me to explain code, find bugs, or generate new features.
                  </p>
                </div>
                
                {/* Suggestions chips */}
                <div className="flex flex-wrap justify-center gap-2 pt-4">
                  {['Explain this file', 'Find bugs', 'Refactor code'].map((suggestion) => (
                    <button 
                        key={suggestion}
                        onClick={() => sendMessage(suggestion, fileContent)}
                        className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                    >
                        {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                     <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5 h-8 px-2">
                     <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                     <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                     <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                  </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-5 bg-[#09090b] border-t border-zinc-800/50">
             <ChatInput 
                onSend={(msg) => sendMessage(msg, fileContent)} 
                disabled={isTyping} 
                fileContext={fileContent ? "Active File" : undefined}
             />
             <div className="mt-3 flex justify-center">
                <p className="text-[10px] text-zinc-600 font-medium">Use <kbd className="font-sans text-zinc-500">Shift + Enter</kbd> for new line</p>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
