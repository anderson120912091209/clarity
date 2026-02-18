const COLLABORATION_COLORS = [
  '#38BDF8',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#A78BFA',
  '#F97316',
  '#14B8A6',
  '#EAB308',
  '#8B5CF6',
  '#22C55E',
] as const

function hashToPositiveInt(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export function resolveCollaborationColor(seed: string): string {
  if (!seed) return COLLABORATION_COLORS[0]
  const index = hashToPositiveInt(seed) % COLLABORATION_COLORS.length
  return COLLABORATION_COLORS[index]
}

