import { useMemo } from 'react'
import { db } from '@/lib/constants'
import type {
  PersistedMessage,
  PersistedRun,
  PersistedThread,
} from '@/features/agent/services/chat-threads-store'
import {
  sortedMessages,
  sortedThreads,
} from '@/features/agent/services/chat-threads-store'

interface UseChatThreadsStateParams {
  projectId: string
  userId: string
  activeThreadId: string | null
}

export function useChatThreadsState({
  projectId,
  userId,
  activeThreadId,
}: UseChatThreadsStateParams) {
  const threadsQuery = db.useQuery(
    projectId && userId
      ? {
          ai_threads: {
            $: {
              where: {
                projectId,
                user_id: userId,
              },
            },
          },
        }
      : null
  )

  const messagesQuery = db.useQuery(
    activeThreadId && userId
      ? {
          ai_messages: {
            $: {
              where: {
                threadId: activeThreadId,
                user_id: userId,
              },
            },
          },
        }
      : null
  )

  const runsQuery = db.useQuery(
    activeThreadId && userId
      ? {
          ai_runs: {
            $: {
              where: {
                threadId: activeThreadId,
                user_id: userId,
              },
            },
          },
        }
      : null
  )

  const threads = useMemo(
    () => sortedThreads((threadsQuery.data?.ai_threads ?? []) as PersistedThread[]),
    [threadsQuery.data?.ai_threads]
  )

  const messages = useMemo(
    () => sortedMessages((messagesQuery.data?.ai_messages ?? []) as PersistedMessage[]),
    [messagesQuery.data?.ai_messages]
  )

  const runs = useMemo(
    () =>
      ((runsQuery.data?.ai_runs ?? []) as PersistedRun[])
        .slice()
        .sort((left, right) => {
          const leftTs = left.started_at ?? ''
          const rightTs = right.started_at ?? ''
          return leftTs < rightTs ? 1 : -1
        }),
    [runsQuery.data?.ai_runs]
  )

  const activeRun = runs.find((run) => run.status === 'streaming') ?? null

  return {
    threads,
    messages,
    runs,
    activeRun,
    isLoading: threadsQuery.isLoading || messagesQuery.isLoading || runsQuery.isLoading,
    error: threadsQuery.error ?? messagesQuery.error ?? runsQuery.error ?? null,
  }
}
