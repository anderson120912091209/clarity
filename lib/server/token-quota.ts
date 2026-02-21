/**
 * Token-based AI quota service.
 *
 * Uses Upstash Redis as the authoritative persistent store for per-user
 * monthly token consumption.  Falls back to an in-memory Map only when
 * Upstash is NOT configured — in that case a console warning is emitted
 * on every check because the counters will reset on redeploy.
 *
 * Key schema:   ai-tokens:v1:{userId}:{YYYY-MM}
 * Value:        cumulative total tokens (input + output) as an integer
 *
 * Security notes:
 *   - The caller must verify the userId before passing it here.
 *   - Plan-based limits come from the entitlements module, never from the
 *     client.
 *   - The in-memory fallback is deliberately noisy so operators notice and
 *     provision Upstash.
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim()
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

const TOKEN_QUOTA_PREFIX = 'ai-tokens:v1'

// ── In-memory fallback (non-persistent!) ──────────────────────────────

const MEMORY_KEY = '__clarity_token_quota_buckets__'

interface MemoryBucket {
  totalTokens: number
}

function getMemoryStore(): Map<string, MemoryBucket> {
  const g = globalThis as typeof globalThis & {
    [MEMORY_KEY]?: Map<string, MemoryBucket>
  }
  if (!g[MEMORY_KEY]) {
    g[MEMORY_KEY] = new Map<string, MemoryBucket>()
  }
  return g[MEMORY_KEY]!
}

// ── Upstash helpers ───────────────────────────────────────────────────

async function upstashIncrBy(key: string, amount: number): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null

  const endpoint = `${UPSTASH_URL.replace(/\/+$/, '')}/incrby/${encodeURIComponent(key)}/${amount}`
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const payload = (await res.json().catch(() => ({}))) as { result?: number | string }
    if (typeof payload.result === 'number') return payload.result
    if (typeof payload.result === 'string') {
      const n = Number(payload.result)
      return Number.isFinite(n) ? n : null
    }
    return null
  } catch {
    return null
  }
}

async function upstashGet(key: string): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null

  const endpoint = `${UPSTASH_URL.replace(/\/+$/, '')}/get/${encodeURIComponent(key)}`
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const payload = (await res.json().catch(() => ({}))) as { result?: number | string | null }
    if (payload.result === null || payload.result === undefined) return 0
    if (typeof payload.result === 'number') return payload.result
    if (typeof payload.result === 'string') {
      const n = Number(payload.result)
      return Number.isFinite(n) ? n : null
    }
    return null
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────

function currentPeriod(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function buildKey(userId: string, period: string): string {
  return `${TOKEN_QUOTA_PREFIX}:${userId}:${period}`
}

export interface TokenQuotaSnapshot {
  /** Tokens used so far this period */
  used: number
  /** Monthly token limit from entitlements */
  limit: number
  /** Remaining token budget */
  remaining: number
  /** Whether the user is within their budget */
  allowed: boolean
  /** Which store is authoritative */
  store: 'upstash' | 'memory'
  /** Current billing period (YYYY-MM) */
  period: string
}

/**
 * Read current token usage without modifying it.
 */
export async function getTokenUsage(
  userId: string,
  limit: number
): Promise<TokenQuotaSnapshot> {
  const period = currentPeriod()
  const key = buildKey(userId, period)

  const upstashValue = await upstashGet(key)
  if (upstashValue !== null) {
    const used = Math.max(upstashValue, 0)
    return {
      used,
      limit,
      remaining: Math.max(limit - used, 0),
      allowed: used < limit,
      store: 'upstash',
      period,
    }
  }

  // Fallback — warn operators
  console.warn(
    '[token-quota] Upstash not available; using volatile in-memory store. ' +
      'Token quotas will reset on redeploy.'
  )
  const bucket = getMemoryStore().get(key)
  const used = bucket?.totalTokens ?? 0
  return {
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    allowed: used < limit,
    store: 'memory',
    period,
  }
}

/**
 * Pre-flight check: can this user start a new AI request?
 * Does NOT consume tokens — call `recordTokenUsage` after the response.
 */
export async function checkTokenBudget(
  userId: string,
  limit: number
): Promise<TokenQuotaSnapshot> {
  return getTokenUsage(userId, limit)
}

/**
 * Record tokens consumed after an AI request completes.
 * Returns the updated snapshot.
 */
export async function recordTokenUsage(
  userId: string,
  limit: number,
  tokensUsed: number
): Promise<TokenQuotaSnapshot> {
  if (tokensUsed <= 0) {
    return getTokenUsage(userId, limit)
  }

  const period = currentPeriod()
  const key = buildKey(userId, period)
  const amount = Math.ceil(tokensUsed)

  const upstashResult = await upstashIncrBy(key, amount)
  if (upstashResult !== null) {
    const used = Math.max(upstashResult, 0)
    return {
      used,
      limit,
      remaining: Math.max(limit - used, 0),
      allowed: used < limit,
      store: 'upstash',
      period,
    }
  }

  // Fallback
  console.warn('[token-quota] Upstash unavailable for recordTokenUsage; using memory fallback.')
  const store = getMemoryStore()
  const bucket = store.get(key) ?? { totalTokens: 0 }
  bucket.totalTokens += amount
  store.set(key, bucket)

  const used = bucket.totalTokens
  return {
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    allowed: used < limit,
    store: 'memory',
    period,
  }
}
