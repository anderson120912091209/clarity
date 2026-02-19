type RoomLike = {
  id?: string | null
} | null | undefined

const hydratedRoomKeys = new Set<string>()

function normalizeRoomKey(roomKey: string | null | undefined): string | null {
  if (typeof roomKey !== 'string') return null
  const normalized = roomKey.trim()
  return normalized.length ? normalized : null
}

export function resolveCollaborationRoomKey(room: RoomLike): string | null {
  if (!room || typeof room !== 'object') return null
  return normalizeRoomKey(room.id)
}

export function hasRoomCompletedHydration(
  roomKey: string | null | undefined
): boolean {
  const normalized = normalizeRoomKey(roomKey)
  if (!normalized) return false
  return hydratedRoomKeys.has(normalized)
}

export function markRoomHydrated(roomKey: string | null | undefined): void {
  const normalized = normalizeRoomKey(roomKey)
  if (!normalized) return
  hydratedRoomKeys.add(normalized)
}

export function clearRoomHydration(roomKey?: string): void {
  if (typeof roomKey === 'undefined') {
    hydratedRoomKeys.clear()
    return
  }

  const normalized = normalizeRoomKey(roomKey)
  if (!normalized) return
  hydratedRoomKeys.delete(normalized)
}

export function shouldBlockInitialHydration(
  collaborationEnabled: boolean,
  roomKey: string | null | undefined
): boolean {
  if (!collaborationEnabled) return false

  const normalized = normalizeRoomKey(roomKey)
  if (!normalized) return true

  return !hydratedRoomKeys.has(normalized)
}
