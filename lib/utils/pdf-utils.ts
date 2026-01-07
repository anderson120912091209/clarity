'use client'
import '@ungap/with-resolvers'
import { PDFDocumentProxy } from 'pdfjs-dist'
import { RAILWAY_ENDPOINT_URL } from '@/lib/constants'  

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

  const formData = new FormData()
    
  await Promise.all(
    filesArray.map(async (file: any) => {
        if (file.type === 'file') {
        const extension = file.name.split('.').pop()?.toLowerCase()
        let mimeType: string
            
            switch (extension) {
                case 'tex':
            mimeType = 'text/plain'
            break
                case 'png':
            mimeType = 'image/png'
            break
                case 'jpg':
                case 'jpeg':
            mimeType = 'image/jpeg'
            break
                case 'svg':
            mimeType = 'image/svg+xml'
            break
                default:
            throw new Error(`Unsupported file type: ${extension}`)
            }

        const pathname = file.pathname

        let blob: Blob
            if (extension !== 'tex' && typeof file.content === 'string') {
                // For images, file.content is a URL
          const response = await fetch(file.content)
          blob = await response.blob()
            } else {
                // For .tex files, create blob from content
          // Validate content is not empty
          if (extension === 'tex') {
            const content = file.content || ''
            if (typeof content !== 'string') {
              throw new Error(`File ${file.name} has invalid content type. Expected string, got ${typeof content}`)
            }
            if (!content.trim()) {
              throw new Error(`File ${file.name} is empty. Please add content to the file before compiling.`)
            }
            // Ensure content ends with newline (LaTeX requirement)
            const normalizedContent = content.endsWith('\n') ? content : content + '\n'
            
            // Log file content for debugging (first 500 chars)
            if (file.name === 'main.tex') {
              const preview = normalizedContent.substring(0, 500)
              const lines = normalizedContent.split('\n')
              console.log(`[PDF Debug] main.tex content preview (first 500 chars):`, preview)
              console.log(`[PDF Debug] main.tex total lines:`, lines.length)
              console.log(`[PDF Debug] main.tex first 10 lines:`, lines.slice(0, 10))
              
              // Check for common typos
              if (normalizedContent.includes('\\titlef') && !normalizedContent.includes('\\titleformat')) {
                console.error(`[PDF Debug] Found potential typo: \\titlef (should be \\titleformat)`)
              }
            }
            
            blob = new Blob([normalizedContent], { type: mimeType })
          } else {
            blob = new Blob([file.content], { type: mimeType })
          }
            }
        formData.append(pathname, blob)
        }
    })
  )

  // Validate Railway endpoint URL
  if (!RAILWAY_ENDPOINT_URL) {
    throw new Error(
      'Railway endpoint URL is not configured. Please set NEXT_PUBLIC_RAILWAY_ENDPOINT_URL in your .env.local file.'
    )
  }

  console.log('Fetching PDF from endpoint:', RAILWAY_ENDPOINT_URL)
  
  let response: Response
  try {
    response = await fetch(RAILWAY_ENDPOINT_URL, {
        method: 'POST',
        body: formData,
    })
  } catch (networkError: any) {
    // Handle network errors (CORS, connection refused, etc.)
    throw new Error(
      `Failed to connect to Railway endpoint.\n\n` +
      `Please check:\n` +
      `1. Your Railway service is deployed and running\n` +
      `2. The endpoint URL is correct: ${RAILWAY_ENDPOINT_URL}\n` +
      `3. CORS is properly configured on your Railway service\n` +
      `4. Your network connection is working\n\n` +
      `Original error: ${networkError?.message || String(networkError)}`
    )
  }

    if (!response.ok) {
    let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`
    try {
      const errorData = await response.json()
      if (errorData?.error && errorData?.message) {
        errorMessage = `${errorData.error}: ${errorData.message}${errorData.details ? '\n\nDetails: ' + errorData.details : ''}`
      }
    } catch (jsonError) {
      // If response is not JSON, try to get text
      try {
        const text = await response.text()
        if (text) errorMessage += `\n\nResponse: ${text.substring(0, 200)}`
      } catch (textError) {
        // If we can't read the response, just use the status
      }
    }
    throw new Error(errorMessage)
  }

  try {
    return await response.blob()
  } catch (blobError: any) {
    throw new Error(
      `Failed to read PDF blob from response.\n\n` +
      `The server returned a successful response, but the PDF data could not be read.\n` +
      `Original error: ${blobError?.message || String(blobError)}`
    )
  }
}

export function containsMainTex(files: File[]): boolean {
  return files.some((file) => file.name === 'main.tex')
}
