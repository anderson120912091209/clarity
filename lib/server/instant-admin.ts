import { init } from '@instantdb/admin'

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID as string
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN as string

if (!APP_ID) {
  console.error('[instant-admin] NEXT_PUBLIC_INSTANT_APP_ID is not set')
}

export const adminDb = init({ appId: APP_ID || '', adminToken: ADMIN_TOKEN || '' })

/**
 * Verify a user's identity server-side using InstantDB token verification.
 *
 * The client sends its InstantDB refresh token in the `Authorization: Bearer`
 * header (or `x-clarity-auth-token`). We verify it against InstantDB and
 * return the authenticated user ID.
 *
 * This is secure — the token is cryptographically verified by InstantDB,
 * not just trusted from a client header.
 */
export async function verifyUser(req: Request): Promise<{ userId: string } | null> {
  // Try Authorization header first, then custom header
  const authHeader = req.headers.get('authorization')?.trim() ?? ''
  const customToken = req.headers.get('x-clarity-auth-token')?.trim() ?? ''

  let token = ''
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim()
  } else if (customToken) {
    token = customToken
  }

  if (!token) return null

  try {
    const user = await adminDb.auth.verifyToken(token)
    if (user?.id) {
      return { userId: user.id }
    }
    return null
  } catch {
    return null
  }
}
