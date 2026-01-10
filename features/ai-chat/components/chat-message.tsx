'use client'

import React from 'react'
import { User, Bot } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './markdown-renderer'
import type { ChatMessage } from '../types/chat.types'

interface ChatMessageProps {
  message: ChatMessage
  index: number
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative flex gap-4 select-text',
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-medium border shadow-sm',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground border-primary/20'
            : 'bg-muted/50 text-muted-foreground border-transparent'
        )}
      >
        {message.role === 'user' ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      <div
        className={cn(
          'flex-1 min-w-0 max-w-[85%]',
          message.role === 'user' ? 'text-right' : 'text-left'
        )}
      >
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/30 border border-border/50 text-foreground'
          )}
        >
          {message.role === 'assistant' ? (
            <MarkdownRenderer content={message.content} className="prose-sm dark:prose-invert max-w-none" />
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
