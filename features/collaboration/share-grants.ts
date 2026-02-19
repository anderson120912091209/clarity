import { decodeShareTokenUnsafe } from './share-token'
import type { CollaborationRole } from './types'

interface BuildShareGrantInput {
  projectId: string
  fileId: string
  token: string
  createdByUserId: string
  role?: CollaborationRole
  createdAtIso?: string
}

type ShareTokenField = {
  comment_token?: string
  edit_token?: string
}

export interface ShareGrantRecord extends ShareTokenField {
  [key: string]: unknown
  projectId: string
  fileId: string
  role: CollaborationRole
  token: string
  expires_at_ms?: number
  created_by_user_id: string
  created_at: string
}

export function tokenFieldForRole(role: CollaborationRole, token: string): ShareTokenField {
  if (role === 'editor') return { edit_token: token }
  if (role === 'commenter') return { comment_token: token }
  return {}
}

export function buildShareGrantRecord(input: BuildShareGrantInput): ShareGrantRecord {
  const claims = decodeShareTokenUnsafe(input.token)
  const role = input.role ?? claims?.role ?? 'viewer'
  const createdAt = input.createdAtIso ?? new Date().toISOString()
  const expiresAtMs =
    typeof claims?.exp === 'number' && Number.isFinite(claims.exp)
      ? claims.exp * 1000
      : undefined

  return {
    projectId: input.projectId,
    fileId: input.fileId,
    role,
    token: input.token,
    expires_at_ms: expiresAtMs,
    created_by_user_id: input.createdByUserId,
    created_at: createdAt,
    ...tokenFieldForRole(role, input.token),
  }
}
