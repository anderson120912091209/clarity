'use client'

import FloatingWindow from '@/components/ui/floating-window'
import LatexRenderer from './latex'
import type { SynctexPdfPosition } from '@/lib/utils/synctex-utils'

interface FloatingPdfViewerProps {
  pdfUrl: string | null
  isLoading: boolean
  error: string | null
  scale: number
  onScaleChange: (nextScale: number) => void
  logs?: string | null
  showLogs?: boolean
  header?: React.ReactNode
  scrollRequest?: {
    mode: 'ratio' | 'synctex'
    nonce: number
    ratio?: number
    position?: SynctexPdfPosition
  } | null
  highlightRequest?: {
    nonce: number
    boxes: SynctexPdfPosition[]
  } | null
  onPdfPointSelect?: (point: { page: number; h: number; v: number }) => void
  isPdfNavigationEnabled?: boolean
  onPdfReady?: () => void
  onAiDebug?: () => void
  isAiDebugging?: boolean
  isAiDebugEnabled?: boolean
  onClose: () => void
}

export default function FloatingPdfViewer({
  onClose,
  header,
  ...latexProps
}: FloatingPdfViewerProps) {
  return (
    <FloatingWindow
      title="PDF Preview"
      defaultWidth={520}
      defaultHeight={600}
      onClose={onClose}
    >
      {/* PDF toolbar */}
      {header && (
        <div className="flex items-center justify-between px-3 py-1.5 shrink-0 bg-[#101011] border-b border-white/[0.04]">
          {header}
        </div>
      )}

      {/* PDF content */}
      <div className="flex-1 overflow-hidden">
        <LatexRenderer
          {...latexProps}
          header={null}
        />
      </div>
    </FloatingWindow>
  )
}
