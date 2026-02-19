export const CLARITY_RUNTIME_USER_ID_KEY = 'clarity:user-id'
export const CLARITY_RUNTIME_USER_PLAN_KEY = 'clarity:user-plan'

function normalizeHeaderValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length > 200) return null
  return normalized
}

export function writeRuntimeUserContext(userId: unknown, userPlan: unknown): void {
  if (typeof window === 'undefined') return

  const normalizedUserId = normalizeHeaderValue(userId)
  const normalizedUserPlan = normalizeHeaderValue(userPlan)?.toLowerCase() ?? null

  if (normalizedUserId) {
    window.localStorage.setItem(CLARITY_RUNTIME_USER_ID_KEY, normalizedUserId)
  } else {
    window.localStorage.removeItem(CLARITY_RUNTIME_USER_ID_KEY)
  }

  if (normalizedUserPlan) {
    window.localStorage.setItem(CLARITY_RUNTIME_USER_PLAN_KEY, normalizedUserPlan)
  } else {
    window.localStorage.removeItem(CLARITY_RUNTIME_USER_PLAN_KEY)
  }
}

export function clearRuntimeUserContext(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CLARITY_RUNTIME_USER_ID_KEY)
  window.localStorage.removeItem(CLARITY_RUNTIME_USER_PLAN_KEY)
}

export function readRuntimeUserHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const userId = normalizeHeaderValue(window.localStorage.getItem(CLARITY_RUNTIME_USER_ID_KEY))
  const userPlan = normalizeHeaderValue(window.localStorage.getItem(CLARITY_RUNTIME_USER_PLAN_KEY))

  const headers: Record<string, string> = {}
  if (userId) headers['x-clarity-user-id'] = userId
  if (userPlan) headers['x-clarity-user-plan'] = userPlan.toLowerCase()
  return headers
}
