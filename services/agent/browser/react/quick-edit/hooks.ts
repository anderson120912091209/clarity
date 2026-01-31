import { useEffect, type RefObject } from 'react'

/**
 * Focuses the element after a short delay to ensure it's mounted and ready.
 */
export const useAutoFocus = <T extends HTMLElement>(ref: RefObject<T | null>) => {
  useEffect(() => {
    const timer = setTimeout(() => ref.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [ref])
}

/**
 * Observes the element's resize events and reports the new height.
 */
export const useViewZoneResize = <T extends HTMLElement>(
  ref: RefObject<T | null>,
  onHeightChange: (height: number) => void
) => {
  useEffect(() => {
    const container = ref.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.borderBoxSize?.[0]?.blockSize
      if (height && height > 0) {
        onHeightChange(height)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [ref, onHeightChange])
}

/**
 * Automatically adjusts the textarea height based on its content.
 */
export const useAutoResizeTextArea = (
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight: number = 120
) => {
  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [ref, value, maxHeight])
}
