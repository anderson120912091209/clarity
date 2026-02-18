export function buildCollaborationRoomId(projectId: string): string {
  return `project:${projectId}`
}

export function parseCollaborationRoomId(roomId: string): {
  projectId: string
  fileId: string | null
} | null {
  const normalizedRoomId = roomId.trim()

  const legacyMatch = /^project:(.+):file:(.+)$/.exec(normalizedRoomId)
  if (legacyMatch) {
    const projectId = legacyMatch[1]?.trim()
    const fileId = legacyMatch[2]?.trim()
    if (!projectId || !fileId) return null
    return { projectId, fileId }
  }

  const match = /^project:(.+)$/.exec(normalizedRoomId)
  if (!match) return null

  const projectId = match[1]?.trim()
  if (!projectId) return null

  return { projectId, fileId: null }
}
