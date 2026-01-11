'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Send, Plus, Mic, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ChatInputProps } from '../types/chat.types'

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Ask anything (⌘L), @ to mention, / for workflows',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState('Planning')
  const [model, setModel] = useState('Gemini 3 Pro (Low)')

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      // Use a smaller default height when empty
      const newHeight = value ? Math.min(textareaRef.current.scrollHeight, 200) : 40
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="px-3 py-2 shrink-0 w-full">
      <div className="relative group rounded-xl border border-zinc-400/20
      bg-[#232324] shadow-sm focus-within:ring-1 focus-within:ring-primary/20 
      focus-within:border-primary/20 focus-within:bg-[#232324] transition-all">

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent border-none rounded-xl pl-3 pr-6 py-2.5
             text-sm resize-none focus:ring-0 focus:outline-none 
             placeholder:text-muted-foreground/40 placeholder:whitespace-nowrap overflow-hidden
             min-h-[24px] max-h-[200px] scrollbar-thin text-white"
            rows={1}
          />
          {/* Gradient fade on the right */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#232324] to-transparent pointer-events-none rounded-r-xl" />
        </div>

        <div className="flex items-center justify-between px-1 pb-1">
          {/* Left Side Controls */}
          <div className="flex items-center gap-2 overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-white hover:text-white hover:bg-white/10 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          

            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-auto w-auto px-1 py-0.5 text-xs border-none bg-transparent text-white hover:bg-white/10 focus:ring-0 focus:ring-offset-0 shadow-none gap-1 [&>svg]:opacity-70 [&>svg]:h-3 [&>svg]:w-3 min-w-0 shrink">
                <ChevronUp className="h-3 w-3 opacity-70 shrink-0" />
                <span className="truncate hidden sm:inline">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="Gemini 3 Pro (Low)" className="text-white focus:bg-zinc-800">Gemini 3 Pro (Low)</SelectItem>
                <SelectItem value="Gemini 3 Pro (Medium)" className="text-white focus:bg-zinc-800">Gemini 3 Pro (Medium)</SelectItem>
                <SelectItem value="Gemini 3 Pro (High)" className="text-white focus:bg-zinc-800">Gemini 3 Pro (High)</SelectItem>
                <SelectItem value="Gemini 2.0 Flash" className="text-white focus:bg-zinc-800">Gemini 2.0 Flash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-white hover:text-white hover:bg-white/10 shrink-0"
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
            
            <Button
              size="icon"
              onClick={onSend}
              disabled={disabled || !value.trim()}
              className={cn(
                'h-6 w-6 rounded-full transition-all duration-200 shrink-0',
                value.trim()
                  ? 'bg-white text-zinc-900 shadow-sm hover:bg-white/90'
                  : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 cursor-not-allowed'
              )}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
