//PDF CANVAS on the RIGHT SIDE of the PRODUCT 

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Document, Page, pdfjs } from 'react-pdf'
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useRef, useState } from 'react'
import type { SynctexPdfPosition } from '@/lib/utils/synctex-utils'
import type { MouseEvent } from 'react'

// Ensure worker is initialized
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

export default function LatexCanvas({
  pdfUrl,
  onDocumentLoadSuccess,
  options,
  isDocumentReady,
  numPages,
  scale,
  scrollRequest,
  highlightRequest,
  onPdfPointSelect,
  isPdfNavigationEnabled = true,
  onPdfReady,
}: {
  pdfUrl: string;
  onDocumentLoadSuccess: (result: { numPages: number }) => void;
  options: any;
  isDocumentReady: boolean;
  numPages: number;
  scale: number;
  scrollRequest?:
    | {
        mode: 'ratio' | 'synctex'
        nonce: number
        ratio?: number
        position?: SynctexPdfPosition
      }
    | null;
  highlightRequest?:
    | {
        nonce: number
        boxes: SynctexPdfPosition[]
      }
    | null;
  onPdfPointSelect?: (point: { page: number; h: number; v: number }) => void;
  isPdfNavigationEnabled?: boolean;
  onPdfReady?: () => void;
}) {
  const [workerReady, setWorkerReady] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const pageDimensionsRef = useRef<Record<number, { width: number; height: number }>>({})

  useEffect(() => {
    setDocumentError(null)
    pageContainerRefs.current = {}
    pageDimensionsRef.current = {}
  }, [pdfUrl])

  useEffect(() => {
    // Ensure worker is ready before rendering
    if (typeof window !== 'undefined') {
      // Set worker source if not already set
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      }
      
      // Wait a bit to ensure worker is loaded
      const timer = setTimeout(() => {
        setWorkerReady(true)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!scrollRequest) return
    if (!workerReady || !isDocumentReady || numPages <= 0) return

    const root = scrollAreaRef.current
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
    if (!viewport) return
    const maxScrollTop = viewport.scrollHeight - viewport.clientHeight
    if (maxScrollTop <= 0) return

    if (scrollRequest.mode === 'synctex' && scrollRequest.position) {
      const { page, v } = scrollRequest.position
      const pageContainer = pageContainerRefs.current[page]
      if (pageContainer) {
        const dimensions = pageDimensionsRef.current[page]
        const renderedHeight = pageContainer.getBoundingClientRect().height
        const sourceHeight = dimensions?.height ?? renderedHeight
        const verticalRatio =
          sourceHeight > 0 ? Math.min(1, Math.max(0, v / sourceHeight)) : 0
        const targetTop =
          pageContainer.offsetTop + renderedHeight * verticalRatio - viewport.clientHeight * 0.35
        const clampedTop = Math.min(maxScrollTop, Math.max(0, targetTop))
        viewport.scrollTo({ top: clampedTop, behavior: 'smooth' })
        return
      }
    }

    const ratio = Math.min(1, Math.max(0, scrollRequest.ratio ?? 0))
    viewport.scrollTo({ top: maxScrollTop * ratio, behavior: 'smooth' })
  }, [scrollRequest?.nonce, workerReady, isDocumentReady, numPages])

  const handlePageClick = (pageNumber: number) => (event: MouseEvent<HTMLDivElement>) => {
    if (!isPdfNavigationEnabled) return
    if (!onPdfPointSelect) return

    const pageContainer = pageContainerRefs.current[pageNumber]
    if (!pageContainer) return

    const rect = pageContainer.getBoundingClientRect()
    const relativeX = event.clientX - rect.left
    const relativeY = event.clientY - rect.top
    if (relativeX < 0 || relativeY < 0 || relativeX > rect.width || relativeY > rect.height) {
      return
    }

    const dimensions = pageDimensionsRef.current[pageNumber]
    const sourceWidth = dimensions?.width ?? rect.width
    const sourceHeight = dimensions?.height ?? rect.height
    const h = rect.width > 0 ? (relativeX / rect.width) * sourceWidth : relativeX
    const v = rect.height > 0 ? (relativeY / rect.height) * sourceHeight : relativeY

    onPdfPointSelect({
      page: pageNumber,
      h: Math.max(0, h),
      v: Math.max(0, v),
    })
  }

  const resolveHighlightRects = (pageNumber: number) => {
    if (!highlightRequest?.boxes?.length) return []

    const pageContainer = pageContainerRefs.current[pageNumber]
    if (!pageContainer) return []

    const renderedRect = pageContainer.getBoundingClientRect()
    const renderedWidth = renderedRect.width
    const renderedHeight = renderedRect.height
    if (renderedWidth <= 0 || renderedHeight <= 0) return []

    const dimensions = pageDimensionsRef.current[pageNumber]
    const sourceWidth = dimensions?.width ?? renderedWidth
    const sourceHeight = dimensions?.height ?? renderedHeight
    if (sourceWidth <= 0 || sourceHeight <= 0) return []

    return highlightRequest.boxes
      .filter((box) => box.page === pageNumber)
      .slice(0, 120)
      .map((box, index) => {
        const left = (box.h / sourceWidth) * renderedWidth
        const top = (box.v / sourceHeight) * renderedHeight
        const width = Math.max(8, (box.width / sourceWidth) * renderedWidth)
        const height = Math.max(10, (box.height / sourceHeight) * renderedHeight)

        const clampedLeft = Math.min(Math.max(0, left), Math.max(0, renderedWidth - 2))
        const clampedTop = Math.min(Math.max(0, top), Math.max(0, renderedHeight - 2))
        const clampedWidth = Math.min(width, Math.max(2, renderedWidth - clampedLeft))
        const clampedHeight = Math.min(height, Math.max(2, renderedHeight - clampedTop))

        return {
          id: `${highlightRequest.nonce}-${pageNumber}-${index}-${box.h}-${box.v}`,
          style: {
            left: clampedLeft,
            top: clampedTop,
            width: clampedWidth,
            height: clampedHeight,
          },
        }
      })
  }

  if (!workerReady) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <Skeleton className="w-full h-full max-w-4xl" />
      </div>
    )
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-grow w-full h-full bg-foreground/5">
      <Document
        key={pdfUrl}
        file={pdfUrl}
        onLoadSuccess={(pdf) => {
          setDocumentError(null)
          onDocumentLoadSuccess(pdf)
          onPdfReady?.()
        }}
        onLoadError={(error) => {
          console.error('PDF load error:', error)
          setDocumentError(error.message || 'Failed to load PDF')
        }}
        className="flex flex-col items-center w-full"
        loading={<Skeleton className="w-full h-full max-w-4xl" />}
        options={options}
      >
        {isDocumentReady && numPages > 0 && !documentError && workerReady &&
          Array.from(new Array(numPages), (el, index) => {
            const pageNumber = index + 1
            const highlightRects = resolveHighlightRects(pageNumber)

            return (
              <div
                key={`page_wrapper_${pageNumber}`}
                ref={(node) => {
                  pageContainerRefs.current[pageNumber] = node
                }}
                onClick={handlePageClick(pageNumber)}
                className={`relative mb-4 shadow-lg ${isPdfNavigationEnabled ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <Page
                  key={`page_${pageNumber}`}
                  pageNumber={pageNumber}
                  scale={scale}
                  width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 800) : 800}
                  loading={<Skeleton className="w-full h-[calc(100vh-80px)] mb-4" />}
                  onLoadSuccess={(page) => {
                    const viewport = page.getViewport({ scale: 1 })
                    pageDimensionsRef.current[pageNumber] = {
                      width: viewport.width,
                      height: viewport.height,
                    }
                  }}
                  onRenderError={(error) => {
                    console.error(`Error rendering page ${pageNumber}:`, error)
                    setDocumentError(`Failed to render page ${pageNumber}`)
                  }}
                  onLoadError={(error) => {
                    console.error(`Error loading page ${pageNumber}:`, error)
                    setDocumentError(`Failed to load page ${pageNumber}`)
                  }}
                />
                {highlightRects.length > 0 && (
                  <div className="pointer-events-none absolute inset-0">
                    {highlightRects.map((rect) => (
                      <div
                        key={rect.id}
                        className="absolute bg-amber-300/40"
                        style={rect.style}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        {documentError && (
          <div className="p-4 text-red-500">
            Error loading PDF: {documentError}
          </div>
        )}
      </Document>
      <ScrollBar orientation="horizontal" />
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
