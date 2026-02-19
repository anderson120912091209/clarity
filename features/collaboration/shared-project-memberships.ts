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
    .sort((left, right) => {
      const leftTimestamp =
        parseIsoToMs(left.last_accessed_at) || parseIsoToMs(left.added_at)
      const rightTimestamp =
        parseIsoToMs(right.last_accessed_at) || parseIsoToMs(right.added_at)
      return rightTimestamp - leftTimestamp
    })

  if (!candidates.length) return null
  return candidates[0].share_token ?? null
}

export function toSharedMembershipFromShareLinkRecord(
  record: ShareLinkRecord
): SharedProjectMembershipRecord | null {
  const fileId = typeof record.fileId === 'string' ? record.fileId.trim() : ''
  if (fileId !== SHARED_PROJECT_MEMBERSHIP_FILE_MARKER) return null

  const token = extractShareTokenFromRecord(record)
  if (!token) return null

  const claims = decodeShareTokenUnsafe(token)

  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    user_id:
      typeof record.created_by_user_id === 'string'
        ? record.created_by_user_id
        : undefined,
    projectId: typeof record.projectId === 'string' ? record.projectId : undefined,
    share_token: token,
    role:
      record.role === 'viewer' || record.role === 'commenter' || record.role === 'editor'
        ? record.role
        : claims?.role,
    added_at: typeof record.created_at === 'string' ? record.created_at : undefined,
    last_accessed_at: typeof record.created_at === 'string' ? record.created_at : undefined,
    title_snapshot: undefined,
    owner_user_id: claims?.issuedByUserId,
    revoked_at: typeof record.revoked_at === 'string' ? record.revoked_at : null,
  }
}
