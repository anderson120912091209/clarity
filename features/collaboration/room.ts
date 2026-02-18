export function buildCollaborationRoomId(projectId: string, fileId: string): string {
  return `project:${projectId}:file:${fileId}`
}

export function parseCollaborationRoomId(roomId: string): {
  projectId: string
  fileId: string
} | null {
  const match = /^project:(.+):file:(.+)$/.exec(roomId.trim())
  if (!match) return null

  const projectId = match[1]?.trim()
  const fileId = match[2]?.trim()
  if (!projectId || !fileId) return null

  return { projectId, fileId }
}

