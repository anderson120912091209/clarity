import { id, tx } from '@instantdb/react'
import { db } from '@/lib/constants'

export type PersistedChatRole = 'system' | 'user' | 'assistant' | 'tool'
export type PersistedMessageStatus = 'completed' | 'error' | 'interrupted' | 'streaming'
export type PersistedRunStatus = 'streaming' | 'completed' | 'failed' | 'aborted'

export interface PersistedThread {
  id: string
  projectId?: string
  user_id?: string
  title?: string
  status?: string
  lastMessagePreview?: string
  lastMessageAt?: string
  summary?: string
  summaryVersion?: number
  created_at?: string
  updated_at?: string
}

export interface PersistedMessage {
  id: string
  threadId?: string
  projectId?: string
  user_id?: string
  role?: PersistedChatRole
  content?: string
  seq?: number
  status?: PersistedMessageStatus
  error?: string
  sourceMessageId?: string
  tokenEstimate?: number
  created_at?: string
  updated_at?: string
}

export interface PersistedRun {
  id: string
  threadId?: string
  messageId?: string
  user_id?: string
  requestId?: string
  status?: PersistedRunStatus
  model?: string
  started_at?: string
  ended_at?: string
  failureReason?: string
  created_at?: string
  updated_at?: string
}

const nowIso = () => new Date().toISOString()

const buildThreadTitle = (content: string) => {
  const trimmed = content.trim()
  if (!trimmed) return 'New chat'
  const singleLine = trimmed.replace(/\s+/g, ' ')
  return singleLine.length <= 64 ? singleLine : `${singleLine.slice(0, 61)}...`
}

export async function createThread(opts: {
  projectId: string
  userId: string
  title?: string
}): Promise<string> {
  const threadId = id()
  const now = nowIso()

  await db.transact([
    tx.ai_threads[threadId].update({
      projectId: opts.projectId,
      user_id: opts.userId,
      title: opts.title ?? 'New chat',
      status: 'active',
      lastMessagePreview: '',
      lastMessageAt: now,
      summary: '',
      summaryVersion: 1,
      created_at: now,
      updated_at: now,
    }),
    tx.projects[opts.projectId].update({
      activeChatThreadId: threadId,
    }),
  ])

  return threadId
}

export async function setProjectActiveThread(projectId: string, threadId: string) {
  await db.transact([
    tx.projects[projectId].update({
      activeChatThreadId: threadId,
    }),
  ])
}

export async function archiveThread(threadId: string) {
  await db.transact([
    tx.ai_threads[threadId].update({
      status: 'archived',
      updated_at: nowIso(),
    }),
  ])
}

export async function upsertThreadMessage(opts: {
  messageId?: string
  threadId: string
  projectId: string
  userId: string
  role: PersistedChatRole
  content: string
  seq: number
  status: PersistedMessageStatus
  error?: string
  sourceMessageId?: string
  tokenEstimate?: number
}) {
  const messageId = opts.messageId ?? id()
  const now = nowIso()
  const messagePreview = opts.role === 'assistant' || opts.role === 'user'
    ? buildThreadTitle(opts.content)
    : ''

  await db.transact([
    tx.ai_messages[messageId].update({
      threadId: opts.threadId,
      projectId: opts.projectId,
      user_id: opts.userId,
      role: opts.role,
      content: opts.content,
      seq: opts.seq,
      status: opts.status,
      error: opts.error ?? '',
      sourceMessageId: opts.sourceMessageId ?? '',
      tokenEstimate: opts.tokenEstimate ?? 0,
      created_at: now,
      updated_at: now,
    }),
    tx.ai_threads[opts.threadId].update({
      lastMessagePreview: messagePreview,
      lastMessageAt: now,
      updated_at: now,
    }),
  ])

  return messageId
}

export async function patchThreadMessage(messageId: string, patch: {
  content?: string
  status?: PersistedMessageStatus
  error?: string
  tokenEstimate?: number
}) {
  await db.transact([
    tx.ai_messages[messageId].update({
      ...patch,
      updated_at: nowIso(),
    }),
  ])
}

export async function createRun(opts: {
  threadId: string
  messageId: string
  userId: string
  requestId: string
  model?: string
}) {
  const runId = id()
  const now = nowIso()
  await db.transact([
    tx.ai_runs[runId].update({
      threadId: opts.threadId,
      messageId: opts.messageId,
      user_id: opts.userId,
      requestId: opts.requestId,
      status: 'streaming',
      model: opts.model ?? '',
      started_at: now,
      ended_at: '',
      failureReason: '',
      created_at: now,
      updated_at: now,
    }),
  ])
  return runId
}

export async function finishRun(runId: string, status: PersistedRunStatus, failureReason?: string) {
  const now = nowIso()
  await db.transact([
    tx.ai_runs[runId].update({
      status,
      ended_at: now,
      failureReason: failureReason ?? '',
      updated_at: now,
    }),
  ])
}

export function computeNextSeq(messages: Array<Pick<PersistedMessage, 'seq'>>) {
  return messages.reduce((max, message) => Math.max(max, message.seq ?? 0), 0) + 1
}

export function sortedThreads(threads: PersistedThread[]) {
  return threads
    .filter((thread) => thread.status !== 'archived')
    .slice()
    .sort((left, right) => {
      const leftValue = left.lastMessageAt ?? left.updated_at ?? left.created_at ?? ''
      const rightValue = right.lastMessageAt ?? right.updated_at ?? right.created_at ?? ''
      return leftValue < rightValue ? 1 : -1
    })
}

export function sortedMessages(messages: PersistedMessage[]) {
  return messages
    .slice()
    .sort((left, right) => {
      const seqDelta = (left.seq ?? 0) - (right.seq ?? 0)
      if (seqDelta !== 0) return seqDelta
      const leftTs = left.created_at ?? ''
      const rightTs = right.created_at ?? ''
      return leftTs < rightTs ? -1 : 1
    })
}
