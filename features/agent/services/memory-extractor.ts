import type { MemoryCandidate } from '@/features/agent/services/chat-memory-store'

const MAX_MEMORY_ITEMS_PER_TURN = 3

function normalizeContent(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.。!?]+$/, '')
}

function pushCandidate(
  candidates: MemoryCandidate[],
  candidate: MemoryCandidate | null
) {
  if (!candidate) return
  const content = normalizeContent(candidate.content)
  if (!content) return

  const existing = candidates.find(
    (item) =>
      item.scope === candidate.scope &&
      item.kind === candidate.kind &&
      item.content.toLowerCase() === content.toLowerCase()
  )

  if (existing) {
    existing.salience = Math.max(existing.salience, candidate.salience)
    return
  }

  candidates.push({
    ...candidate,
    content,
  })
}

function extractNameFact(message: string): MemoryCandidate | null {
  const match = message.match(/\bmy name is ([a-z][a-z\-' ]{1,40})\b/i)
  if (!match) return null
  return {
    scope: 'user',
    kind: 'fact',
    content: `User name is ${match[1].trim()}.`,
    salience: 0.8,
  }
}

function extractPreference(message: string): MemoryCandidate | null {
  const patterns = [
    /\bi prefer (.+)$/i,
    /\bplease always (.+)$/i,
    /\balways (.+)$/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (!match) continue
    return {
      scope: 'project',
      kind: 'preference',
      content: match[1].trim(),
      salience: 0.75,
    }
  }

  return null
}

function extractConstraint(message: string): MemoryCandidate | null {
  const patterns = [
    /\bdon't (.+)$/i,
    /\bdo not (.+)$/i,
    /\bnever (.+)$/i,
    /\bmust (.+)$/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (!match) continue
    return {
      scope: 'project',
      kind: 'constraint',
      content: match[1].trim(),
      salience: 0.85,
    }
  }

  return null
}

function extractExplicitRemember(message: string): MemoryCandidate | null {
  const match = message.match(/\bremember (?:that )?(.+)$/i)
  if (!match) return null

  return {
    scope: 'project',
    kind: 'fact',
    content: match[1].trim(),
    salience: 0.9,
  }
}

export function extractMemoryCandidatesFromUserMessage(message: string): MemoryCandidate[] {
  const normalized = message.trim()
  if (!normalized) return []

  const candidates: MemoryCandidate[] = []
  pushCandidate(candidates, extractExplicitRemember(normalized))
  pushCandidate(candidates, extractNameFact(normalized))
  pushCandidate(candidates, extractPreference(normalized))
  pushCandidate(candidates, extractConstraint(normalized))

  return candidates.slice(0, MAX_MEMORY_ITEMS_PER_TURN)
}
