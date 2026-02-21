'use client'
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import LatexError from './latex-error'
import { Loader2 } from 'lucide-react'
import {
  ChatRound,
  ClipboardText,
  DocumentText,
  Download,
  MagnifierZoomIn,
  MagnifierZoomOut,
  Refresh,
  Widget,
} from '@solar-icons/react'
import { savePdfToStorage, savePreviewToStorage } from '@/lib/utils/db-utils'
import { useProject } from '@/contexts/ProjectContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { createPathname } from '@/lib/utils/client-utils'
import { useFrontend } from '@/contexts/FrontendContext'
import { fetchPdf, type SynctexContext } from '@/lib/utils/pdf-utils'
import LatexLoading from './latex-loading'
import LatexCanvas from './latex-canvas'
import { cn } from '@/lib/utils'
import type { SynctexPdfPosition } from '@/lib/utils/synctex-utils'
import {
  DEFAULT_PDF_BACKGROUND_THEME,
  PDF_BACKGROUND_THEME_CHANGE_EVENT,
  getPdfBackgroundThemeStorageKey,
  isPdfBackgroundThemeKey,
  resolvePdfBackgroundTheme,
  type PdfBackgroundThemeKey,
} from '@/lib/constants/pdf-background-themes'
import {
  DEFAULT_PDF_SCALE,
  getPdfScaleStorageKey,
  normalizePdfScale,
} from '@/lib/constants/pdf-scale-preferences'
import { Moon, Sun } from 'lucide-react'

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

const AUTO_PERSIST_IDLE_MS = 1200
const SOLAR_ICON_WEIGHT = 'Linear' as const

// Hook for managing LaTeX compilation state
export function useLatex(liveFileContentOverrides: Record<string, string> = {}) {
  const { user, plan } = useFrontend()
  const { settings } = useDashboardSettings()
  const { project: data, isLoading: isDataLoading, projectId, files } = useProject()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [synctexContext, setSynctexContext] = useState<SynctexContext | null>(null)
  const compileRunRef = useRef(0)
  const activeAutoCompileAbortRef = useRef<AbortController | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const hasHydratedCachedPdfRef = useRef(false)
  const lastAutoCompileFingerprintRef = useRef('')
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPersistRef = useRef<{
    blob: Blob
    pathname: string
    projectId: string
  } | null>(null)
  const isPersistingRef = useRef(false)
  
  const [scale, setScale] = useState(DEFAULT_PDF_SCALE)
  const [pdfDarkMode, setPdfDarkMode] = useState(false)
  const autoFetch = data?.isAutoFetching ?? false
  const effectiveFiles = useMemo(() => {
    if (!Array.isArray(files)) return files
    if (Object.keys(liveFileContentOverrides).length === 0) return files

    return files.map((file: any) => {
      const fileId = typeof file?.id === 'string' ? file.id : null
      if (!fileId) return file

      const overrideContent = liveFileContentOverrides[fileId]
      if (overrideContent === undefined || overrideContent === file.content) return file

      return { ...file, content: overrideContent }
    })
  }, [files, liveFileContentOverrides])
  const hasMainTyp = effectiveFiles?.some((f: any) => f.name === 'main.typ') ?? false
  const shouldAutoPreview = hasMainTyp
    ? settings.defaultTypstAutoCompile
    : autoFetch
  const compileSourceContent =
    effectiveFiles?.find((f: any) => f.name === 'main.tex')?.content ??
    effectiveFiles?.find((f: any) => f.name === 'main.typ')?.content
  const autoCompileFingerprint = useMemo(() => {
    if (!Array.isArray(effectiveFiles)) return ''

    return effectiveFiles
      .filter((file: any) => file?.type === 'file')
      .map((file: any) => `${file.id ?? file.path ?? file.name}:${file.content ?? ''}`)
      .join('\u0001')
  }, [effectiveFiles])

  useEffect(() => {
    hasHydratedCachedPdfRef.current = false
    lastAutoCompileFingerprintRef.current = ''
    setPdfUrl(null)
    setLogs(null)
    setError(null)
    setSynctexContext(null)

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current)
      persistTimeoutRef.current = null
    }
    pendingPersistRef.current = null
  }, [projectId])

  useEffect(() => {
    if (!projectId) return

    const fallbackScale = DEFAULT_PDF_SCALE
    if (typeof window === 'undefined') {
      setScale(fallbackScale)
      return
    }

    const storageKey = getPdfScaleStorageKey(projectId, user?.id)
    const storedScale = window.localStorage.getItem(storageKey)
    if (storedScale !== null) {
      setScale(normalizePdfScale(storedScale, fallbackScale))
      return
    }

    setScale(fallbackScale)
    window.localStorage.setItem(storageKey, String(fallbackScale))
  }, [projectId, user?.id])

  // Hydrate PDF dark mode preference per project
  useEffect(() => {
    if (!projectId) return
    if (typeof window === 'undefined') {
      setPdfDarkMode(settings.defaultPdfDarkMode)
      return
    }
    const storageKey = `pdfDarkMode:${projectId}`
    const stored = window.localStorage.getItem(storageKey)
    if (stored !== null) {
      setPdfDarkMode(stored === 'true')
      return
    }
    setPdfDarkMode(settings.defaultPdfDarkMode)
  }, [projectId, settings.defaultPdfDarkMode])

  const togglePdfDarkMode = useCallback(() => {
    setPdfDarkMode((prev) => {
      const next = !prev
      if (typeof window !== 'undefined' && projectId) {
        window.localStorage.setItem(`pdfDarkMode:${projectId}`, String(next))
      }
      return next
    })
  }, [projectId])

  const setPrivateScale = useCallback(
    (nextScale: number) => {
      const normalized = normalizePdfScale(nextScale, DEFAULT_PDF_SCALE)
      setScale(normalized)
      if (typeof window === 'undefined' || !projectId) return
      window.localStorage.setItem(
        getPdfScaleStorageKey(projectId, user?.id),
        String(normalized)
      )
    },
    [projectId, user?.id]
  )

  // Hydrate cached PDF once per project load.
  useEffect(() => {
    if (isDataLoading || hasHydratedCachedPdfRef.current) {
      return
    }

    hasHydratedCachedPdfRef.current = true
    if (data?.cachedPdfUrl) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setPdfUrl(data.cachedPdfUrl)
    }
  }, [isDataLoading, data?.cachedPdfUrl])

  const flushPendingPersist = useCallback(async () => {
    if (isPersistingRef.current) return

    const pending = pendingPersistRef.current
    if (!pending) return

    pendingPersistRef.current = null
    isPersistingRef.current = true

    try {
      const results = await Promise.allSettled([
        savePdfToStorage(pending.blob, `${pending.pathname}main.pdf`, pending.projectId),
        savePreviewToStorage(pending.blob, `${pending.pathname}preview.webp`, pending.projectId),
      ])
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const target = index === 0 ? 'PDF' : 'preview'
          console.warn(`Failed to persist compiled ${target} artifact:`, result.reason)
        }
      })
    } catch (storageError) {
      console.warn('Failed to persist compiled artifacts:', storageError)
    } finally {
      isPersistingRef.current = false
      if (pendingPersistRef.current) {
        void flushPendingPersist()
      }
    }
  }, [])

  const queuePersist = useCallback(
    (blob: Blob, pathname: string, persistProjectId: string) => {
      pendingPersistRef.current = {
        blob,
        pathname,
        projectId: persistProjectId,
      }

      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }

      persistTimeoutRef.current = setTimeout(() => {
        persistTimeoutRef.current = null
        void flushPendingPersist()
      }, AUTO_PERSIST_IDLE_MS)
    },
    [flushPendingPersist]
  )

  useEffect(
    () => () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      activeAutoCompileAbortRef.current?.abort()
    },
    []
  )

  const compile = useCallback(async ({ mode = 'manual' }: { mode?: 'manual' | 'auto' } = {}) => {
    if (isDataLoading || !user) return
    
    if (!effectiveFiles || (Array.isArray(effectiveFiles) && effectiveFiles.length === 0)) {
      setError('No files available to compile.')
      return
    }

    const runId = ++compileRunRef.current
    const abortController = new AbortController()
    if (mode === 'auto') {
      activeAutoCompileAbortRef.current?.abort()
      activeAutoCompileAbortRef.current = abortController
    }
    
    setIsLoading(true)
    setError(null)
    setLogs(null)
    
    try {
      const { blob, logs, synctex } = await fetchPdf(projectId, effectiveFiles, {
        signal: abortController.signal,
        mode,
        clientUserId: user.id,
        clientUserPlan: plan,
      })
      if (runId !== compileRunRef.current) return

      const url = URL.createObjectURL(blob)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      objectUrlRef.current = url
      setPdfUrl(url)
      setLogs(logs)
      setSynctexContext(synctex)

      const pathname = createPathname(user.id, projectId)

      // Persist only after the stream settles to avoid preview/DB race churn.
      queuePersist(blob, pathname, projectId)
    } catch (error: any) {
      if (abortController.signal.aborted || error?.name === 'AbortError') {
        return
      }
      if (runId !== compileRunRef.current) return
      console.error('Error fetching PDF:', error);
      setError(error instanceof Error ? error.message : String(error))
      if (error.logs) {
        setLogs(error.logs)
      }
    } finally {
      if (runId === compileRunRef.current) {
        setIsLoading(false)
      }
      if (mode === 'auto' && activeAutoCompileAbortRef.current === abortController) {
        activeAutoCompileAbortRef.current = null
      }
    }
  }, [isDataLoading, user, effectiveFiles, projectId, queuePersist, plan])

  // Auto-compile effect
  useEffect(() => {
    if (!shouldAutoPreview || !compileSourceContent || compileSourceContent.trim() === '') {
      return
    }

    if (!autoCompileFingerprint) {
      return
    }

    if (lastAutoCompileFingerprintRef.current === autoCompileFingerprint) {
      return
    }

    const autoCompileDelayMs = hasMainTyp ? 600 : 1000
    const debounceTimer = setTimeout(() => {
      if (lastAutoCompileFingerprintRef.current === autoCompileFingerprint) {
        return
      }
      lastAutoCompileFingerprintRef.current = autoCompileFingerprint
      void compile({ mode: 'auto' })
    }, autoCompileDelayMs)

    return () => {
      clearTimeout(debounceTimer)
      activeAutoCompileAbortRef.current?.abort()
    }
  }, [
    autoCompileFingerprint,
    compileSourceContent,
    shouldAutoPreview,
    hasMainTyp,
    compile,
  ])

  const handleZoomIn = () => {
    setPrivateScale(scale + 0.1)
  }

  const handleZoomOut = () => {
    setPrivateScale(scale - 0.1)
  }

  const handleResetZoom = () => {
    setPrivateScale(DEFAULT_PDF_SCALE)
  }

  const handleDownload = () => {
    if (pdfUrl) {
      fetch(pdfUrl)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${data?.title || 'document'}.pdf`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Error downloading PDF:', error));
    }
  }

  return {
    pdfUrl,
    isLoading,
    error,
    compile,
    scale,
    autoFetch,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleDownload,
    logs,
    synctexContext,
    setPrivateScale,
    pdfDarkMode,
    togglePdfDarkMode,
  }
}

function LogsPanel({ logs, error }: { logs: string | null, error: string | null }) {
  const summary =
    error
      ?.split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? null
  const fullLogs = logs?.trim() ? logs : null

  return (
    <div className="flex flex-col h-full w-full bg-[#090909] text-zinc-300 font-mono text-xs overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <ClipboardText className="w-3.5 h-3.5 text-zinc-400" weight={SOLAR_ICON_WEIGHT} />
          <span className="font-medium">Compilation Logs</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <section className="rounded-lg border border-amber-300/20 bg-amber-200/[0.04] p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-amber-200/75">Summary</p>
          <p className="whitespace-pre-wrap break-words font-sans text-sm text-zinc-100">
            {summary || 'No compilation errors in the latest run.'}
          </p>
        </section>

        <section className="rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-400">Full output.log</p>
          <pre className="whitespace-pre-wrap leading-relaxed opacity-85">
            {fullLogs || 'No compiler log file was generated for this run.'}
          </pre>
        </section>

        {!fullLogs && error ? (
          <section className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-400">Fallback Error Payload</p>
            <pre className="whitespace-pre-wrap leading-relaxed opacity-85">{error}</pre>
          </section>
        ) : null}
      </div>
    </div>
  )
}

interface LatexRendererProps {
  pdfUrl: string | null
  isLoading: boolean
  error: string | null
  scale: number
  onScaleChange: (nextScale: number) => void
  logs?: string | null
  showLogs?: boolean
  header?: React.ReactNode
  scrollRequest?:
    | {
        mode: 'ratio' | 'synctex'
        nonce: number
        ratio?: number
        position?: SynctexPdfPosition
      }
    | null
  highlightRequest?:
    | {
        nonce: number
        boxes: SynctexPdfPosition[]
      }
    | null
  onPdfPointSelect?: (point: { page: number; h: number; v: number }) => void
  isPdfNavigationEnabled?: boolean
  onPdfReady?: () => void
  onAiDebug?: () => void
  isAiDebugging?: boolean
  isAiDebugEnabled?: boolean
  pdfDarkMode?: boolean
}


function LatexRenderer({
  pdfUrl,
  isLoading,
  error,
  scale,
  onScaleChange,
  logs,
  showLogs,
  header,
  scrollRequest,
  highlightRequest,
  onPdfPointSelect,
  isPdfNavigationEnabled = true,
  onPdfReady,
  onAiDebug,
  isAiDebugging = false,
  isAiDebugEnabled = true,
  pdfDarkMode = false,
}: LatexRendererProps) {
  const { project: data, projectId } = useProject();
  const { settings } = useDashboardSettings()
  const [localPdfBackgroundTheme, setLocalPdfBackgroundTheme] = useState<PdfBackgroundThemeKey>(DEFAULT_PDF_BACKGROUND_THEME)
  const pdfBackgroundTheme = resolvePdfBackgroundTheme(localPdfBackgroundTheme)
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [numPages, setNumPages] = useState<number>(0)
  const [loadedPdfUrl, setLoadedPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    const projectTheme = data?.pdfBackgroundTheme
    if (isPdfBackgroundThemeKey(projectTheme)) {
      setLocalPdfBackgroundTheme(projectTheme)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getPdfBackgroundThemeStorageKey(projectId), projectTheme)
      }
      return
    }

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(getPdfBackgroundThemeStorageKey(projectId))
      if (isPdfBackgroundThemeKey(stored)) {
        setLocalPdfBackgroundTheme(stored)
        return
      }
    }

    setLocalPdfBackgroundTheme(settings.defaultPdfBackgroundTheme)
  }, [data?.pdfBackgroundTheme, projectId, settings.defaultPdfBackgroundTheme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string; theme?: string }>).detail
      if (!detail || detail.projectId !== projectId) return
      if (!isPdfBackgroundThemeKey(detail.theme)) return
      setLocalPdfBackgroundTheme(detail.theme)
    }

    window.addEventListener(PDF_BACKGROUND_THEME_CHANGE_EVENT, handleThemeChange)
    return () => {
      window.removeEventListener(PDF_BACKGROUND_THEME_CHANGE_EVENT, handleThemeChange)
    }
  }, [projectId])

  // Trackpad zoom support
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        
        // Calculate new scale
        // Use a smaller step for finer control with trackpad
        const delta = -e.deltaY
        const factor = 0.01 
        const newScale = normalizePdfScale(scale + delta * factor, scale)
        
        // Simple throttling could be done here if needed, 
        // but for now we'll rely on React's batching or rapid updates.
        // We limit the update frequency to avoid flooding
        onScaleChange(newScale)
      }
    }

    // Add passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [onScaleChange, scale])

  useEffect(() => {
    setNumPages(0)
    setLoadedPdfUrl(null)
  }, [pdfUrl])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoadedPdfUrl(pdfUrl)
  }

  const isDocumentReady = Boolean(pdfUrl && loadedPdfUrl === pdfUrl && numPages > 0)

  const options = useMemo(
    () => ({
      cMapUrl: 'cmaps/',
      cMapPacked: true,
    }),
    []
  )

  if (isLoading && !pdfUrl) {
    return (
      <div className="flex flex-col w-full h-full bg-zinc-950/50">
        {header && (
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-[#101011]">
            {header}
          </div>
        )}
        <div className="flex-1 flex justify-center items-center">
           <LatexLoading />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full bg-[#101011]">
        {header && (
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-[#101011]">
            {header}
          </div>
        )}
        
        <div ref={containerRef} className="flex-1 w-[calc(100%-16px)]
        bg-zinc-950/40 m-2 rounded-xl border border-white/10 overflow-hidden shadow-sm flex flex-col relative">
          {showLogs ? (
        <LogsPanel logs={logs ?? null} error={error} />
      ) : isLoading && !pdfUrl ? (
        <LatexLoading />
      ) : error ? (
        <div className="flex justify-center items-start w-full h-full p-4 overflow-auto">
          <LatexError
            error={error}
            onAiDebug={onAiDebug}
            isAiDebugging={isAiDebugging}
            isAiDebugEnabled={isAiDebugEnabled}
          />
        </div>
      ) : pdfUrl ? (
        <div
          className="flex-1 w-full relative overflow-hidden"
          style={{ backgroundColor: pdfBackgroundTheme.panelColor }}
        >
             {/* PDF Pattern Background */}
             <div
               className="absolute inset-0"
               style={{
                 backgroundImage: `radial-gradient(${pdfBackgroundTheme.dotColor} ${pdfBackgroundTheme.dotSize}px, transparent ${pdfBackgroundTheme.dotSize}px)`,
                 backgroundSize: `${pdfBackgroundTheme.dotSpacing}px ${pdfBackgroundTheme.dotSpacing}px`,
               }}
             />
             
             <LatexCanvas
                pdfUrl={pdfUrl}
                onDocumentLoadSuccess={onDocumentLoadSuccess}
                options={options}
                isDocumentReady={isDocumentReady}
                 numPages={numPages}
                 scale={scale}
                 scrollRequest={scrollRequest}
                 highlightRequest={highlightRequest}
                 onPdfPointSelect={onPdfPointSelect}
                 isPdfNavigationEnabled={isPdfNavigationEnabled}
                 onPdfReady={onPdfReady}
                 darkMode={pdfDarkMode}
             />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
           <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-xl">
               <DocumentText className="w-8 h-8 opacity-50" weight={SOLAR_ICON_WEIGHT} />
           </div>
           <p className="text-sm">Ready to compile</p>
        </div>
      )}
        </div>
    </div>
  )
}


export type PdfViewMode = 'docked' | 'floating'
export type ChatViewMode = 'docked' | 'floating'

export function PDFNavContent({
  isLoading,
  autoFetch,
  scale,
  projectId,
  onCompile,
  onChatToggle,
  isChatEnabled = true,
  isChatVisible,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDownload,
  onToggleLogs,
  showLogs,
  pdfViewMode = 'docked',
  onToggleViewMode,
  pdfDarkMode = false,
  onToggleDarkMode,
}: {
  isLoading: boolean
  autoFetch: boolean
  scale: number
  projectId: string
  onCompile: () => void
  onChatToggle?: () => void
  isChatEnabled?: boolean
  isChatVisible?: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onDownload: () => void
  onToggleLogs: () => void
  showLogs: boolean
  pdfViewMode?: PdfViewMode
  onToggleViewMode?: () => void
  pdfDarkMode?: boolean
  onToggleDarkMode?: () => void
}) {
  // Keyboard shortcut for compilation (Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onCompile()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCompile])

  const iconBtnClass = 'h-7 w-7 rounded-md inline-flex items-center justify-center shrink-0 transition-all text-white/40 hover:text-white/80 hover:bg-white/[0.06]'
  const iconBtnActiveClass = 'h-7 w-7 rounded-md inline-flex items-center justify-center shrink-0 transition-all bg-[#1C1D21] border border-white/[0.08] text-[#E4E4E7]'

  return (
    <>
      <div className="flex items-center flex-1 min-w-0" />

      <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar max-w-full pl-2">

        {/* Compile */}
        <Button
          variant="default"
          size="sm"
          onClick={onCompile}
          disabled={isLoading}
          className={cn(
             "h-7 pl-2.5 pr-1 gap-1.5 text-xs font-medium bg-[#6D78E7] hover:bg-[#5E6AD4] text-white transition-all rounded-md shadow-sm shrink-0",
             isLoading ? "opacity-90 cursor-wait" : ""
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white/70" />
          ) : (
            <Refresh className="w-3.5 h-3.5" weight={SOLAR_ICON_WEIGHT} />
          )}
          <span>Compile</span>
          <div className="flex items-center justify-center bg-white/15 rounded px-1.5 py-0.5 ml-0.5">
             <span className="text-[9px] font-semibold text-white/80">⌘S</span>
          </div>
        </Button>

        {/* Toggles */}
        <div className="flex items-center gap-0.5 shrink-0">
          {isChatEnabled ? (
            <button
              onClick={onChatToggle}
              className={cn(
                isChatVisible
                  ? 'h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[12px] font-medium shrink-0 transition-all bg-[#1C1D21] border border-white/[0.08] text-[#E4E4E7]'
                  : 'h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[12px] font-medium shrink-0 transition-all text-white/40 hover:text-white/80 hover:bg-white/[0.06] border border-transparent'
              )}
              title={isChatVisible ? 'Hide AI Chat' : 'Show AI Chat'}
            >
              <ChatRound className="w-3.5 h-3.5" weight={SOLAR_ICON_WEIGHT} />
              <span>Chat</span>
            </button>
          ) : null}

          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className={pdfDarkMode ? iconBtnActiveClass : iconBtnClass}
              title={pdfDarkMode ? 'Switch to light PDF' : 'Switch to dark PDF'}
            >
              {pdfDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onToggleLogs}
            title="View Logs"
            className={showLogs ? iconBtnActiveClass : iconBtnClass}
          >
            <ClipboardText className="w-3.5 h-3.5" weight={SOLAR_ICON_WEIGHT} />
          </button>

          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className={pdfViewMode === 'floating' ? iconBtnActiveClass : iconBtnClass}
              title={pdfViewMode === 'floating' ? 'Dock PDF view' : 'Float PDF view'}
            >
              <Widget className="w-3.5 h-3.5" weight={SOLAR_ICON_WEIGHT} />
            </button>
          )}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-0 shrink-0 bg-white/[0.03] rounded-md border border-white/[0.06] px-0.5">
          <button
            onClick={onZoomOut}
            className="h-6 w-6 rounded inline-flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
          >
            <MagnifierZoomOut className="h-3 w-3" weight={SOLAR_ICON_WEIGHT} />
          </button>

          <span
            className="w-8 text-center text-[10px] font-medium text-white/50 tabular-nums select-none cursor-pointer hover:text-white/80 transition-colors shrink-0"
            onClick={onResetZoom}
          >
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={onZoomIn}
            className="h-6 w-6 rounded inline-flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
          >
            <MagnifierZoomIn className="h-3 w-3" weight={SOLAR_ICON_WEIGHT} />
          </button>
        </div>

        {/* Download */}
        <button
          onClick={onDownload}
          className={iconBtnClass}
          title="Download PDF"
        >
          <Download className="h-3.5 w-3.5" weight={SOLAR_ICON_WEIGHT} />
        </button>
      </div>
    </>
  )
}


export default LatexRenderer
