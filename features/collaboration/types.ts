import type { BaseMetadata, JsonObject } from '@liveblocks/client'

export type CollaborationRole = 'viewer' | 'commenter' | 'editor'

export interface CollaborationCursorPosition extends JsonObject {
  lineNumber: number
  column: number
}

export interface CollaborationSelectionRange extends JsonObject {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface CollaborationPresence extends JsonObject {
  cursor: CollaborationCursorPosition | null
  selection: CollaborationSelectionRange | null
  fileId: string | null
  filePath: string | null
  idle: boolean
  lastActiveAt: number
}

export interface CollaborationUserInfo extends JsonObject {
  name?: string
  avatar?: string
  email?: string
  color?: string
  role?: CollaborationRole
}

export interface CollaborationUserMeta {
  id?: string
  info: CollaborationUserInfo
}

export interface CollaborationRoomEvent extends JsonObject {
  type: 'join' | 'leave' | 'reconnect'
  userId: string
  userName: string
  roomId: string
  at: number
}

export interface CollaborationThreadMetadata extends BaseMetadata {
  projectId: string
  fileId: string
  filePath?: string
  anchorStartLine: number
  anchorStartColumn: number
  anchorEndLine: number
  anchorEndColumn: number
  createdByUserId: string
  mentionsCsv?: string
}

export interface CollaborationCommentMetadata extends BaseMetadata {
  mentionsCsv?: string
}
