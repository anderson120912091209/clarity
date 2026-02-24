'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'

interface DragSelectProps {
  children: React.ReactNode
  onSelectionChange: (selectedIds: Set<string>) => void
  enabled?: boolean
  className?: string
}

interface SelectionRect {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export function DragSelect({ children, onSelectionChange, enabled = true, className }: DragSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const rafRef = useRef<number>(0)

  const getSelectableElements = useCallback(() => {
    if (!containerRef.current) return []
    return Array.from(containerRef.current.querySelectorAll('[data-selectable-id]'))
  }, [])

  const getOverlappingIds = useCallback((rect: SelectionRect) => {
    const elements = getSelectableElements()
    const ids = new Set<string>()

    const left = Math.min(rect.startX, rect.currentX)
    const right = Math.max(rect.startX, rect.currentX)
    const top = Math.min(rect.startY, rect.currentY)
    const bottom = Math.max(rect.startY, rect.currentY)

    for (const el of elements) {
      const elRect = el.getBoundingClientRect()
      const overlaps =
        elRect.left < right &&
        elRect.right > left &&
        elRect.top < bottom &&
        elRect.bottom > top

      if (overlaps) {
        const id = el.getAttribute('data-selectable-id')
        if (id) ids.add(id)
      }
    }

    return ids
  }, [getSelectableElements])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled) return
    // Only start drag on the container background, not on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('[data-selectable-id]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('[role="dialog"]')
    ) {
      return
    }

    // Only left click
    if (e.button !== 0) return

    e.preventDefault()
    setIsDragging(true)
    setSelectionRect({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    })
  }, [enabled])

  const pendingIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setSelectionRect((prev) => {
          if (!prev) return null
          const next = { ...prev, currentX: e.clientX, currentY: e.clientY }
          pendingIdsRef.current = getOverlappingIds(next)
          return next
        })
      })
    }

    const handleMouseUp = () => {
      cancelAnimationFrame(rafRef.current)
      setIsDragging(false)
      setSelectionRect(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      cancelAnimationFrame(rafRef.current)
    }
  }, [isDragging, getOverlappingIds])

  // Notify parent after render, outside the state updater
  useEffect(() => {
    if (pendingIdsRef.current) {
      onSelectionChange(pendingIdsRef.current)
      pendingIdsRef.current = null
    }
  }, [selectionRect, onSelectionChange])

  const rectStyle = selectionRect
    ? {
        left: Math.min(selectionRect.startX, selectionRect.currentX),
        top: Math.min(selectionRect.startY, selectionRect.currentY),
        width: Math.abs(selectionRect.currentX - selectionRect.startX),
        height: Math.abs(selectionRect.currentY - selectionRect.startY),
      }
    : null

  return (
    <div ref={containerRef} onMouseDown={handleMouseDown} className={className}>
      {children}
      {isDragging && rectStyle && rectStyle.width > 4 && rectStyle.height > 4 && (
        <div
          className="fixed pointer-events-none z-50 border border-[#6D78E7]/60 bg-[#6D78E7]/10 rounded-sm"
          style={rectStyle}
        />
      )}
    </div>
  )
}
