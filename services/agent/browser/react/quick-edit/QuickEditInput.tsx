/**
 * QuickEditInput Component
 * 
 * Inline input for entering quick edit instructions.
 * Designed to be mounted in a Monaco ViewZone.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { QuickEditInputProps } from '../../quick-edit/types'

export const QuickEditInput: React.FC<QuickEditInputProps> = ({
  diffZoneId,
  onSubmit,
  onCancel,
  onHeightChange,
  initialValue = '',
  isLoading = false,
  placeholder = 'Enter instructions...',
}) => {
  const [value, setValue] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Focus textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])
  
  // Observe height changes for ViewZone resizing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.borderBoxSize?.[0]?.blockSize
      if (height && height > 0) {
        onHeightChange(height)
      }
    })
    
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [onHeightChange])
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [value])
  
  const handleSubmit = useCallback(() => {
    if (!value.trim() || isLoading) return
    onSubmit(value.trim())
  }, [value, isLoading, onSubmit])
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }, [handleSubmit, onCancel])
  
  const isEmpty = !value.trim()
  
  return (
    <div ref={containerRef} className="qe-input-container">
      <textarea
        ref={textareaRef}
        className="qe-input-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
      />
      
      <div className="qe-input-actions">
        <span className="qe-input-hint">
          <kbd>↵</kbd> Submit · <kbd>Esc</kbd> Cancel
        </span>
        
        <div className="qe-input-buttons">
          <button
            className="qe-btn qe-btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
            type="button"
          >
            Cancel
          </button>
          <button
            className="qe-btn qe-btn-primary"
            onClick={handleSubmit}
            disabled={isEmpty || isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <span className="qe-spinner" />
                Generating...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickEditInput
