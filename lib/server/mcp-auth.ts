import { createHash } from 'node:crypto'
import { timingSafeEqual } from 'node:crypto'
import { adminDb } from './instant-admin'
import { tx } from '@instantdb/admin'

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function extractBearerToken(req: Request): string {
  const authHeader = req.headers.get('authorization')?.trim() ?? ''
  const bearerPrefix = 'bearer '
  if (authHeader.toLowerCase().startsWith(bearerPrefix)) {
    return authHeader.slice(bearerPrefix.length).trim()
  }
  return ''
}

export interface McpAuthResult {
  userId: string
  error?: never
}

export interface McpAuthError {
  userId?: never
  error: Response
}

/**
 * Authenticate an MCP API request.
 *
 * The client sends the plaintext API key.  We SHA-256 hash it and
 * compare against the stored hash using timing-safe comparison.
 * On success we also update `last_used_at` for the matched key.
 */
export async function authenticateMcpRequest(
  req: Request
): Promise<McpAuthResult | McpAuthError> {
  const token = extractBearerToken(req)
  if (!token) {
    return { error: new Response(JSON.stringify({ error: 'Missing API key' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) }
  }

  // Hash the incoming plaintext key to compare against stored hashes
  const tokenHash = createHash('sha256').update(token).digest('hex')

  try {
    const result = await adminDb.query({ mcp_api_keys: { $: { where: { active: true } } } })
    const keys = (result as any)?.mcp_api_keys ?? []
    for (const row of keys) {
      if (typeof row.key_hash === 'string' && safeEqual(row.key_hash, tokenHash)) {
        // Update last_used_at (fire-and-forget so it doesn't slow the request)
        adminDb
          .transact([tx.mcp_api_keys[row.id].update({ last_used_at: new Date().toISOString() })])
          .catch((err: unknown) => console.error('[mcp-auth] Failed to update last_used_at:', err))

        return { userId: row.user_id as string }
      }
    }
  } catch (err) {
    console.error('[mcp-auth] Failed to query API keys:', err)
    return { error: new Response(JSON.stringify({ error: 'Internal auth error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }) }
  }

  return { error: new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) }
}
