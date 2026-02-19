import { decodeShareTokenUnsafe } from './share-token'
import { extractShareTokenFromRecord, type ShareLinkRecord } from './share-link-records'

export interface SharedProjectMembershipRecord {
  id?: string
  user_id?: string
  projectId?: string
  share_token?: string
  role?: 'viewer' | 'commenter' | 'editor'
  added_at?: string
  last_accessed_at?: string
  title_snapshot?: string
  owner_user_id?: string
  revoked_at?: string | null
}

export const SHARED_PROJECT_MEMBERSHIP_FILE_MARKER = '__shared_membership__'

const MEMBERSHIP_ROLE_PRIORITY: Record<'viewer' | 'commenter' | 'editor', number> = {
  viewer: 0,
  commenter: 1,
  editor: 2,
}

function parseIsoToMs(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

export function buildSharedProjectMembershipId(
  userId: string,
  projectId: string
): string {
  return `${userId.trim()}::${projectId.trim()}`
}

export function isSharedProjectMembershipActive(
  membership: SharedProjectMembershipRecord,
  nowMs = Date.now()
): boolean {
  if (typeof membership.revoked_at === 'string' && membership.revoked_at.trim()) {
    return false
  }

  if (typeof membership.share_token !== 'string' || !membership.share_token.trim()) {
    return false
  }

  const claims = decodeShareTokenUnsafe(membership.share_token)
  if (!claims) return false

  return claims.exp * 1000 > nowMs
}

export function resolveLatestActiveMembershipToken(
  memberships: SharedProjectMembershipRecord[],
  projectId: string,
  nowMs = Date.now()
): string | null {
  const normalizedProjectId = projectId.trim()
  if (!normalizedProjectId) return null

  const candidates = memberships
    .filter(
      (membership) =>
        typeof membership.projectId === 'string' &&
        membership.projectId.trim() === normalizedProjectId
    )
    .filter((membership) => isSharedProjectMembershipActive(membership, nowMs))
    .map((membership) => {
      const token = membership.share_token?.trim() ?? ''
      const claims = decodeShareTokenUnsafe(token)
      const normalizedRole =
        claims?.role ??
        (membership.role === 'viewer' ||
        membership.role === 'commenter' ||
        membership.role === 'editor'
          ? membership.role
          : null)

      return {
        token,
        rolePriority:
          normalizedRole != null ? MEMBERSHIP_ROLE_PRIORITY[normalizedRole] : -1,
        timestamp:
          parseIsoToMs(membership.last_accessed_at) ||
          parseIsoToMs(membership.added_at),
        expiryMs:
          typeof claims?.exp === 'number' && Number.isFinite(claims.exp)
            ? claims.exp * 1000
            : 0,
      }
    })
    .filter((candidate) => candidate.token.length > 0)
    .sort((left, right) => {
      if (left.rolePriority !== right.rolePriority) {
        return right.rolePriority - left.rolePriority
      }
      if (left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp
      }
      if (left.expiryMs !== right.expiryMs) {
        return right.expiryMs - left.expiryMs
      }
      return left.token.localeCompare(right.token)
    })

  if (!candidates.length) return null
  return candidates[0].token
}

export function toSharedMembershipFromShareLinkRecord(
  record: ShareLinkRecord
): SharedProjectMembershipRecord | null {
  const fileId = typeof record.fileId === 'string' ? record.fileId.trim() : ''
  if (fileId !== SHARED_PROJECT_MEMBERSHIP_FILE_MARKER) return null

  const token = extractShareTokenFromRecord(record)
  if (!token) return null

  const claims = decodeShareTokenUnsafe(token)
  const normalizedRecordRole =
    record.role === 'viewer' || record.role === 'commenter' || record.role === 'editor'
      ? record.role
      : undefined
  const addedAt =
    typeof record.added_at === 'string' && record.added_at.trim()
      ? record.added_at
      : typeof record.created_at === 'string'
        ? record.created_at
        : undefined
  const lastAccessedAt =
    typeof record.last_accessed_at === 'string' && record.last_accessed_at.trim()
      ? record.last_accessed_at
      : addedAt

  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    user_id:
      typeof record.created_by_user_id === 'string'
        ? record.created_by_user_id
        : undefined,
    projectId:
      typeof record.projectId === 'string'
        ? record.projectId
        : typeof record.project_id === 'string'
          ? record.project_id
          : undefined,
    share_token: token,
    role: claims?.role ?? normalizedRecordRole,
    added_at: addedAt,
    last_accessed_at: lastAccessedAt,
    title_snapshot:
      typeof record.title_snapshot === 'string' ? record.title_snapshot : undefined,
    owner_user_id:
      typeof record.owner_user_id === 'string'
        ? record.owner_user_id
        : claims?.issuedByUserId,
    revoked_at: typeof record.revoked_at === 'string' ? record.revoked_at : null,
  }
}
