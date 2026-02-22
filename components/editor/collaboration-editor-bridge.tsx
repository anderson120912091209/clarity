'use client'

import React from 'react'
import {
  useOthers,
  useRoom,
  useUpdateMyPresence,
} from '@/features/collaboration/liveblocks'

/**
 * Data from Liveblocks hooks, passed to CodeEditor as props.
 * Must only be mounted inside a Liveblocks RoomProvider.
 */
export interface CollaborationBridgeData {
  room: ReturnType<typeof useRoom>
  updateMyPresence: ReturnType<typeof useUpdateMyPresence>
  others: ReturnType<typeof useOthers>
}

interface CollaborationEditorBridgeProps {
  children: (data: CollaborationBridgeData) => React.ReactNode
}

export function CollaborationEditorBridge({ children }: CollaborationEditorBridgeProps) {
  const room = useRoom()
  const updateMyPresence = useUpdateMyPresence()
  const others = useOthers()

  return <>{children({ room, updateMyPresence, others })}</>
}
