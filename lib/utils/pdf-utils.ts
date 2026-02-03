'use client'
import '@ungap/with-resolvers'
import { PDFDocumentProxy } from 'pdfjs-dist'
// CLSI URL is configured via NEXT_PUBLIC_CLSI_URL environment variable

export async function createPreview(
  pdfDocument: PDFDocumentProxy,
  pathname: string
): Promise<{ previewFile: File; previewPathname: string }> {
  const page = await pdfDocument.getPage(1)
  const viewport = page.getViewport({ scale: 1.0 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.height = viewport.height
  canvas.width = viewport.width

  if (!context) {
    throw new Error('Failed to get canvas context')
  }

  await page.render({ canvasContext: context, viewport: viewport }).promise

  const previewBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      'image/webp',
      0.8
    )
  })

  const previewFile = new File([previewBlob], 'preview.webp', { type: 'image/webp' })
  const previewPathname = `${pathname}/preview.webp`

  return { previewFile, previewPathname }
}

interface EditorFiles {
  [key: string]: any
}

export async function fetchPdf(files: EditorFiles | EditorFiles[] | undefined | null) {
  // Validate files parameter
  if (!files) {
    throw new Error('No files provided. Please ensure you have files in your project.')
  }
  
  // Ensure files is an array
  const filesArray = Array.isArray(files) ? files : Object.values(files)
  
  if (!Array.isArray(filesArray) || filesArray.length === 0) {
    throw new Error('Files array is empty or invalid. Please add files to your project.')
  }
  
  if (!filesArray.some((file: any) => file?.name === 'main.tex')) {
    const errorData = {
      error: 'Missing File',
      message: 'No main.tex file found',
      details: 'The main.tex file is required for LaTeX compilation.',
    }
    console.error('Error fetching PDF:', errorData)
    throw new Error(`${errorData.error}: ${errorData.message}\n\nDetails: ${errorData.details}`)
  }

  // Create a map for quick lookups by ID
  const fileMap = new Map<string, any>()
  filesArray.forEach((f: any) => fileMap.set(f.id, f))

  // Helper to construct full path
  const getFullPath = (file: any): string => {
    const parts = [file.name]
    let current = file
    while (current.parent_id && fileMap.has(current.parent_id)) {
      current = fileMap.get(current.parent_id)
      parts.unshift(current.name)
    }
    return parts.join('/')
  }

  // Transform files into CLSI resource format with async map
  const resources = await Promise.all(filesArray
    .filter((file: any) => file.type === 'file')
    .map(async (file: any) => {
      let content = file.content || ''
      
      // If content is empty but we have a URL (uploaded file), fetch it
      if (!content && file.url) {
        try {
          const response = await fetch(file.url)
          const arrayBuffer = await response.arrayBuffer()
          // Convert to Base64
          // Note context is browser here
          const base64 = btoa(
            new Uint8Array(arrayBuffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          content = base64
        } catch (e) {
          console.error(`Failed to fetch content for ${file.name}`, e)
        }
      }

      return {
        path: getFullPath(file),
        content,
        encoding: (!content && file.url) ? 'base64' : 'utf-8'
      }
    }))

  // CLSI endpoint (defaults to localhost for development)
  const CLSI_URL = process.env.NEXT_PUBLIC_CLSI_URL || 'http://localhost:3013'
  
  console.log('[CLSI] Compiling with CLSI service:', CLSI_URL)
  console.log('[CLSI] Resources:', resources.map(r => r.path))

  // Call CLSI compilation API
  let compileResponse: Response
  try {
    compileResponse = await fetch(`${CLSI_URL}/project/user-project/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: 'pdflatex',
        rootResourcePath: 'main.tex',
        resources
      })
    })
  } catch (networkError: any) {
    throw new Error(
      `Failed to connect to CLSI service.\n\n` +
      `Please check:\n` +
      `1. CLSI service is running (npm run dev in services/clsi)\n` +
      `2. The service is accessible at: ${CLSI_URL}\n` +
      `3. Your network connection is working\n\n` +
      `Original error: ${networkError?.message || String(networkError)}`
    )
  }

  if (!compileResponse.ok) {
    let errorMessage = `CLSI Error: ${compileResponse.status} ${compileResponse.statusText}`
    try {
      const errorData = await compileResponse.json()
      if (errorData?.message) {
        errorMessage = errorData.message
      }
    } catch (jsonError) {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage)
  }

  const compileResult = await compileResponse.json()
  
  console.log('[CLSI] Compile result:', compileResult)

  // Handle compilation errors
  if (compileResult.status !== 'success') {
    let errorMessage = compileResult.message || 'LaTeX compilation failed'
    
    // Add link to log file if available
    const logFile = compileResult.outputFiles?.find((f: any) => f.path === 'output.log')
    if (logFile) {
      errorMessage += `\n\nView compilation log: ${CLSI_URL}${logFile.url}`
    }
    
    throw new Error(errorMessage)
  }

  // Extract PDF URL from successful compilation
  const pdfFile = compileResult.outputFiles?.find((f: any) => f.path === 'output.pdf')
  if (!pdfFile || !pdfFile.url) {
    throw new Error('CLSI compilation succeeded but no PDF was generated')
  }

  console.log('[CLSI] Downloading PDF from:', `${CLSI_URL}${pdfFile.url}`)

  // Fetch the compiled PDF
  try {
    const pdfResponse = await fetch(`${CLSI_URL}${pdfFile.url}`)
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`)
    }
    return await pdfResponse.blob()
  } catch (blobError: any) {
    throw new Error(
      `Failed to download compiled PDF.\n\n` +
      `The compilation succeeded, but the PDF could not be retrieved.\n` +
      `Original error: ${blobError?.message || String(blobError)}`
    )
  }
}

export function containsMainTex(files: File[]): boolean {
  return files.some((file) => file.name === 'main.tex')
}
