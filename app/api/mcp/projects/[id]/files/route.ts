import { NextResponse } from 'next/server'
import { authenticateMcpRequest } from '@/lib/server/mcp-auth'
import { adminDb } from '@/lib/server/instant-admin'
import { id, tx } from '@instantdb/admin'

/**
 * GET /api/mcp/projects/:id/files
 * List all files in a project.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const { id: projectId } = await params

  // Verify project belongs to user
  const projResult = await adminDb.query({
    projects: { $: { where: { id: projectId, user_id: auth.userId } } },
  })
  if (!((projResult as any)?.projects?.length > 0)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const result = await adminDb.query({
    files: { $: { where: { projectId, user_id: auth.userId } } },
  })

  const files = ((result as any)?.files ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    pathname: f.pathname,
    parent_id: f.parent_id || null,
    main_file: f.main_file || false,
  }))

  return NextResponse.json({ files })
}

/**
 * POST /api/mcp/projects/:id/files
 * Create a new file in a project.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const { id: projectId } = await params

  // Verify project belongs to user
  const projResult = await adminDb.query({
    projects: { $: { where: { id: projectId, user_id: auth.userId } } },
  })
  if (!((projResult as any)?.projects?.length > 0)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { name, content, parent_id } = body as {
    name?: string
    content?: string
    parent_id?: string
  }

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name (string) is required' }, { status: 400 })
  }

  // Validate name: no slashes, no empty, reasonable length
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 255 || /[/\\]/.test(trimmedName)) {
    return NextResponse.json(
      { error: 'Invalid file name. Must be 1-255 characters with no slashes.' },
      { status: 400 }
    )
  }

  // If parent_id provided, verify it's a folder in this project
  if (parent_id) {
    const parentResult = await adminDb.query({
      files: { $: { where: { id: parent_id, projectId, user_id: auth.userId, type: 'folder' } } },
    })
    if (!((parentResult as any)?.files?.length > 0)) {
      return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
    }
  }

  // Build pathname
  let pathname = `/${trimmedName}`
  if (parent_id) {
    // Look up parent's pathname to build full path
    const parentResult = await adminDb.query({
      files: { $: { where: { id: parent_id } } },
    })
    const parent = (parentResult as any)?.files?.[0]
    if (parent?.pathname) {
      pathname = `${parent.pathname}/${trimmedName}`
    }
  }

  // Check for duplicate name in same parent
  const existingResult = await adminDb.query({
    files: { $: { where: { projectId, user_id: auth.userId, name: trimmedName, parent_id: parent_id || undefined } } },
  })
  if (((existingResult as any)?.files ?? []).length > 0) {
    return NextResponse.json(
      { error: `A file named "${trimmedName}" already exists in this location` },
      { status: 409 }
    )
  }

  const fileId = id()
  const isFolder = trimmedName.endsWith('/') || body.type === 'folder'

  try {
    await adminDb.transact([
      tx.files[fileId].update({
        name: trimmedName,
        type: isFolder ? 'folder' : 'file',
        content: isFolder ? undefined : (content ?? ''),
        projectId,
        user_id: auth.userId,
        parent_id: parent_id || undefined,
        pathname,
        created_at: new Date().toISOString(),
        main_file: false,
      }),
    ])
  } catch (err) {
    console.error('[mcp-files] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }

  return NextResponse.json({
    id: fileId,
    name: trimmedName,
    type: isFolder ? 'folder' : 'file',
    pathname,
    parent_id: parent_id || null,
  }, { status: 201 })
}
