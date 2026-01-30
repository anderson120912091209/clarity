/**
 * AcceptRejectWidget Component
 * 
 * Inline buttons for accepting or rejecting a diff.
 * Positioned at the start of the diff region.
 */

import React, { useCallback } from 'react'
import type { AcceptRejectWidgetProps } from '../../quick-edit/types'

export const AcceptRejectWidget: React.FC<AcceptRejectWidgetProps> = ({
  diffId,
  onAccept,
  onReject,
  startLine,
  acceptLabel = '✓',
  rejectLabel = '✕',
}) => {
  const handleAccept = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAccept()
  }, [onAccept])
  
  const handleReject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onReject()
  }, [onReject])
  
  return (
    <div className="qe-accept-reject-widget" data-diff-id={diffId}>
      <button
        className="qe-widget-btn qe-widget-btn-accept"
        onClick={handleAccept}
        title="Accept change (⌘⏎)"
        type="button"
      >
        {acceptLabel}
      </button>
      <button
        className="qe-widget-btn qe-widget-btn-reject"
        onClick={handleReject}
        title="Reject change (⌘⌫)"
        type="button"
      >
        {rejectLabel}
      </button>
    </div>
  )
}

export default AcceptRejectWidget
