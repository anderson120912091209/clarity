'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export const ChatTypingIndicator: React.FC = () => {
  return (
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
          <span
            className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '-0.3s' }}
          />
          <span
            className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '-0.15s' }}
          />
          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
        </div>
      </div>
    </motion.div>
  )
}
