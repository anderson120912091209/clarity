import type { CollaborationRole } from './types'

type CollaborationPermission =
  | 'room:write'
  | 'room:read'
  | 'room:presence:write'
  | 'comments:write'
  | 'comments:read'

interface PermissionSource {
  FULL_ACCESS: readonly CollaborationPermission[]
  READ_ACCESS: readonly CollaborationPermission[]
}

export function isCollaborationRole(value: unknown): value is CollaborationRole {
  return value === 'viewer' || value === 'commenter' || value === 'editor'
}

export function normalizeCollaborationRole(
  value: unknown,
  fallback: CollaborationRole = 'viewer'
): CollaborationRole {
  return isCollaborationRole(value) ? value : fallback
}

export function roleRank(role: CollaborationRole): number {
  switch (role) {
    case 'viewer':
      return 1
    case 'commenter':
      return 2
    case 'editor':
      return 3
    default:
      return 1
  }
}

export function clampRoleByCeiling(
  requested: CollaborationRole,
  ceiling: CollaborationRole
): CollaborationRole {
  return roleRank(requested) <= roleRank(ceiling) ? requested : ceiling
}

export function permissionsForRole(
  session: PermissionSource,
  role: CollaborationRole
): readonly CollaborationPermission[] {
  switch (role) {
    case 'editor':
      return session.FULL_ACCESS
    case 'commenter':
      return ['room:read', 'room:presence:write', 'comments:write']
    case 'viewer':
    default:
      return session.READ_ACCESS
  }
}
