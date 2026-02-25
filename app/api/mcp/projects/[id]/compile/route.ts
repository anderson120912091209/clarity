import { NextResponse } from 'next/server'
import { authenticateMcpRequest } from '@/lib/server/mcp-auth'
import { adminDb } from '@/lib/server/instant-admin'

const CLSI_URL = process.env.NEXT_PUBLIC_CLSI_URL || 'http://localhost:3013'

/**
 * POST /api/mcp/projects/:id/compile
 * Compile a project and return status + errors.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const { id: projectId } = await params

  // Fetch project
  const projResult = await adminDb.query({
    projects: { $: { where: { id: projectId, user_id: auth.userId } } },
  })
  const project = (projResult as any)?.projects?.[0]
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Fetch all project files
  const filesResult = await adminDb.query({
    files: { $: { where: { projectId, user_id: auth.userId } } },
  })
  const files = ((filesResult as any)?.files ?? []) as any[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files in project' }, { status: 400 })
  }

  // Detect root file
  const rootFile = detectRootFile(files)
  if (!rootFile) {
    return NextResponse.json({ error: 'Could not detect root file (main.tex / main.typ)' }, { status: 400 })
  }

  const isTypst = rootFile.name.endsWith('.typ')

  // Build resources array for CLSI
  const resources = files
    .filter((f: any) => f.type === 'file' && typeof f.content === 'string')
    .map((f: any) => ({
      path: f.pathname || f.name,
      content: f.content,
    }))

  // Detect if Typst needs network (@preview imports)
  const allowNetwork = isTypst && resources.some((r: any) =>
    typeof r.content === 'string' && /@preview\//.test(r.content)
  )

  try {
    let response: Response

    if (isTypst) {
      response = await fetch(`${CLSI_URL}/project/${projectId}/typst/live/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootResourcePath: rootFile.pathname || rootFile.name,
          resources,
          allowNetwork,
          timeout: 30000,
        }),
      })
    } else {
      response = await fetch(`${CLSI_URL}/project/${projectId}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: project.document_class === 'xelatex' ? 'xelatex' : 'pdflatex',
          rootResourcePath: rootFile.pathname || rootFile.name,
          resources,
          timeout: 60000,
          stopOnFirstError: false,
        }),
      })
    }

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: 'Compilation service error', details: text },
        { status: response.status }
      )
    }

    const result = await response.json()

    // Try to fetch log if available
    let log = ''
    const logFile = result.outputFiles?.find((f: any) =>
      f.path?.endsWith('.log') || f.path?.endsWith('.blg')
    )
    if (logFile?.url) {
      try {
        const logRes = await fetch(`${CLSI_URL}${logFile.url}`)
        log = await logRes.text()
      } catch { /* ignore */ }
    }

    const hasPdf = result.outputFiles?.some((f: any) => f.path?.endsWith('.pdf'))

    return NextResponse.json({
      status: result.status || (hasPdf ? 'success' : 'failure'),
      hasPdf,
      diagnostics: result.diagnostics ?? [],
      log: log.slice(0, 5000),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to reach compilation service', details: err.message },
      { status: 502 }
    )
  }
}

function detectRootFile(files: any[]) {
  const mainTex = files.find((f: any) => f.name === 'main.tex' && f.type === 'file' && !f.parent_id)
  if (mainTex) return mainTex

  const mainTyp = files.find((f: any) => f.name === 'main.typ' && f.type === 'file' && !f.parent_id)
  if (mainTyp) return mainTyp

  const docClass = files.find(
    (f: any) => f.type === 'file' && f.name?.endsWith('.tex') && !f.parent_id &&
      typeof f.content === 'string' && f.content.includes('\\documentclass')
  )
  if (docClass) return docClass

  const anyTyp = files.find((f: any) => f.type === 'file' && f.name?.endsWith('.typ') && !f.parent_id)
  if (anyTyp) return anyTyp

  return null
}
