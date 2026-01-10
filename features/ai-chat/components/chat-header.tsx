'use client'

import React from 'react'
import { X, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatNavContentProps {
  onToggle: () => void
}

export const ChatNavContent: React.FC<ChatNavContentProps> = ({ onToggle }) => {
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
