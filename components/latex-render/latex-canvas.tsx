//PDF CANVAS on the RIGHT SIDE of the PRODUCT 

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Document, Page, pdfjs } from 'react-pdf'
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from 'react'

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
  scale
}: {
  pdfUrl: string;
  onDocumentLoadSuccess: (result: { numPages: number }) => void;
  options: any;
  isDocumentReady: boolean;
  numPages: number;
  scale: number;
}) {
  const [workerReady, setWorkerReady] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)

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

  if (!workerReady) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <Skeleton className="w-full h-full max-w-4xl" />
      </div>
    )
  }

  return (
    <ScrollArea className="flex-grow w-full h-full bg-foreground/5">
      <Document
        file={pdfUrl}
        onLoadSuccess={(pdf) => {
          setDocumentError(null)
          onDocumentLoadSuccess(pdf)
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
          Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              className="mb-4 shadow-lg"
              scale={scale}
              width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 800) : 800}
              loading={<Skeleton className="w-full h-[calc(100vh-80px)] mb-4" />}
              onRenderError={(error) => {
                console.error(`Error rendering page ${index + 1}:`, error)
                setDocumentError(`Failed to render page ${index + 1}`)
              }}
              onLoadError={(error) => {
                console.error(`Error loading page ${index + 1}:`, error)
                setDocumentError(`Failed to load page ${index + 1}`)
              }}
            />
          ))}
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