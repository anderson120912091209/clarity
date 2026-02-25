'use client'
import '@ungap/with-resolvers'
import { PDFDocumentProxy } from 'pdfjs-dist'
import { db } from '@/lib/constants'
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

export type LatexCompiler = 'pdflatex' | 'xelatex' | 'lualatex'

interface FetchPdfOptions {
  signal?: AbortSignal
  mode?: 'manual' | 'auto'
  clientUserId?: string
  clientUserPlan?: string
  latexCompiler?: LatexCompiler
}

export interface SynctexContext {
  clsiBaseUrl: string
  projectId: string
  buildId: string
  rootResourcePath: string
}

interface FetchPdfResult {
  blob: Blob
  logs: string | null
  synctex: SynctexContext | null
}

interface CompileDiagnostics {
  summary?: string
  file?: string
  line?: number
}

interface CompileResultPayload {
  status?: string
  buildId?: string
  outputFiles?: Array<{ path: string; url?: string }>
  diagnostics?: CompileDiagnostics
  message?: string
}

function getUserFacingCompileMessage(
  compileResult: CompileResultPayload,
  compileLabel: string
): string {
  const summary = compileResult.diagnostics?.summary?.trim()
  if (summary) {
    return summary
  }

  const message = compileResult.message?.trim()
  if (message) {
    return message
  }

  return `${compileLabel} compilation failed.`
}

function createCompileError(
  compileResult: CompileResultPayload,
  compileLabel: string,
  logs: string | null
): Error & { logs?: string | null; diagnostics?: CompileDiagnostics; rawMessage?: string } {
  const error = new Error(getUserFacingCompileMessage(compileResult, compileLabel)) as Error & {
    logs?: string | null
    diagnostics?: CompileDiagnostics
    rawMessage?: string
  }
  error.logs = logs
  error.diagnostics = compileResult.diagnostics
  error.rawMessage = compileResult.message
  return error
}

function buildClsiCandidates(configuredUrl: string): string[] {
  const cleanedConfiguredUrl = configuredUrl.replace(/\/+$/, '')
  const candidates = [cleanedConfiguredUrl]

  if (cleanedConfiguredUrl.includes('localhost')) {
    candidates.push(cleanedConfiguredUrl.replace('localhost', '127.0.0.1'))
  } else if (cleanedConfiguredUrl.includes('127.0.0.1')) {
    candidates.push(cleanedConfiguredUrl.replace('127.0.0.1', 'localhost'))
  }

  return Array.from(new Set(candidates))
}

function shouldAllowTypstNetwork(resources: Array<{ path: string; content?: string; encoding?: string }>): boolean {
  const packageImportPattern = /@preview\/[A-Za-z0-9_-]+:[A-Za-z0-9.+-]+/

  for (const resource of resources) {
    if (!resource.path.endsWith('.typ')) continue
    if (!resource.content) continue

    let text = resource.content
    if (resource.encoding === 'base64') {
      try {
        text = atob(resource.content)
      } catch {
        text = resource.content
      }
    }

    if (packageImportPattern.test(text)) {
      return true
    }
  }

  return false
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const parts: string[] = []
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    let chunkBinary = ''
    for (const byte of chunk) {
      chunkBinary += String.fromCharCode(byte)
    }
    parts.push(chunkBinary)
  }

  return btoa(parts.join(''))
}

function getByteSignature(buffer: ArrayBuffer, maxBytes = 8): string {
  const bytes = new Uint8Array(buffer).subarray(0, maxBytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
}

/**
 * Detect the root document file for compilation.
 *
 * Priority:
 *  1. Explicit `main.tex` or `main.typ` at the project root (backwards compat)
 *  2. Any `.tex` file whose content contains `\documentclass` (Overleaf-style)
 *     — prefer root-level files over nested ones
 *  3. Any root-level `.typ` file (Typst)
 *  4. null (no compilable root found)
 */
export function detectRootFile(
  filesArray: any[],
  getFullPath: (file: any) => string,
  latexCompiler?: LatexCompiler
): { compiler: string; rootResourcePath: string; label: string } | null {
  // Helper: true when a file sits at the project root (no parent)
  const isRootLevel = (f: any) => !f.parent_id
  const onlyFiles = filesArray.filter((f: any) => f?.type === 'file')

  // 1. Explicit main.tex / main.typ at root — fast path, preserves old behaviour
  const mainTex = onlyFiles.find((f: any) => f.name === 'main.tex' && isRootLevel(f))
  if (mainTex) {
    return {
      compiler: latexCompiler || 'pdflatex',
      rootResourcePath: getFullPath(mainTex),
      label: 'LaTeX',
    }
  }
  const mainTyp = onlyFiles.find((f: any) => f.name === 'main.typ' && isRootLevel(f))
  if (mainTyp) {
    return {
      compiler: 'typst',
      rootResourcePath: getFullPath(mainTyp),
      label: 'Typst',
    }
  }

  // 2. Scan for \documentclass — the file that contains it is the LaTeX root.
  //    Prefer root-level files, then pick the first match.
  const texFiles = onlyFiles.filter(
    (f: any) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.tex')
  )
  const hasDocumentClass = (f: any) =>
    typeof f.content === 'string' && /\\documentclass[\s{[]/m.test(f.content)
  const rootLevelDocClass = texFiles.find((f: any) => isRootLevel(f) && hasDocumentClass(f))
  const anyDocClass = rootLevelDocClass || texFiles.find(hasDocumentClass)
  if (anyDocClass) {
    return {
      compiler: latexCompiler || 'pdflatex',
      rootResourcePath: getFullPath(anyDocClass),
      label: 'LaTeX',
    }
  }

  // 3. Any .typ file at root level — Typst project
  const rootTyp = onlyFiles.find(
    (f: any) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.typ') && isRootLevel(f)
  )
  if (rootTyp) {
    return {
      compiler: 'typst',
      rootResourcePath: getFullPath(rootTyp),
      label: 'Typst',
    }
  }

  return null
}

export async function fetchPdf(
  projectId: string,
  files: EditorFiles | EditorFiles[] | undefined | null,
  options: FetchPdfOptions = {}
): Promise<FetchPdfResult> {
  if (typeof projectId !== 'string' || projectId.trim().length === 0) {
    throw new Error('Missing project ID. Please refresh and try again.')
  }

  const normalizedProjectId = projectId.trim()

  // Validate files parameter
  if (!files) {
    throw new Error('No files provided. Please ensure you have files in your project.')
  }

  // Ensure files is an array
  const filesArray = Array.isArray(files) ? files : Object.values(files)

  if (!Array.isArray(filesArray) || filesArray.length === 0) {
    throw new Error('Files array is empty or invalid. Please add files to your project.')
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

  // Detect root file (Overleaf-style: \documentclass detection, not just main.tex)
  const compileTarget = detectRootFile(filesArray, getFullPath, options.latexCompiler)
  if (!compileTarget) {
    throw new Error(
      'No compilable document found.\n\n' +
      'Could not find a root .tex file (containing \\documentclass) or a .typ file.\n' +
      'Add a .tex file with \\documentclass{...} or a .typ file to compile.'
    )
  }

  console.log('[CLSI] Detected root file:', compileTarget.rootResourcePath, `(${compileTarget.label})`)

  // Transform files into CLSI resource format with async map
  const resources = await Promise.all(filesArray
    .filter((file: any) => file.type === 'file')
    .map(async (file: any) => {
      const path = getFullPath(file)
      let content = file.content || ''
      let encoding: 'utf-8' | 'base64' = 'utf-8'
      
      // For uploaded binary files, resolve a download URL and pass it to
      // the CLSI so the *server* fetches it (avoids browser CORS issues
      // and huge base64 JSON payloads).
      if (!content && (file.storagePath || file.url)) {
        let downloadUrl = ''

        // Prefer a fresh signed URL from storagePath
        if (file.storagePath) {
          try {
            const freshUrl = await db.storage.getDownloadUrl(file.storagePath)
            if (freshUrl) downloadUrl = freshUrl
          } catch {
            // fall through to cached url
          }
        }

        // Fall back to stored (possibly stale) URL
        if (!downloadUrl && file.url) {
          downloadUrl = file.url
        }

        if (!downloadUrl) {
          throw new Error(
            `Failed to fetch uploaded file "${file.name}" from storage.\n\n` +
            `This file could not be sent to the compiler.\n` +
            `Reason: No download URL available. Try re-uploading "${file.name}" and compiling again.`
          )
        }

        // Send URL to CLSI — the server downloads it (no CORS restrictions)
        return { path, url: downloadUrl }
      }

      return {
        path,
        content,
        encoding
      }
    }))

  // CLSI endpoint (defaults to localhost for development)
  const configuredClsiUrl = process.env.NEXT_PUBLIC_CLSI_URL || 'http://localhost:3013'
  const clsiCandidates = buildClsiCandidates(configuredClsiUrl)
  
  console.log('[CLSI] Compiling with CLSI service candidates:', clsiCandidates)
  console.log('[CLSI] Compiler:', compileTarget.compiler)
  console.log('[CLSI] Root file:', compileTarget.rootResourcePath)
  console.log('[CLSI] Resources:', resources.map(r => r.path))
  console.log(
    '[CLSI] Resource types:',
    resources.map((r: any) => `${r.path} (${r.url ? 'url' : r.encoding ?? 'utf-8'})`)
  )
  const typstAllowNetwork = compileTarget.compiler === 'typst' ? shouldAllowTypstNetwork(resources) : false

  const requestVariant =
    compileTarget.compiler === 'typst'
      ? {
          endpointPath: `/project/${encodeURIComponent(normalizedProjectId)}/typst/live/preview`,
          payload: {
            rootResourcePath: compileTarget.rootResourcePath,
            allowNetwork: typstAllowNetwork,
            compileMode: options.mode ?? 'manual',
            resources,
          },
        }
      : {
          endpointPath: `/project/${encodeURIComponent(normalizedProjectId)}/compile`,
          payload: {
            compiler: compileTarget.compiler,
            rootResourcePath: compileTarget.rootResourcePath,
            stopOnFirstError: true,
            compileMode: options.mode ?? 'manual',
            resources,
          },
        }

  // Call CLSI compilation API
  let compileResponse: Response | null = null
  let activeClsiUrl = clsiCandidates[0]
  let lastNetworkError: any = null
  const requestHeaders: HeadersInit = { 'Content-Type': 'application/json' }
  if (options.clientUserId?.trim()) {
    requestHeaders['x-clarity-user-id'] = options.clientUserId.trim()
  }
  if (options.clientUserPlan?.trim()) {
    requestHeaders['x-clarity-user-plan'] = options.clientUserPlan.trim().toLowerCase()
  }

  for (const candidateUrl of clsiCandidates) {
    try {
      const response = await fetch(`${candidateUrl}${requestVariant.endpointPath}`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestVariant.payload),
        signal: options.signal,
      })

      compileResponse = response
      activeClsiUrl = candidateUrl
      break
    } catch (networkError: any) {
      lastNetworkError = networkError
    }
  }

  if (!compileResponse) {
    throw new Error(
      `Failed to connect to CLSI service.\n\n` +
      `Please check:\n` +
      `1. CLSI service is running (npm run dev in services/clsi)\n` +
      `2. The service is accessible at: ${clsiCandidates.join(' or ')}\n` +
      `3. Typst live preview endpoint is available for Typst files\n` +
      `4. Your network connection is working\n` +
      `5. If this is a browser CORS issue, restart CLSI and frontend servers\n\n` +
      `Original error: ${lastNetworkError?.message || String(lastNetworkError)}`
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

  const compileResult = (await compileResponse.json()) as CompileResultPayload
  
  console.log('[CLSI] Compile result:', compileResult)

  // Helper to fetch log
  const fetchLog = async (logFile: any) => {
    if (!logFile?.url) return null
    try {
      const res = await fetch(`${activeClsiUrl}${logFile.url}`, {
        signal: options.signal,
      })
      if (res.ok) return await res.text()
    } catch (e) {
      console.warn('Failed to fetch logs', e)
    }
    return null
  }

  const logFile = compileResult.outputFiles?.find((f: any) => f.path === 'output.log')
  const logs = await fetchLog(logFile)

  // Handle compilation errors
  if (compileResult.status !== 'success') {
    throw createCompileError(compileResult, compileTarget.label, logs)
  }

  // Extract PDF URL from successful compilation
  const pdfFile = compileResult.outputFiles?.find((f: any) => f.path === 'output.pdf')
  if (!pdfFile || !pdfFile.url) {
    const error = new Error(
      compileResult.diagnostics?.summary || 'Compilation completed, but no PDF was generated.'
    ) as any
    error.logs = logs
    error.diagnostics = compileResult.diagnostics
    throw error
  }

  console.log('[CLSI] Downloading PDF from:', `${activeClsiUrl}${pdfFile.url}`)

  const synctexFile = compileResult.outputFiles?.find((f: any) => f.path === 'output.synctex.gz')
  const synctex: SynctexContext | null =
    compileTarget.compiler === 'typst' || !compileResult.buildId || !synctexFile
      ? null
      : {
          clsiBaseUrl: activeClsiUrl,
          projectId: normalizedProjectId,
          buildId: compileResult.buildId,
          rootResourcePath: compileTarget.rootResourcePath,
        }

  // Fetch the compiled PDF
  try {
    const pdfResponse = await fetch(`${activeClsiUrl}${pdfFile.url}`, {
      signal: options.signal,
    })
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`)
    }
    const blob = await pdfResponse.blob()
    return { blob, logs, synctex }
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

export function containsMainTyp(files: File[]): boolean {
  return files.some((file) => file.name === 'main.typ')
}
