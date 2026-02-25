import { NextResponse } from 'next/server'
import { randomBytes, createHash } from 'node:crypto'
import { adminDb } from '@/lib/server/instant-admin'
import { id, tx } from '@instantdb/admin'

/**
 * Hash an API key for storage. We store SHA-256 hashes so the
 * plaintext key is never persisted.
 */
function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

/**
 * Extract authenticated user ID from the request.
 *
 * Uses the same x-clarity-user-id header pattern as the rest of the
 * Clarity API (set by the client from InstantDB auth state).
 */
function getUserId(req: Request): string | null {
  const userId = req.headers.get('x-clarity-user-id')?.trim()
  if (!userId || userId.length > 200) return null
  return userId
}

// ── GET  /api/mcp/keys — list the current user's API keys (masked) ──

export async function GET(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await adminDb.query({
      mcp_api_keys: { $: { where: { user_id: userId } } },
    })
    const keys = ((result as any)?.mcp_api_keys ?? []).map((k: any) => ({
      id: k.id,
      label: k.label ?? '',
      key_preview: `sk_clarity_...${(k.key_hash as string).slice(-6)}`,
      active: k.active,
      created_at: k.created_at,
      last_used_at: k.last_used_at ?? null,
    }))

    return NextResponse.json({ keys })
  } catch (err) {
    console.error('[mcp-keys] GET failed:', err)
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
  }
}

// ── POST /api/mcp/keys — generate a new API key ────────────────────

export async function POST(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Enforce max 5 keys per user
  try {
    const existing = await adminDb.query({
      mcp_api_keys: { $: { where: { user_id: userId } } },
    })
    const count = ((existing as any)?.mcp_api_keys ?? []).length
    if (count >= 5) {
      return NextResponse.json(
        { error: 'Maximum of 5 API keys allowed. Revoke an existing key first.' },
        { status: 400 }
      )
    }
  } catch (err) {
    console.error('[mcp-keys] count check failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 64) : ''

  // Generate a secure random key
  const raw = randomBytes(32).toString('base64url')
  const plaintext = `sk_clarity_${raw}`
  const keyHash = hashKey(plaintext)

  const keyId = id()
  try {
    await adminDb.transact([
      tx.mcp_api_keys[keyId].update({
        user_id: userId,
        key_hash: keyHash,
        label: label || 'Untitled key',
        active: true,
        created_at: new Date().toISOString(),
      }),
    ])
  } catch (err) {
    console.error('[mcp-keys] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
  }

  // Return the plaintext key exactly once
  return NextResponse.json({
    id: keyId,
    key: plaintext,
    label: label || 'Untitled key',
    created_at: new Date().toISOString(),
  })
}
