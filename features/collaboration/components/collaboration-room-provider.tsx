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
  enabled: boolean
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
    try {
      broadcastEvent({
        type: 'join',
        userId,
        userName,
        roomId,
        at: now,
      })
    } catch (err) {
      console.warn('[collab] Failed to broadcast join event:', err)
    }

    return () => {
      try {
        broadcastEvent({
          type: 'leave',
          userId,
          userName,
          roomId,
          at: Date.now(),
        })
      } catch (err) {
        console.warn('[collab] Failed to broadcast leave event:', err)
      }
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
      try {
        broadcastEvent({
          type: 'reconnect',
          userId,
          userName,
          roomId,
          at: Date.now(),
        })
      } catch (err) {
        console.warn('[collab] Failed to broadcast reconnect event:', err)
      }
    }
  }, [broadcastEvent, roomId, status, userId, userName])

  return null
}

export function CollaborationRoomProvider({
  enabled,
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
  // When collaboration is disabled, pass children through without any Liveblocks setup.
  if (!enabled) {
    return <>{children}</>
  }

  return (
    <CollaborationRoomProviderInner
      projectId={projectId}
      fileId={fileId}
      filePath={filePath}
      role={role}
      userId={userId}
      userInfo={userInfo}
      shareToken={shareToken}
      authToken={authToken}
    >
      {children}
    </CollaborationRoomProviderInner>
  )
}

function CollaborationRoomProviderInner({
  projectId,
  fileId,
  filePath,
  role,
  userId,
  userInfo,
  shareToken,
  authToken,
  children,
}: Omit<CollaborationRoomProviderProps, 'enabled'>) {
  const roomId = useMemo(() => buildCollaborationRoomId(projectId), [projectId])

  // Stabilise the key so that only a *meaningful* credential change forces a
  // full RoomProvider remount (disconnect → reconnect).  Previously the raw
  // shareToken string was part of the key, so every time the token was
  // re-fetched from the DB (same room, same role, just a different JWT string)
  // React would destroy and recreate the provider – causing the spurious
  // userLeft / userEntered churn visible in the Liveblocks dashboard.
  //
  // We now derive a short fingerprint: same (room + role + projectId) keeps
  // the same key, so the WebSocket stays alive.  A genuine role change (e.g.
  // viewer → editor) still triggers the remount we actually need.
  const shareTokenFingerprint = useMemo(() => {
    if (!shareToken) return 'no-share-token'
    // Use just projectId + role as the identity – all tokens for the same
    // project & role are functionally equivalent.
    return `${projectId}::${role}`
  }, [projectId, role, shareToken])

  const roomProviderKey = useMemo(
    () => `${roomId}::${shareTokenFingerprint}`,
    [roomId, shareTokenFingerprint]
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
