'use client'

import { ArrowUp, Square, Zap } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ChatInputAreaProps {
  onSubmit: (text: string) => void
  onStop: () => void
  isSubmitting: boolean
  disabled?: boolean
  modelOptions: Array<{ value: string; label: string }>
  selectedModel: string
  onModelChange: (model: string) => void
  placeholder?: string
}

export interface ChatInputAreaHandle {
  clear: () => void
  focus: () => void
}

const MAX_HEIGHT = 24 * 6

export const ChatInputArea = forwardRef<ChatInputAreaHandle, ChatInputAreaProps>(
  function ChatInputArea(
    {
      onSubmit,
      onStop,
      isSubmitting,
      disabled = false,
      modelOptions,
      selectedModel,
      onModelChange,
      placeholder = 'Ask anything...',
    },
    ref
  ) {
    const [value, setValue] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    useImperativeHandle(ref, () => ({
      clear() {
        setValue('')
      },
      focus() {
        textareaRef.current?.focus()
      },
    }))

    // Resize: fit placeholder when empty, grow as you type
    useLayoutEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.style.height = '0px'
      const next = Math.min(textarea.scrollHeight, value ? MAX_HEIGHT : MAX_HEIGHT / 2)
      textarea.style.height = `${next}px`
    }, [value])

    const canSubmit = !isSubmitting && !disabled && value.trim().length > 0

    const handleSubmit = useCallback(() => {
      const text = value.trim()
      if (!text || isSubmitting || disabled) return
      onSubmit(text)
    }, [value, isSubmitting, disabled, onSubmit])

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSubmit()
        }
      },
      [handleSubmit]
    )

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value)
      },
      []
    )

    return (
      <div className="shrink-0 px-3 pb-3">
        <div
          className={cn(
            'relative rounded-xl border bg-[#161616]',
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
              'w-full resize-none bg-transparent px-3 py-2',
              'text-[13px] leading-snug text-zinc-100',
              'placeholder:text-zinc-600',
              'focus:outline-none',
              'disabled:cursor-not-allowed'
            )}
            style={{ maxHeight: MAX_HEIGHT }}
          />

          {/* Toolbar — compact single row */}
          <div className="flex items-center justify-between px-2 pb-1.5">
            <Select
              value={selectedModel}
              onValueChange={onModelChange}
              disabled={isSubmitting}
            >
              <SelectTrigger
                className={cn(
                  'h-5 w-auto gap-1 border-0 bg-transparent px-1 text-[10px] text-zinc-600',
                  'hover:text-zinc-400 focus:ring-0 focus:ring-offset-0 transition-colors',
                  '[&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:opacity-50'
                )}
              >
                <Zap className="h-2.5 w-2.5 text-zinc-600" />
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
                className="h-6 w-6 rounded-md flex items-center justify-center bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                title="Stop generating"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'h-6 w-6 rounded-md flex items-center justify-center transition-all duration-150',
                  canSubmit
                    ? 'bg-[#6d78e7] text-white hover:bg-[#5d68d7] shadow-sm shadow-[#6d78e7]/20'
                    : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                )}
                title="Send message"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
)
