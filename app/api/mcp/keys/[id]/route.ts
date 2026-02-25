import { NextResponse } from 'next/server'
import { adminDb, verifyUser } from '@/lib/server/instant-admin'
import { tx } from '@instantdb/admin'

async function getUserId(req: Request): Promise<string | null> {
  const verified = await verifyUser(req)
  if (verified) return verified.userId

  const userId = req.headers.get('x-clarity-user-id')?.trim()
  if (!userId || userId.length > 200) return null
  return userId
}

async function verifyKeyOwnership(
  keyId: string,
  userId: string
): Promise<boolean> {
  const result = await adminDb.query({
    mcp_api_keys: { $: { where: { id: keyId, user_id: userId } } },
  })
  return ((result as any)?.mcp_api_keys ?? []).length > 0
}

// ── PATCH /api/mcp/keys/:id — toggle active or update label ────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: keyId } = await params
  if (!(await verifyKeyOwnership(keyId, userId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (typeof body.active === 'boolean') updates.active = body.active
  if (typeof body.label === 'string') updates.label = body.label.trim().slice(0, 64)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    await adminDb.transact([tx.mcp_api_keys[keyId].update(updates)])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mcp-keys] PATCH failed:', err)
    return NextResponse.json({ error: 'Failed to update key' }, { status: 500 })
  }
}

// ── DELETE /api/mcp/keys/:id — revoke (permanently delete) a key ───

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: keyId } = await params
  if (!(await verifyKeyOwnership(keyId, userId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await adminDb.transact([tx.mcp_api_keys[keyId].delete()])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mcp-keys] DELETE failed:', err)
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
  }
}
