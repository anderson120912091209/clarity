'use client'

import { ArrowUp, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ChatInputAreaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  isSubmitting: boolean
  disabled?: boolean
  modelOptions: Array<{ value: string; label: string }>
  selectedModel: string
  onModelChange: (model: string) => void
  placeholder?: string
}

export function ChatInputArea({
  value,
  onChange,
  onSubmit,
  onStop,
  isSubmitting,
  disabled = false,
  modelOptions,
  selectedModel,
  onModelChange,
  placeholder = 'Ask anything...',
}: ChatInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const lineHeight = 24 // ~text-sm leading-6
    const maxRows = 6
    const maxHeight = lineHeight * maxRows
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [value, resizeTextarea])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isSubmitting && !disabled && value.trim()) {
          onSubmit()
        }
      }
    },
    [isSubmitting, disabled, value, onSubmit]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  const canSubmit = !isSubmitting && !disabled && value.trim().length > 0

  return (
    <div className="shrink-0 border-t border-white/5 px-3 pb-3 pt-2">
      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-white/10 bg-[#1b1d26] px-3 py-2',
          'focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10',
          disabled && 'opacity-50'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          rows={1}
          className={cn(
            'w-full resize-none bg-transparent text-sm leading-6 text-zinc-200',
            'placeholder:text-zinc-500',
            'focus:outline-none',
            'disabled:cursor-not-allowed'
          )}
        />

        <div className="flex items-center justify-between">
          <Select
            value={selectedModel}
            onValueChange={onModelChange}
            disabled={isSubmitting}
          >
            <SelectTrigger
              className={cn(
                'h-7 w-auto gap-1 border-white/5 bg-white/5 px-2 text-[11px] text-zinc-400',
                'hover:bg-white/10 hover:text-zinc-300',
                '[&>svg]:h-3 [&>svg]:w-3'
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isSubmitting ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
              onClick={onStop}
              title="Stop generating"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-md',
                canSubmit
                  ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 hover:text-violet-200'
                  : 'text-zinc-600 cursor-not-allowed'
              )}
              onClick={onSubmit}
              disabled={!canSubmit}
              title="Send message"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-zinc-600">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
