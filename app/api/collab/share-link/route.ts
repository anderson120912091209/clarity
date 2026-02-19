import { NextResponse } from 'next/server'
import { createShareToken } from '@/features/collaboration/share-token.server'
import { normalizeCollaborationRole } from '@/features/collaboration/roles'
import { buildCollaborationRoomId } from '@/features/collaboration/room'
import {
  authenticateInstantRequest,
  isAuthenticatedUserMismatch,
} from '@/features/collaboration/server/instant-auth'

export const runtime = 'nodejs'
const NEVER_EXPIRY_UNIX_SECONDS = 253402300799 // 9999-12-31T23:59:59Z

interface ShareLinkRequestBody {
  projectId?: unknown
  fileId?: unknown
  role?: unknown
  expiresInHours?: unknown
  userId?: unknown
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeExpiryHours(value: unknown): number | null {
  if (value === null || value === 'never') return null
  if (typeof value !== 'number' || Number.isNaN(value)) return 24
  return Math.min(24 * 365, Math.max(1, Math.round(value)))
}

export async function POST(req: Request) {
  const auth = await authenticateInstantRequest(req)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.failure.error },
      { status: auth.failure.status }
    )
  }

  const shareSecret = process.env.COLLAB_SHARE_SECRET?.trim()
  if (!shareSecret) {
    return NextResponse.json(
      { error: 'COLLAB_SHARE_SECRET is not configured.' },
      { status: 500 }
    )
  }

  const body = (await req.json().catch(() => null)) as ShareLinkRequestBody | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const projectId = asNonEmptyString(body.projectId)
  const fileId = asNonEmptyString(body.fileId)
  if (isAuthenticatedUserMismatch(body.userId, auth.user.id)) {
    return NextResponse.json(
      { error: 'Authenticated user mismatch.' },
      { status: 403 }
    )
  }

  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing required field: projectId.' },
      { status: 400 }
    )
  }

  const role = normalizeCollaborationRole(body.role, 'commenter')
  const expiresInHours = normalizeExpiryHours(body.expiresInHours)
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt =
    expiresInHours === null
      ? NEVER_EXPIRY_UNIX_SECONDS
      : issuedAt + expiresInHours * 60 * 60

  const token = createShareToken(
    {
      v: 1,
      projectId,
      fileId: '*',
      role,
      issuedByUserId: auth.user.id,
      iat: issuedAt,
      exp: expiresAt,
    },
    shareSecret
  )

  const requestUrl = new URL(req.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const baseUrl = appUrl || requestUrl.origin
  const shareUrl = new URL(`/project/${projectId}`, baseUrl)
  shareUrl.searchParams.set('share', token)
  if (fileId) {
    shareUrl.searchParams.set('file', fileId)
  }

  return NextResponse.json({
    shareUrl: shareUrl.toString(),
    token,
    role,
    expiresAt: expiresInHours === null ? null : expiresAt,
    roomId: buildCollaborationRoomId(projectId),
  })
}
