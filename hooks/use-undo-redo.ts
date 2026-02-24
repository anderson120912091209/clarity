'use client'

import { useRef, useEffect, useCallback } from 'react'

interface UndoableAction {
  label: string
  undo: () => Promise<unknown> | void
  redo: () => Promise<unknown> | void
}

const MAX_STACK = 30

export function useUndoRedo(onToast?: (message: string) => void) {
  const undoStack = useRef<UndoableAction[]>([])
  const redoStack = useRef<UndoableAction[]>([])
  const processing = useRef(false)

  const push = useCallback((action: UndoableAction) => {
    undoStack.current.push(action)
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift()
    // Clear redo on new action
    redoStack.current = []
  }, [])

  const undo = useCallback(async () => {
    if (processing.current || undoStack.current.length === 0) return
    processing.current = true
    try {
      const action = undoStack.current.pop()!
      await action.undo()
      redoStack.current.push(action)
      onToast?.(`Undo: ${action.label}`)
    } finally {
      processing.current = false
    }
  }, [onToast])

  const redo = useCallback(async () => {
    if (processing.current || redoStack.current.length === 0) return
    processing.current = true
    try {
      const action = redoStack.current.pop()!
      await action.redo()
      undoStack.current.push(action)
      onToast?.(`Redo: ${action.label}`)
    } finally {
      processing.current = false
    }
  }, [onToast])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA' ||
        (e.target as HTMLElement)?.getAttribute('contenteditable')
      ) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          void redo()
        } else {
          void undo()
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  return { push, undo, redo }
}
