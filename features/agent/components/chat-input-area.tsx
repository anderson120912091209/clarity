'use client'

import { ArrowUp, Square, Zap } from 'lucide-react'
import { memo, useCallback, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
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

const MIN_HEIGHT = 24
const MAX_HEIGHT = 24 * 6

export const ChatInputArea = memo(function ChatInputArea({
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
  const prevHeightRef = useRef<number>(MIN_HEIGHT)

  // useLayoutEffect avoids the flicker: measure + apply before paint
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Temporarily set to min-height to get accurate scrollHeight
    // without collapsing to 0 (avoids layout thrash)
    textarea.style.height = `${MIN_HEIGHT}px`
    const next = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)

    // Only update if height actually changed
    if (next !== prevHeightRef.current) {
      prevHeightRef.current = next
    }
    textarea.style.height = `${next}px`
  }, [value])

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
    <div className="shrink-0 px-3 pb-3">
      <div
        className={cn(
          'relative rounded-xl border bg-[#141519]',
          // Only transition border/shadow on focus — never height
          'transition-[border-color,box-shadow] duration-150 ease-out',
          'border-white/[0.08]',
          'focus-within:border-[#6d78e7]/50 focus-within:shadow-[0_0_0_1px_rgba(109,120,231,0.18),0_0_12px_rgba(109,120,231,0.06)]',
          disabled && 'opacity-40 pointer-events-none'
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
            'w-full resize-none bg-transparent px-3.5 pt-3 pb-2',
            'text-[13.5px] leading-relaxed text-zinc-100',
            'placeholder:text-zinc-600',
            'focus:outline-none',
            'disabled:cursor-not-allowed'
          )}
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        />

        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
          <Select
            value={selectedModel}
            onValueChange={onModelChange}
            disabled={isSubmitting}
          >
            <SelectTrigger
              className={cn(
                'h-6 w-auto gap-1.5 border-0 bg-transparent px-1.5 text-[11px] text-zinc-600',
                'hover:text-zinc-400 focus:ring-0 focus:ring-offset-0 transition-colors',
                '[&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-50'
              )}
            >
              <Zap className="h-3 w-3 text-zinc-600" />
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
            <button
              type="button"
              onClick={onStop}
              className="h-7 w-7 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              title="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={cn(
                'h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150',
                canSubmit
                  ? 'bg-[#6d78e7] text-white hover:bg-[#5d68d7] shadow-sm shadow-[#6d78e7]/20'
                  : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
              )}
              title="Send message"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
