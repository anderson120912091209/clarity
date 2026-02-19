'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import { cn } from '@/lib/utils'
import { useOthersListener, useStatus, useEventListener } from '../liveblocks'
import type { CollaborationRoomEvent } from '../types'

interface CollaborationEventToastsProps {
  currentUserId: string
}

interface ToastMessage {
  id: string
  text: string
}

export function CollaborationEventToasts({ currentUserId }: CollaborationEventToastsProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const status = useStatus()
  const previousStatusRef = useRef<string | null>(null)

  const pushToast = useCallback((text: string) => {
    const toast: ToastMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
    }

    setMessages((prev) => [...prev.slice(-2), toast])
    window.setTimeout(() => {
      setMessages((prev) => prev.filter((entry) => entry.id !== toast.id))
    }, 2600)
  }, [])

  useOthersListener(
    useCallback(
      (event) => {
        const participant = event.user
        if (!participant?.id || participant.id === currentUserId) return

        const name =
          typeof participant.info?.name === 'string' && participant.info.name.trim()
            ? participant.info.name.trim()
            : 'Someone'

        if (event.type === 'enter') {
          pushToast(`${name} joined this session`)
          posthog.capture('collab_user_joined', {
            participant_id: participant.id,
          })
        } else if (event.type === 'leave') {
          pushToast(`${name} left this session`)
          posthog.capture('collab_user_left', {
            participant_id: participant.id,
          })
        }
      },
      [currentUserId, pushToast]
    )
  )

  useEventListener(
    useCallback(
      ({ event }) => {
        const collabEvent = event as CollaborationRoomEvent
        if (collabEvent.type !== 'reconnect') return
        if (collabEvent.userId === currentUserId) return
        pushToast(`${collabEvent.userName} reconnected`)
      },
      [currentUserId, pushToast]
    )
  )

  useEffect(() => {
    const previousStatus = previousStatusRef.current
    previousStatusRef.current = status

    if (previousStatus === 'reconnecting' && status === 'connected') {
      pushToast('Reconnected to collaboration room')
      posthog.capture('collab_reconnected')
    }
  }, [pushToast, status])

  if (!messages.length) return null

  return (
    <div className="pointer-events-none fixed right-5 top-16 z-[65] flex w-[280px] flex-col gap-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'rounded-md border border-white/10 bg-[#15161a]/95 px-3 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur'
          )}
        >
          {message.text}
        </div>
      ))}
    </div>
  )
}

