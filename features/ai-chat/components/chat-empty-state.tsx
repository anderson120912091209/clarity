'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface ChatEmptyStateProps {
  title?: string
  description?: string
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  title = 'AI Assistant',
  description = 'Ask questions about your code, debug issues, or generate new snippets.',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8 opacity-60"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}
