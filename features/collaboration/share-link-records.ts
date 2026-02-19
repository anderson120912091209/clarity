import { decodeShareTokenUnsafe } from './share-token'

export const NEVER_EXPIRY_UNIX_SECONDS = 253402300799

export type ShareLinkRecord = Record<string, unknown>

export function extractShareTokenFromRecord(record: ShareLinkRecord): string | null {
  const rawToken =
    (typeof record.token === 'string' && record.token) ||
    (typeof record.edit_token === 'string' && record.edit_token) ||
    (typeof record.comment_token === 'string' && record.comment_token) ||
    (typeof record.view_token === 'string' && record.view_token) ||
    ''

  const token = rawToken.trim()
  return token || null
}

export function resolveShareLinkExpiryMs(
  record: ShareLinkRecord,
  token: string
): number | null {
  const explicitExpiryMs = record.expires_at_ms
  if (typeof explicitExpiryMs === 'number' && Number.isFinite(explicitExpiryMs)) {
    if (Math.floor(explicitExpiryMs / 1000) >= NEVER_EXPIRY_UNIX_SECONDS) {
      return null
    }
    return explicitExpiryMs
  }

  const claims = decodeShareTokenUnsafe(token)
  if (!claims || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    return null
  }
  if (claims.exp >= NEVER_EXPIRY_UNIX_SECONDS) {
    return null
  }

  return claims.exp * 1000
}

export function isShareLinkRecordActive(
  record: ShareLinkRecord,
  nowMs = Date.now()
): boolean {
  if (typeof record.revoked_at === 'string' && record.revoked_at.trim()) {
    return false
  }

  const token = extractShareTokenFromRecord(record)
  if (!token) return false

  const expiresAtMs = resolveShareLinkExpiryMs(record, token)
  if (typeof expiresAtMs === 'number' && expiresAtMs <= nowMs) {
    return false
  }

  return true
}

export function hasActiveProjectShareLink(
  rows: unknown[] | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false

  return rows.some((row) => {
    if (!row || typeof row !== 'object') return false
    return isShareLinkRecordActive(row as ShareLinkRecord, nowMs)
  })
}
