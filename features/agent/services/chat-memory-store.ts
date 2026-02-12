import { id, tx } from '@instantdb/react'
import { db } from '@/lib/constants'

export type MemoryScope = 'user' | 'project' | 'thread'
export type MemoryKind = 'preference' | 'fact' | 'constraint' | 'summary'

export interface PersistedMemoryItem {
  id: string
  user_id?: string
  projectId?: string
  threadId?: string
  scope?: MemoryScope
  kind?: MemoryKind
  content?: string
  sourceMessageId?: string
  salience?: number
  lastUsedAt?: string
  created_at?: string
  updated_at?: string
}

export interface MemoryCandidate {
  scope: MemoryScope
  kind: MemoryKind
  content: string
  salience: number
}

const nowIso = () => new Date().toISOString()

const normalizeComparableContent = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

const normalizeSalience = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.3))

function sameScope(item: PersistedMemoryItem, candidate: MemoryCandidate, projectId: string, threadId?: string | null) {
  if (item.scope !== candidate.scope) return false
  if (candidate.scope === 'project') return (item.projectId ?? '') === projectId
  if (candidate.scope === 'thread') return (item.threadId ?? '') === (threadId ?? '')
  return true
}

export async function upsertMemoryCandidates(opts: {
  userId: string
  projectId: string
  threadId?: string | null
  sourceMessageId?: string
  existing: PersistedMemoryItem[]
  candidates: MemoryCandidate[]
}) {
  if (!opts.userId || !opts.projectId || opts.candidates.length === 0) return

  const now = nowIso()
  const ops: ReturnType<typeof tx.ai_memory_items[string]['update']>[] = []

  for (const candidate of opts.candidates) {
    const comparable = normalizeComparableContent(candidate.content)
    if (!comparable) continue

    const existing = opts.existing.find(
      (item) =>
        sameScope(item, candidate, opts.projectId, opts.threadId) &&
        item.kind === candidate.kind &&
        normalizeComparableContent(item.content ?? '') === comparable
    )

    if (existing) {
      ops.push(
        tx.ai_memory_items[existing.id].update({
          salience: Math.max(existing.salience ?? 0, normalizeSalience(candidate.salience)),
          lastUsedAt: now,
          updated_at: now,
        })
      )
      continue
    }

    const memoryId = id()
    ops.push(
      tx.ai_memory_items[memoryId].update({
        user_id: opts.userId,
        projectId: candidate.scope === 'user' ? '' : opts.projectId,
        threadId: candidate.scope === 'thread' ? opts.threadId ?? '' : '',
        scope: candidate.scope,
        kind: candidate.kind,
        content: candidate.content.trim().replace(/\s+/g, ' '),
        sourceMessageId: opts.sourceMessageId ?? '',
        salience: normalizeSalience(candidate.salience),
        lastUsedAt: now,
        created_at: now,
        updated_at: now,
      })
    )
  }

  if (ops.length === 0) return
  await db.transact(ops)
}

export async function markMemoryItemsUsed(memoryIds: string[]) {
  if (!memoryIds.length) return
  const now = nowIso()
  await db.transact(
    memoryIds.map((memoryId) =>
      tx.ai_memory_items[memoryId].update({
        lastUsedAt: now,
        updated_at: now,
      })
    )
  )
}

export function sortMemoryItems(items: PersistedMemoryItem[]) {
  return items
    .slice()
    .sort((left, right) => {
      const salienceDelta = (right.salience ?? 0) - (left.salience ?? 0)
      if (salienceDelta !== 0) return salienceDelta

      const leftUsedAt = left.lastUsedAt ?? left.updated_at ?? left.created_at ?? ''
      const rightUsedAt = right.lastUsedAt ?? right.updated_at ?? right.created_at ?? ''
      if (leftUsedAt === rightUsedAt) return 0
      return leftUsedAt < rightUsedAt ? 1 : -1
    })
}

export function selectPromptMemories(items: PersistedMemoryItem[], opts: {
  projectId: string
  threadId?: string | null
  maxItems?: number
}) {
  const maxItems = opts.maxItems ?? 8
  const filtered = items.filter((item) => {
    if (!item.content?.trim()) return false
    if (item.scope === 'user') return true
    if (item.scope === 'project') return (item.projectId ?? '') === opts.projectId
    if (item.scope === 'thread') return (item.threadId ?? '') === (opts.threadId ?? '')
    return false
  })

  return sortMemoryItems(filtered).slice(0, maxItems)
}

export function buildMemorySystemMessage(items: PersistedMemoryItem[]) {
  if (!items.length) return ''

  const lines = items.map((item) => {
    const kind = item.kind ?? 'fact'
    const scope = item.scope ?? 'project'
    return `- [${scope}/${kind}] ${item.content?.trim()}`
  })

  return [
    'Persistent memory from prior user interactions.',
    'Use these as soft constraints/facts unless the user explicitly overrides them.',
    ...lines,
  ].join('\n')
}
