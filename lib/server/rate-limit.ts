type FixedQuotaBucket = {
  used: number
}

export interface FixedQuotaResult {
  allowed: boolean
  limit: number
  used: number
  remaining: number
}

interface FixedQuotaOptions {
  key: string
  limit: number
}

const FIXED_QUOTA_BUCKETS_KEY = '__clarity_fixed_quota_buckets__'

function getBucketsStore(): Map<string, FixedQuotaBucket> {
  const globalStore = globalThis as typeof globalThis & {
    [FIXED_QUOTA_BUCKETS_KEY]?: Map<string, FixedQuotaBucket>
  }

  if (!globalStore[FIXED_QUOTA_BUCKETS_KEY]) {
    globalStore[FIXED_QUOTA_BUCKETS_KEY] = new Map<string, FixedQuotaBucket>()
  }

  return globalStore[FIXED_QUOTA_BUCKETS_KEY]!
}

export function checkFixedQuota(options: FixedQuotaOptions): FixedQuotaResult {
  const buckets = getBucketsStore()
  const bucket = buckets.get(options.key) ?? { used: 0 }

  if (bucket.used >= options.limit) {
    buckets.set(options.key, bucket)

    return {
      allowed: false,
      limit: options.limit,
      used: bucket.used,
      remaining: 0,
    }
  }

  bucket.used += 1
  buckets.set(options.key, bucket)

  return {
    allowed: true,
    limit: options.limit,
    used: bucket.used,
    remaining: Math.max(options.limit - bucket.used, 0),
  }
}
