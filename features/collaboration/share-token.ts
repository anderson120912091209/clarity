import { isCollaborationRole } from './roles'
import type { CollaborationRole } from './types'

export interface CollaborationShareTokenPayload {
  v: 1
  projectId: string
  fileId: string | '*'
  role: CollaborationRole
  issuedByUserId: string
  iat: number
  exp: number
}

function decodeSegmentBase64Url(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded =
      normalized + '==='.slice((normalized.length + 3) % 4)

    const atobFn = typeof globalThis.atob === 'function' ? globalThis.atob : null
    if (!atobFn) return null

    return decodeURIComponent(
      Array.from(atobFn(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    )
  } catch {
    return null
  }
}

export function isCollaborationShareTokenPayload(
  value: unknown
): value is CollaborationShareTokenPayload {
  if (!value || typeof value !== 'object') return false

  const payload = value as Partial<CollaborationShareTokenPayload>
  if (payload.v !== 1) return false
  if (typeof payload.projectId !== 'string' || payload.projectId.trim() === '') return false
  if (
    typeof payload.fileId !== 'string' ||
    (payload.fileId.trim() === '' && payload.fileId !== '*')
  ) {
    return false
  }
  if (!isCollaborationRole(payload.role)) return false
  if (typeof payload.issuedByUserId !== 'string' || payload.issuedByUserId.trim() === '') return false
  if (typeof payload.iat !== 'number' || Number.isNaN(payload.iat)) return false
  if (typeof payload.exp !== 'number' || Number.isNaN(payload.exp)) return false
  return true
}

export function decodeShareTokenUnsafe(
  token: string | null | undefined
): CollaborationShareTokenPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const payloadJson = decodeSegmentBase64Url(parts[1])
  if (!payloadJson) return null

  try {
    const payload = JSON.parse(payloadJson) as unknown
    return isCollaborationShareTokenPayload(payload) ? payload : null
  } catch {
    return null
  }
}
