'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2, X, GripHorizontal } from 'lucide-react'

interface FloatingWindowProps {
  title: string
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
  /** Initial position offset from center. Positive = right/down from center. */
  initialOffset?: { x: number; y: number }
  onClose: () => void
  children: React.ReactNode
}

export default function FloatingWindow({
  title,
  defaultWidth = 520,
  defaultHeight = 600,
  minWidth = 360,
  minHeight = 300,
  initialOffset = { x: 0, y: 0 },
  onClose,
  children,
}: FloatingWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    startLeft: number
    startTop: number
  } | null>(null)
  const resizeRef = useRef<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    startPosX: number
    startPosY: number
    direction: string
  } | null>(null)

  const [position, setPosition] = useState({ x: -1, y: -1 })
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })
  const [isMaximized, setIsMaximized] = useState(false)
  const [preMaximizeState, setPreMaximizeState] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Center on mount with optional offset
  useEffect(() => {
    if (position.x === -1 && position.y === -1) {
      const x = Math.max(20, (window.innerWidth - size.width) / 2 + initialOffset.x)
      const y = Math.max(20, (window.innerHeight - size.height) / 2 + initialOffset.y)
      setPosition({ x, y })
    }
  }, [position.x, position.y, size.width, size.height, initialOffset.x, initialOffset.y])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return
      e.preventDefault()
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: position.x,
        startTop: position.y,
      }
    },
    [isMaximized, position]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        setPosition({
          x: Math.max(0, dragRef.current.startLeft + dx),
          y: Math.max(0, dragRef.current.startTop + dy),
        })
      }
      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX
        const dy = e.clientY - resizeRef.current.startY
        const dir = resizeRef.current.direction

        let newWidth = resizeRef.current.startWidth
        let newHeight = resizeRef.current.startHeight
        let newX = resizeRef.current.startPosX
        let newY = resizeRef.current.startPosY

        if (dir.includes('e')) newWidth = Math.max(minWidth, resizeRef.current.startWidth + dx)
        if (dir.includes('s')) newHeight = Math.max(minHeight, resizeRef.current.startHeight + dy)
        if (dir.includes('w')) {
          newWidth = Math.max(minWidth, resizeRef.current.startWidth - dx)
          newX = resizeRef.current.startPosX + (resizeRef.current.startWidth - newWidth)
        }
        if (dir.includes('n')) {
          newHeight = Math.max(minHeight, resizeRef.current.startHeight - dy)
          newY = resizeRef.current.startPosY + (resizeRef.current.startHeight - newHeight)
        }

        setSize({ width: newWidth, height: newHeight })
        setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) })
      }
    }

    const handleMouseUp = () => {
      dragRef.current = null
      resizeRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [minWidth, minHeight])

  const handleResizeStart = useCallback(
    (direction: string) => (e: React.MouseEvent) => {
      if (isMaximized) return
      e.preventDefault()
      e.stopPropagation()
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: size.width,
        startHeight: size.height,
        startPosX: position.x,
        startPosY: position.y,
        direction,
      }
    },
    [isMaximized, size, position]
  )

  const handleToggleMaximize = useCallback(() => {
    if (isMaximized && preMaximizeState) {
      setPosition({ x: preMaximizeState.x, y: preMaximizeState.y })
      setSize({ width: preMaximizeState.width, height: preMaximizeState.height })
      setPreMaximizeState(null)
      setIsMaximized(false)
    } else {
      setPreMaximizeState({
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      })
      setPosition({ x: 16, y: 16 })
      setSize({
        width: window.innerWidth - 32,
        height: window.innerHeight - 32,
      })
      setIsMaximized(true)
    }
  }, [isMaximized, position, size, preMaximizeState])

  const handleTitleDoubleClick = useCallback(() => {
    handleToggleMaximize()
  }, [handleToggleMaximize])

  if (position.x === -1) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.08] bg-[#101011]"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Title bar - draggable */}
      <div
        className="flex items-center justify-between h-9 px-2 bg-[#1a1a1b] border-b border-white/[0.06] cursor-grab active:cursor-grabbing select-none shrink-0"
        onMouseDown={handleDragStart}
        onDoubleClick={handleTitleDoubleClick}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="text-[11px] font-medium text-zinc-400 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMaximize}
            className="h-6 w-6 rounded text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isMaximized ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 rounded text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Resize handles */}
      {!isMaximized && (
        <>
          <div
            className="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize hover:bg-[#6D78E7]/20 transition-colors"
            onMouseDown={handleResizeStart('e')}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize hover:bg-[#6D78E7]/20 transition-colors"
            onMouseDown={handleResizeStart('s')}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize hover:bg-[#6D78E7]/30 transition-colors rounded-br-xl"
            onMouseDown={handleResizeStart('se')}
          />
          <div
            className="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize hover:bg-[#6D78E7]/20 transition-colors"
            onMouseDown={handleResizeStart('w')}
          />
          <div
            className="absolute top-0 left-0 w-full h-1.5 cursor-ns-resize hover:bg-[#6D78E7]/20 transition-colors"
            onMouseDown={handleResizeStart('n')}
          />
          <div
            className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize hover:bg-[#6D78E7]/30 transition-colors rounded-tl-xl"
            onMouseDown={handleResizeStart('nw')}
          />
          <div
            className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize hover:bg-[#6D78E7]/30 transition-colors rounded-tr-xl"
            onMouseDown={handleResizeStart('ne')}
          />
          <div
            className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize hover:bg-[#6D78E7]/30 transition-colors rounded-bl-xl"
            onMouseDown={handleResizeStart('sw')}
          />
        </>
      )}
    </div>
  )
}
