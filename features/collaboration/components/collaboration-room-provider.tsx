'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useBroadcastEvent, useStatus, useUpdateMyPresence, RoomProvider } from '../liveblocks'
import { setCollaborationAuthContext, clearCollaborationAuthContext } from '../auth-context'
import { buildCollaborationRoomId } from '../room'
import type {
  CollaborationPresence,
  CollaborationRole,
  CollaborationUserInfo,
} from '../types'

interface CollaborationRoomProviderProps {
  projectId: string
  fileId: string | null
  filePath: string | null
  role: CollaborationRole
  userId: string
  userInfo: CollaborationUserInfo
  shareToken?: string
  authToken?: string
  children: React.ReactNode
}

function CollaborationRoomLifecycle({
  roomId,
  fileId,
  filePath,
  userId,
  userInfo,
}: {
  roomId: string
  fileId: string | null
  filePath: string | null
  userId: string
  userInfo: CollaborationUserInfo
}) {
  const status = useStatus()
  const broadcastEvent = useBroadcastEvent()
  const updateMyPresence = useUpdateMyPresence()
  const previousStatusRef = useRef<string | null>(null)
  const userName = userInfo.name?.trim() || userId

  useEffect(() => {
    const now = Date.now()
    broadcastEvent({
      type: 'join',
      userId,
      userName,
      roomId,
      at: now,
    })

    return () => {
      broadcastEvent({
        type: 'leave',
        userId,
        userName,
        roomId,
        at: Date.now(),
      })
    }
  }, [broadcastEvent, roomId, userId, userName])

  useEffect(() => {
    updateMyPresence({
      fileId,
      filePath,
      idle: false,
      lastActiveAt: Date.now(),
    })
  }, [fileId, filePath, updateMyPresence])

  useEffect(() => {
    const previousStatus = previousStatusRef.current
    previousStatusRef.current = status

    if (previousStatus === 'reconnecting' && status === 'connected') {
      broadcastEvent({
        type: 'reconnect',
        userId,
        userName,
        roomId,
        at: Date.now(),
      })
    }
  }, [broadcastEvent, roomId, status, userId, userName])

  return null
}

export function CollaborationRoomProvider({
  projectId,
  fileId,
  filePath,
  role,
  userId,
  userInfo,
  shareToken,
  authToken,
  children,
}: CollaborationRoomProviderProps) {
  const roomId = useMemo(() => buildCollaborationRoomId(projectId), [projectId])
  const roomProviderKey = useMemo(
    () => `${roomId}::${shareToken ?? 'no-share-token'}::${role}`,
    [roomId, role, shareToken]
  )
  const authContext = useMemo(
    () => ({
      roomId,
      projectId,
      fileId: fileId || undefined,
      role,
      userId,
      userInfo,
      shareToken,
      authToken,
    }),
    [authToken, fileId, projectId, role, roomId, shareToken, userId, userInfo]
  )

  const initialPresence = useMemo<CollaborationPresence>(
    () => ({
      cursor: null,
      selection: null,
      fileId,
      filePath,
      idle: false,
      lastActiveAt: Date.now(),
    }),
    [fileId, filePath]
  )

  // Prime auth context synchronously so authEndpoint never sees an empty context on first connect.
  setCollaborationAuthContext(authContext)

  useLayoutEffect(() => {
    setCollaborationAuthContext(authContext)

    return () => {
      clearCollaborationAuthContext(roomId)
    }
  }, [authContext, roomId])

  return (
    <RoomProvider key={roomProviderKey} id={roomId} initialPresence={initialPresence}>
      <CollaborationRoomLifecycle
        roomId={roomId}
        fileId={fileId}
        filePath={filePath}
        userId={userId}
        userInfo={userInfo}
      />
      {children}
    </RoomProvider>
  )
}
