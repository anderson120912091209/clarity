import { NextResponse } from 'next/server'
import { createShareToken } from '@/features/collaboration/share-token.server'
import { normalizeCollaborationRole } from '@/features/collaboration/roles'
import { buildCollaborationRoomId } from '@/features/collaboration/room'

export const runtime = 'nodejs'

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

function normalizeExpiryHours(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 24
  return Math.min(24 * 30, Math.max(1, Math.round(value)))
}

export async function POST(req: Request) {
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
  const userId = asNonEmptyString(body.userId)
  if (!projectId || !fileId || !userId) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, fileId, userId.' },
      { status: 400 }
    )
  }

  const role = normalizeCollaborationRole(body.role, 'commenter')
  const expiresInHours = normalizeExpiryHours(body.expiresInHours)
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + expiresInHours * 60 * 60

  const token = createShareToken(
    {
      v: 1,
      projectId,
      fileId: '*',
      role,
      issuedByUserId: userId,
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
  shareUrl.searchParams.set('file', fileId)

  return NextResponse.json({
    shareUrl: shareUrl.toString(),
    token,
    role,
    expiresAt,
    roomId: buildCollaborationRoomId(projectId, fileId),
  })
}
