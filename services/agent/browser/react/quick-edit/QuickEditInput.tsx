/**
 * QuickEditInput Component
 *
 * Inline input for entering quick edit instructions.
 * Designed to be mounted in a Monaco ViewZone.
 */

import React, { useCallback, useRef, useState } from 'react'
import type { QuickEditInputProps } from '../../quick-edit/types'
import { ChevronDownIcon, XIcon } from './icons'
import { useAutoFocus, useAutoResizeTextArea, useViewZoneResize } from './hooks'

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

  useAutoFocus(textareaRef)
  useViewZoneResize(containerRef, onHeightChange)
  useAutoResizeTextArea(textareaRef, value)

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
             disabled={!value.trim() || isLoading}
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
