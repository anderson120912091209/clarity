/**
 * AcceptRejectWidget Component
 *
 * Inline buttons for accepting or rejecting a diff.
 * Positioned at the end of the diff region.
 */

import React, { useCallback } from 'react'
import type { AcceptRejectWidgetProps } from '../../quick-edit/types'

export const AcceptRejectWidget: React.FC<AcceptRejectWidgetProps> = ({
  diffId,
  onAccept,
  onReject,
  acceptLabel = 'Keep ⌘Y',
  rejectLabel = 'Undo ⌘N',
}) => {

  const handleAccept = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAccept()
  }, [onAccept])

  const handleReject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onReject()
  }, [onReject])

  // Inline styles for the specific look requested
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#1e1e1e', // Dark background
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    border: '1px solid #333',
    fontSize: '11px',
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    height: '24px', // Fixed small height
    overflow: 'hidden', // Enforce shape
  }

  const rejectBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderRight: '1px solid #333', // Separator
    color: '#ccc',
    cursor: 'pointer',
    padding: '0 10px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'background 0.2s, color 0.2s',
  }

  const acceptBtnStyle: React.CSSProperties = {
    background: '#6D78E7', // Updated color
    backgroundColor: '#6D78E7',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: '0 10px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'background 0.2s',
  }

  return (
    <div style={containerStyle} data-diff-id={diffId} onClick={(e) => e.stopPropagation()}>
      <button
        style={rejectBtnStyle}
        onClick={handleReject}
        title="Reject change (⌘N)"
        type="button"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.backgroundColor = '#333'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#ccc'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {rejectLabel}
      </button>
      <button
        style={acceptBtnStyle}
        onClick={handleAccept}
        title="Accept change (⌘Y)"
        type="button"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5c66c4')} // Slightly darker on hover
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6D78E7')}
      >
        {acceptLabel}
      </button>
    </div>
  )
}

export default AcceptRejectWidget
