export const DEFAULT_PDF_SCALE = 0.9
export const MIN_PDF_SCALE = 0.5
export const MAX_PDF_SCALE = 3.0

export function getPdfScaleStorageKey(projectId: string, userId?: string | null): string {
  const normalizedProjectId = projectId.trim() || 'unknown-project'
  const normalizedUserId =
    typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous'
  return `clarity:pdf-scale:${normalizedUserId}:${normalizedProjectId}`
}

export function normalizePdfScale(value: unknown, fallback = DEFAULT_PDF_SCALE): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN

  if (!Number.isFinite(parsed)) return fallback
  return Math.min(MAX_PDF_SCALE, Math.max(MIN_PDF_SCALE, parsed))
}
