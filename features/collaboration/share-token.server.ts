import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  type CollaborationShareTokenPayload,
  isCollaborationShareTokenPayload,
} from './share-token'

function base64UrlEncode(raw: string): string {
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '==='.slice((normalized.length + 3) % 4)
    return Buffer.from(padded, 'base64').toString('utf8')
  } catch {
    return null
  }
}

function sign(unsignedToken: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function createShareToken(
  payload: CollaborationShareTokenPayload,
  secret: string
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${header}.${body}`
  const signature = sign(unsignedToken, secret)
  return `${unsignedToken}.${signature}`
}

export function verifyShareToken(
  token: string,
  secret: string
): CollaborationShareTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  const expectedSignature = sign(`${header}.${payload}`, secret)

  const left = Buffer.from(signature)
  const right = Buffer.from(expectedSignature)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null
  }

  const payloadJson = base64UrlDecode(payload)
  if (!payloadJson) return null

  try {
    const parsed = JSON.parse(payloadJson) as unknown
    if (!isCollaborationShareTokenPayload(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

