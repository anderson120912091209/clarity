'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import LatexError from './latex-error'
import { Label } from '@/components/ui/label'
import { ZoomIn, ZoomOut, RotateCcw, Play, Loader2, Download, FileType } from 'lucide-react'
import { savePdfToStorage, savePreviewToStorage } from '@/lib/utils/db-utils'
import { useProject } from '@/contexts/ProjectContext'
import { createPathname } from '@/lib/utils/client-utils'
import { useFrontend } from '@/contexts/FrontendContext'
import { fetchPdf } from '@/lib/utils/pdf-utils'
import LatexLoading from './latex-loading'
import LatexCanvas from './latex-canvas'
import { updateProject } from '@/hooks/data'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

// Hook for managing LaTeX compilation state
export function useLatex() {
  const { user } = useFrontend()
  const { project: data, isLoading: isDataLoading, projectId, files } = useProject()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const scale = data?.projectScale ?? 0.9
  const autoFetch = data?.isAutoFetching ?? false
  const latex = files?.find((f: any) => f.name === 'main.tex')?.content

  // Initial load of cached PDF
  useEffect(() => {
    if (!isDataLoading && data?.cachedPdfUrl) {
      setPdfUrl(data.cachedPdfUrl)
    }
  }, [isDataLoading, data])

  const compile = async () => {
    if (isDataLoading || !user) return
    
    if (!files || (Array.isArray(files) && files.length === 0)) {
      setError('No files available to compile.')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const blob = await fetchPdf(files);
      const pathname = createPathname(user.id, projectId)
      await savePdfToStorage(blob, pathname + 'main.pdf', projectId)
      await savePreviewToStorage(blob, pathname + 'preview.webp', projectId)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (error) {
      console.error('Error fetching PDF:', error);
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-compile effect
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout
    const resetTimer = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (autoFetch && latex && latex.trim() !== '') {
          compile()
        }
      }, 1000)
    }
    resetTimer()
    return () => clearTimeout(debounceTimer)
  }, [latex, autoFetch, isDataLoading, user])

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.1, 2.0)
    updateProject(projectId, { projectScale: newScale })
  }

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.1, 0.5)
    updateProject(projectId, { projectScale: newScale })
  }

  const handleResetZoom = () => {
    updateProject(projectId, { projectScale: 0.9 })
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
    handleDownload
  }
}

interface LatexRendererProps {
  pdfUrl: string | null
  isLoading: boolean
  error: string | null
}


function LatexRenderer({ pdfUrl, isLoading, error }: LatexRendererProps) {
  const { project: data, projectId } = useProject();
  const scale = data?.projectScale ?? 0.9;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [numPages, setNumPages] = useState<number>(0)
  const [isDocumentReady, setIsDocumentReady] = useState(false)

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
        const newScale = Math.min(Math.max(0.5, scale + delta * factor), 3.0)
        
        // Simple throttling could be done here if needed, 
        // but for now we'll rely on React's batching or rapid updates.
        // We limit the update frequency to avoid flooding
        updateProject(projectId, { projectScale: newScale })
      }
    }

    // Add passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [scale, projectId])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsDocumentReady(true)
  }

  const options = useMemo(
    () => ({
      cMapUrl: 'cmaps/',
      cMapPacked: true,
    }),
    []
  )

  if (isLoading && !pdfUrl) {
    return (
      <div className="flex justify-center items-center w-full h-full bg-zinc-950/50">
        <LatexLoading />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col h-[calc(100%-16px)] w-[calc(100%-16px)]
     bg-zinc-950/40 m-2 rounded-xl border border-white/10 overflow-hidden shadow-sm">
      {isLoading && !pdfUrl ? (
        <LatexLoading />
      ) : error ? (
        <div className="flex justify-center items-start w-full h-full p-4 overflow-auto">
          <LatexError error={error} />
        </div>
      ) : pdfUrl ? (
        <div className="flex-1 w-full relative bg-zinc-900/30 overflow-hidden">
             {/* PDF Pattern Background */}
             <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px]" />
             
             <LatexCanvas
                pdfUrl={pdfUrl}
                onDocumentLoadSuccess={onDocumentLoadSuccess}
                options={options}
                isDocumentReady={isDocumentReady}
                numPages={numPages}
                scale={scale}
             />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
           <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-xl">
               <FileType className="w-8 h-8 opacity-50" />
           </div>
           <p className="text-sm">Ready to compile</p>
        </div>
      )}
    </div>
  )
}

export function PDFNavContent({
  isLoading,
  autoFetch,
  scale,
  projectId,
  onCompile,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDownload
}: {
  isLoading: boolean
  autoFetch: boolean
  scale: number
  projectId: string
  onCompile: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onDownload: () => void
}) {
  return (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">PDF Preview</span>
        </div>
        
        <div className="h-4 w-px bg-white/10" />

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCompile} 
          disabled={isLoading}
          className={cn(
             "h-7 px-2.5 gap-2 text-xs font-medium hover:bg-green-500/10 hover:text-green-400 transition-colors",
             isLoading ? "opacity-70 cursor-wait" : ""
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Compile</span>
        </Button>

        <div className="flex items-center gap-2">
          <Switch 
             id="auto-compile"
             checked={autoFetch} 
             onCheckedChange={(checked) => updateProject(projectId, { isAutoFetching: checked })} 
             className="scale-75 data-[state=checked]:bg-green-600"
          />
          <Label htmlFor="auto-compile" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 cursor-pointer">Auto</Label>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5 mr-2">
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-6 w-6 rounded-md hover:bg-white/10 text-zinc-400">
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-[10px] tabular-nums text-zinc-400">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-6 w-6 rounded-md hover:bg-white/10 text-zinc-400">
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>

        <Button size="icon" variant="ghost" onClick={onResetZoom} className="h-7 w-7 rounded-md hover:bg-white/10 text-zinc-400">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        
        <div className="h-4 w-px bg-white/10 mx-1" />
        
        <Button size="icon" variant="ghost" onClick={onDownload} className="h-7 w-7 rounded-md hover:bg-blue-500/10 hover:text-blue-400 text-zinc-400 transition-colors">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </>
  )
}

export default LatexRenderer
