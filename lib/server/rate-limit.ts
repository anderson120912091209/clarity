type FixedQuotaBucket = {
  used: number
}

export interface FixedQuotaResult {
  allowed: boolean
  limit: number
  used: number
  remaining: number
  store: 'upstash' | 'memory'
}

interface FixedQuotaOptions {
  key: string
  limit: number
}

const FIXED_QUOTA_BUCKETS_KEY = '__clarity_fixed_quota_buckets__'
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim()
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

function getBucketsStore(): Map<string, FixedQuotaBucket> {
  const globalStore = globalThis as typeof globalThis & {
    [FIXED_QUOTA_BUCKETS_KEY]?: Map<string, FixedQuotaBucket>
  }

  if (!globalStore[FIXED_QUOTA_BUCKETS_KEY]) {
    globalStore[FIXED_QUOTA_BUCKETS_KEY] = new Map<string, FixedQuotaBucket>()
  }

  return globalStore[FIXED_QUOTA_BUCKETS_KEY]!
}

async function incrementUpstashCounter(key: string): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  const endpoint = `${UPSTASH_URL.replace(/\/+$/, '')}/incr/${encodeURIComponent(key)}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json().catch(() => ({}))) as { result?: number | string }
    if (typeof payload.result === 'number') return payload.result
    if (typeof payload.result === 'string') {
      const parsed = Number(payload.result)
      return Number.isFinite(parsed) ? parsed : null
    }

    return null
  } catch {
    return null
  }
}

async function readUpstashCounter(key: string): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  const endpoint = `${UPSTASH_URL.replace(/\/+$/, '')}/get/${encodeURIComponent(key)}`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json().catch(() => ({}))) as { result?: number | string | null }
    if (payload.result === null || payload.result === undefined) return 0
    if (typeof payload.result === 'number') return payload.result
    if (typeof payload.result === 'string') {
      const parsed = Number(payload.result)
      return Number.isFinite(parsed) ? parsed : null
    }

    return null
  } catch {
    return null
  }
}

function buildQuotaResult(limit: number, used: number, store: 'upstash' | 'memory'): FixedQuotaResult {
  return {
    allowed: used <= limit,
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    store,
  }
}

export async function checkFixedQuota(options: FixedQuotaOptions): Promise<FixedQuotaResult> {
  const persistentCount = await incrementUpstashCounter(options.key)
  if (persistentCount !== null) {
    const used = Math.max(persistentCount, 0)
    return buildQuotaResult(options.limit, used, 'upstash')
  }

  const buckets = getBucketsStore()
  const bucket = buckets.get(options.key) ?? { used: 0 }

  if (bucket.used >= options.limit) {
    buckets.set(options.key, bucket)
    return buildQuotaResult(options.limit, bucket.used, 'memory')
  }

  bucket.used += 1
  buckets.set(options.key, bucket)

  return buildQuotaResult(options.limit, bucket.used, 'memory')
}

export async function getFixedQuotaSnapshot(options: FixedQuotaOptions): Promise<FixedQuotaResult> {
  const persistentCount = await readUpstashCounter(options.key)
  if (persistentCount !== null) {
    const used = Math.max(persistentCount, 0)
    return buildQuotaResult(options.limit, used, 'upstash')
  }

  const bucket = getBucketsStore().get(options.key)
  const used = bucket?.used ?? 0
  return buildQuotaResult(options.limit, used, 'memory')
}
