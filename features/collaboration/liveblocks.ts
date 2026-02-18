import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import {
  getCollaborationAuthContext,
  resolveMentionSuggestionsFromRegistry,
  resolveUsersFromRegistry,
} from './auth-context'
import type {
  CollaborationCommentMetadata,
  CollaborationPresence,
  CollaborationRoomEvent,
  CollaborationThreadMetadata,
  CollaborationUserMeta,
} from './types'

type CollaborationStorage = Record<string, never>

const collaborationClient = createClient<CollaborationUserMeta>({
  throttle: 16,
  lostConnectionTimeout: 5000,
  authEndpoint: async (room) => {
    const authContext = getCollaborationAuthContext(room)
    if (!authContext) {
      throw new Error('Missing collaboration auth context. Room authorization is not initialized.')
    }

    const response = await fetch('/api/liveblocks-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room,
        projectId: authContext.projectId,
        fileId: authContext.fileId,
        role: authContext.role,
        userId: authContext.userId,
        userInfo: authContext.userInfo,
        shareToken: authContext.shareToken ?? null,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to authorize Liveblocks session.')
    }

    return (await response.json()) as { token: string }
  },
  resolveUsers: async ({ userIds }) => resolveUsersFromRegistry(userIds),
  resolveMentionSuggestions: async ({ text }) => resolveMentionSuggestionsFromRegistry(text),
})

export const {
  RoomProvider,
  useBroadcastEvent,
  useCreateComment,
  useCreateThread,
  useEventListener,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
  useMyPresence,
  useOthers,
  useOthersConnectionIds,
  useOthersListener,
  useOthersMapped,
  useRoom,
  useSelf,
  useStatus,
  useThreads,
  useUpdateMyPresence,
} = createRoomContext<
  CollaborationPresence,
  CollaborationStorage,
  CollaborationUserMeta,
  CollaborationRoomEvent,
  CollaborationThreadMetadata,
  CollaborationCommentMetadata
>(collaborationClient)

export { collaborationClient }
