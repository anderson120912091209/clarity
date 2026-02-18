import type { CollaborationRole, CollaborationUserInfo } from './types'

export interface CollaborationAuthContext {
  roomId: string
  projectId: string
  fileId?: string
  role: CollaborationRole
  userId: string
  userInfo: CollaborationUserInfo
  shareToken?: string
}

const authContextByRoom = new Map<string, CollaborationAuthContext>()
let activeRoomId: string | null = null
const userInfoRegistry = new Map<string, CollaborationUserInfo>()

export function setCollaborationAuthContext(context: CollaborationAuthContext): void {
  authContextByRoom.set(context.roomId, context)
  activeRoomId = context.roomId
  userInfoRegistry.set(context.userId, context.userInfo)
}

export function clearCollaborationAuthContext(roomId?: string): void {
  if (!roomId) {
    authContextByRoom.clear()
    activeRoomId = null
    return
  }

  authContextByRoom.delete(roomId)
  if (activeRoomId === roomId) {
    const remaining = Array.from(authContextByRoom.keys())
    activeRoomId = remaining.length ? remaining[remaining.length - 1] : null
  }
}

export function getCollaborationAuthContext(roomId?: string): CollaborationAuthContext | null {
  if (roomId) {
    const byRoom = authContextByRoom.get(roomId)
    if (byRoom) return byRoom
  }

  if (activeRoomId) {
    return authContextByRoom.get(activeRoomId) ?? null
  }

  return null
}

export function resolveUsersFromRegistry(
  userIds: readonly string[]
): Array<CollaborationUserInfo | undefined> {
  return userIds.map((userId) => userInfoRegistry.get(userId))
}

export function resolveMentionSuggestionsFromRegistry(text: string): string[] {
  const search = text.trim().toLowerCase()
  if (!search) return []

  return Array.from(userInfoRegistry.values())
    .map((user) => user.name)
    .filter((name): name is string => Boolean(name))
    .filter((name) => name.toLowerCase().includes(search))
    .slice(0, 8)
}
