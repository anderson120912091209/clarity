import { Liveblocks } from '@liveblocks/node'
import { NextResponse } from 'next/server'
import { parseCollaborationRoomId } from '@/features/collaboration/room'
import {
  clampRoleByCeiling,
  normalizeCollaborationRole,
  permissionsForRole,
} from '@/features/collaboration/roles'
import { verifyShareToken } from '@/features/collaboration/share-token.server'
import type { CollaborationRole, CollaborationUserInfo } from '@/features/collaboration/types'

export const runtime = 'nodejs'

interface LiveblocksAuthRequestBody {
  room?: unknown
  projectId?: unknown
  fileId?: unknown
  role?: unknown
  userId?: unknown
  userInfo?: unknown
  shareToken?: unknown
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeUserInfo(input: unknown, role: CollaborationRole): CollaborationUserInfo {
  const base = (input && typeof input === 'object' ? input : {}) as Partial<CollaborationUserInfo>
  return {
    name: typeof base.name === 'string' && base.name.trim() ? base.name.trim() : 'Anonymous',
    avatar: typeof base.avatar === 'string' && base.avatar.trim() ? base.avatar.trim() : undefined,
    email: typeof base.email === 'string' && base.email.trim() ? base.email.trim() : undefined,
    color: typeof base.color === 'string' && base.color.trim() ? base.color.trim() : '#38BDF8',
    role,
  }
}

export async function POST(req: Request) {
  const liveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY?.trim()
  if (!liveblocksSecret) {
    return NextResponse.json(
      { error: 'LIVEBLOCKS_SECRET_KEY is not configured.' },
      { status: 500 }
    )
  }

  const rawBody = (await req.json().catch(() => null)) as LiveblocksAuthRequestBody | null
  if (!rawBody) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const room = asNonEmptyString(rawBody.room)
  const projectId = asNonEmptyString(rawBody.projectId)
  const fileId = asNonEmptyString(rawBody.fileId)
  const userId = asNonEmptyString(rawBody.userId)
  if (!room || !projectId || !userId) {
    return NextResponse.json(
      { error: 'Missing required fields: room, projectId, userId.' },
      { status: 400 }
    )
  }

  const parsedRoom = parseCollaborationRoomId(room)
  if (!parsedRoom || parsedRoom.projectId !== projectId) {
    return NextResponse.json({ error: 'Room does not match project.' }, { status: 403 })
  }

  if (parsedRoom.fileId && fileId && parsedRoom.fileId !== fileId) {
    return NextResponse.json({ error: 'Room file does not match request file.' }, { status: 403 })
  }

  const requestedFileId = fileId || parsedRoom.fileId || null

  let effectiveRole = normalizeCollaborationRole(rawBody.role, 'editor')
  const shareToken = asNonEmptyString(rawBody.shareToken)
  if (shareToken) {
    const shareSecret = process.env.COLLAB_SHARE_SECRET?.trim()
    if (!shareSecret) {
      return NextResponse.json(
        { error: 'COLLAB_SHARE_SECRET is not configured.' },
        { status: 500 }
      )
    }

    const claims = verifyShareToken(shareToken, shareSecret)
    if (!claims) {
      return NextResponse.json({ error: 'Invalid share token.' }, { status: 403 })
    }

    const now = Math.floor(Date.now() / 1000)
    if (claims.exp < now) {
      return NextResponse.json({ error: 'Share token expired.' }, { status: 403 })
    }

    if (claims.projectId !== projectId) {
      return NextResponse.json({ error: 'Share token project mismatch.' }, { status: 403 })
    }

    // Backward compatibility:
    // older links were file-scoped, but collaboration is now project-scoped.
    // Keep accepting them so users can switch files in one shared session.
    if (
      claims.fileId !== '*' &&
      requestedFileId &&
      claims.fileId !== requestedFileId &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn('[collab-debug] accepting legacy file-scoped share token', {
        tokenFileId: claims.fileId,
        requestedFileId,
        projectId,
      })
    }

    effectiveRole = clampRoleByCeiling(effectiveRole, claims.role)
  }

  const userInfo = normalizeUserInfo(rawBody.userInfo, effectiveRole)
  const liveblocks = new Liveblocks({
    secret: liveblocksSecret,
  })

  const session = liveblocks.prepareSession(userId, {
    userInfo,
  })
  session.allow(room, permissionsForRole(session, effectiveRole))

  const { status, body, error } = await session.authorize()
  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to authorize session.' },
      { status: 500 }
    )
  }

  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
