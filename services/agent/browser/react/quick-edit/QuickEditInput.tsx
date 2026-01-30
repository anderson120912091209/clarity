/**
 * QuickEditInput Component
 * 
 * Inline input for entering quick edit instructions.
 * Designed to be mounted in a Monaco ViewZone.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { QuickEditInputProps } from '../../quick-edit/types'

// Icons
const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
)

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
     <line x1="18" y1="6" x2="6" y2="18"></line>
     <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export const QuickEditInput: React.FC<QuickEditInputProps> = ({
  diffZoneId,
  onSubmit,
  onCancel,
  onHeightChange,
  initialValue = '',
  isLoading = false,
  placeholder = 'Edit selected code...',
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
      <button className="qe-close-btn" onClick={onCancel} type="button">
        <XIcon />
      </button>

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
      
      <div className="qe-input-footer">
        <div className="qe-footer-left">
           <button className="qe-dropdown-btn" type="button">
             Auto <ChevronDownIcon />
           </button>
        </div>
        
        <div className="qe-footer-right">
           <button 
             className="qe-action-btn-secondary" 
             onClick={onCancel}
             type="button"
           >
             Cancel
           </button>
           <button
             className="qe-action-btn-primary"
             onClick={handleSubmit}
             disabled={isEmpty || isLoading}
             type="button"
           >
             {isLoading ? <span className="qe-spinner" /> : 'Submit'}
           </button>
        </div>
      </div>
    </div>
  )
}

export default QuickEditInput
