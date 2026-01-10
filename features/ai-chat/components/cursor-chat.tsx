import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '../hooks/use-chat'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'

interface CursorChatProps {
  isVisible: boolean
  onToggle: () => void
  fileContent: string
}

export const CursorChat: React.FC<CursorChatProps> = ({ isVisible, onToggle, fileContent }) => {
  const { messages, isTyping, sendMessage, clearMessages } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isTyping])

  // Clear messages when closed/re-opened to start fresh context? 
  // Or keep history? "Cursor" usually keeps history per session but "Cmd+K" is often ephemeral.
  // We'll keep history for now.

  return (
    <div className="h-full flex flex-col bg-[#09090b] border-l border-zinc-800 shadow-2xl">
      {/* Header - Minimal usage since it's embedded often */}
      <div className="h-10 px-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-400">
             <Sparkles className="w-3.5 h-3.5" />
             <span className="text-xs font-medium uppercase tracking-wider">AI Edit</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-zinc-500 hover:text-zinc-300">
             <X className="w-3.5 h-3.5" />
          </Button>
      </div>

       {/* Messages */}
       <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8 opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-700">
                <Sparkles className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Cmd+K Mode
              </p>
            </motion.div>
          )}
          
          {messages.map((msg, i) => (
             <ChatMessage key={i} message={msg} />
          ))}

          {isTyping && (
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-2"
             >
                <div className="flex gap-1.5">
                   <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="px-4 py-0 bg-[#09090b]">
          <ChatInput 
            onSend={(msg) => sendMessage(msg, fileContent)}
            disabled={isTyping}
            placeholder="Ask AI to edit code..."
          />
      </div>
    </div>
  )
}

export function ChatNavContent({ onToggle }: { onToggle: () => void }) {
  return (
    <>
      <div 
        className="flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-800/50 text-zinc-400 transition-colors hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer select-none"
        onMouseDown={(e) => e.preventDefault()}
      >
         <Sparkles className="h-4 w-4" />
         <span className="text-xs font-semibold tracking-wide uppercase">Chat</span>
      </div>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="h-7 w-7 rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors text-zinc-500"
      >
        <X className="h-4 w-4" />
      </Button>
    </>
  )
}
