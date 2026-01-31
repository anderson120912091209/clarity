/**
 * QuickEditContainer Component
 *
 * Main container managing the quick edit lifecycle.
 * Coordinates the input UI, streaming state, and diff display.
 */

import React, { useCallback, useState, useEffect } from 'react'
import { QuickEditInput } from './QuickEditInput'
import type { QuickEditState } from '../../quick-edit/types'

const ERROR_STYLE: React.CSSProperties = {
  padding: '8px 12px',
  marginBottom: '8px',
  background: 'rgba(255, 85, 85, 0.15)',
  border: '1px solid rgba(255, 85, 85, 0.3)',
  borderRadius: '6px',
  color: '#ff5555',
  fontSize: '12px',
}

export interface QuickEditContainerProps {
  diffZoneId: string
  initialState?: QuickEditState
  onSubmit: (instructions: string) => Promise<void>
  onCancel: () => void
  onHeightChange: (height: number) => void
  placeholder?: string
}

export const QuickEditContainer: React.FC<QuickEditContainerProps> = ({
  diffZoneId,
  initialState = 'input',
  onSubmit,
  onCancel,
  onHeightChange,
  placeholder,
}) => {
  const [state, setState] = useState<QuickEditState>(initialState)
  const [error, setError] = useState<string | null>(null)

  // Handle escape key globally when container is mounted
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state === 'input') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state, onCancel])

  const handleSubmit = useCallback(async (instructions: string) => {
    setError(null)
    setState('streaming')

    try {
      await onSubmit(instructions)
      setState('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setState('input')
    }
  }, [onSubmit])

  if (state === 'review' || state === 'idle') {
    return null
  }

  return (
    <div className="qe-container" data-zone-id={diffZoneId}>
      {error && <div className="qe-error" style={ERROR_STYLE}>{error}</div>}

      <QuickEditInput
        diffZoneId={diffZoneId}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        onHeightChange={onHeightChange}
        isLoading={state === 'streaming'}
        placeholder={placeholder}
      />
    </div>
  )
}

export default QuickEditContainer
