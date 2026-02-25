import { NextResponse } from 'next/server'
import { authenticateMcpRequest } from '@/lib/server/mcp-auth'
import { adminDb } from '@/lib/server/instant-admin'
import { tx } from '@instantdb/admin'

/**
 * GET /api/mcp/files/:id
 * Read a file's content.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const { id: fileId } = await params

  const result = await adminDb.query({
    files: { $: { where: { id: fileId, user_id: auth.userId } } },
  })
  const file = (result as any)?.files?.[0]
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: file.id,
    name: file.name,
    type: file.type,
    pathname: file.pathname,
    content: file.content ?? '',
    main_file: file.main_file || false,
  })
}

/**
 * PUT /api/mcp/files/:id
 * Update a file's content.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const { id: fileId } = await params
  const body = await req.json()
  const { content } = body as { content?: string }

  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content (string) is required' }, { status: 400 })
  }

  // Verify file belongs to user
  const result = await adminDb.query({
    files: { $: { where: { id: fileId, user_id: auth.userId } } },
  })
  const file = (result as any)?.files?.[0]
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  await adminDb.transact([
    tx.files[fileId].update({
      content,
      updated_at: new Date().toISOString(),
    }),
  ])

  return NextResponse.json({ success: true, id: fileId })
}

/**
 * DELETE /api/mcp/files/:id
 * Delete a file. Refuses to delete the main file or folders with children.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMcpRequest(req)
  if (auth.error) return auth.error

  const { id: fileId } = await params

  // Fetch the file
  const result = await adminDb.query({
    files: { $: { where: { id: fileId, user_id: auth.userId } } },
  })
  const file = (result as any)?.files?.[0]
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  // Safety: don't delete the main file
  if (file.main_file) {
    return NextResponse.json(
      { error: 'Cannot delete the main entry file. Set a different main file first.' },
      { status: 400 }
    )
  }

  // Safety: don't delete non-empty folders
  if (file.type === 'folder') {
    const childResult = await adminDb.query({
      files: { $: { where: { parent_id: fileId, user_id: auth.userId } } },
    })
    const children = ((childResult as any)?.files ?? [])
    if (children.length > 0) {
      return NextResponse.json(
        { error: `Folder "${file.name}" is not empty (${children.length} items). Delete its contents first.` },
        { status: 400 }
      )
    }
  }

  try {
    await adminDb.transact([tx.files[fileId].delete()])
  } catch (err) {
    console.error('[mcp-files] DELETE failed:', err)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: file.name })
}
