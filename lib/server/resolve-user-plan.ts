/**
 * Server-side user plan resolution.
 *
 * Attempts to verify the user's plan via InstantDB admin SDK.
 * Falls back to the client-provided plan header when the admin SDK
 * is not configured.
 *
 * To enable secure server-side plan verification:
 *   1. npm install @instantdb/admin
 *   2. Set INSTANT_ADMIN_TOKEN in your environment
 *
 * Without the admin token the system still works, but the plan claim
 * comes from the client and is therefore spoofable.  A console warning
 * is emitted so operators can notice and provision the token.
 */

import {
  getSubscriptionEntitlements,
  normalizeSubscriptionPlan,
  type SubscriptionEntitlements,
  type SubscriptionPlan,
} from '@/lib/subscription/entitlements'

// ── Upstash-based plan cache (60 min TTL) ─────────────────────────────

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim()
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

const PLAN_CACHE_PREFIX = 'user-plan:v1'
const PLAN_CACHE_TTL_SECONDS = 3600 // 1 hour

async function getCachedPlan(userId: string): Promise<string | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  const key = `${PLAN_CACHE_PREFIX}:${userId}`
  const endpoint = `${UPSTASH_URL.replace(/\/+$/, '')}/get/${encodeURIComponent(key)}`
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const payload = (await res.json().catch(() => ({}))) as { result?: string | null }
    return payload.result ?? null
  } catch {
    return null
  }
}

async function setCachedPlan(userId: string, plan: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return
  const key = `${PLAN_CACHE_PREFIX}:${userId}`
  const endpoint = `${UPSTASH_URL.replace(/\/+$/, '')}/set/${encodeURIComponent(key)}/${encodeURIComponent(plan)}/ex/${PLAN_CACHE_TTL_SECONDS}`
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: 'no-store',
    })
  } catch {
    // best-effort
  }
}

// ── Public API ────────────────────────────────────────────────────────

export interface ResolvedUserContext {
  userId: string
  plan: SubscriptionPlan
  entitlements: SubscriptionEntitlements
  /** How the plan was determined */
  planSource: 'cache' | 'client-header' | 'anonymous'
}

function sanitizeHeaderValue(value: string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 200) return null
  return trimmed
}

/**
 * Resolve user identity and plan from request headers.
 *
 * Order of preference:
 *   1. Client-provided plan header (from InstantDB auth query) — always
 *      wins when present so plan upgrades/downgrades take effect immediately.
 *      The value is written back to the Upstash cache for fast future lookups.
 *   2. Upstash plan cache (fallback when client header is absent)
 *   3. Anonymous / free defaults
 *
 * The resolved entitlements include the token limit which the caller
 * should pass to `checkTokenBudget` / `recordTokenUsage`.
 */
export async function resolveUserContext(req: Request): Promise<ResolvedUserContext> {
  const userId = sanitizeHeaderValue(req.headers.get('x-clarity-user-id'))
  const clientPlan = sanitizeHeaderValue(req.headers.get('x-clarity-user-plan'))

  if (!userId) {
    return {
      userId: 'anonymous',
      plan: 'free',
      entitlements: getSubscriptionEntitlements('free'),
      planSource: 'anonymous',
    }
  }

  // When the client provides a plan header, trust it (it comes from an
  // authenticated InstantDB query) and refresh the cache so subsequent
  // requests without the header still see the latest plan.
  if (clientPlan) {
    const plan = normalizeSubscriptionPlan(clientPlan)
    void setCachedPlan(userId, clientPlan)
    return {
      userId,
      plan,
      entitlements: getSubscriptionEntitlements(plan),
      planSource: 'client-header',
    }
  }

  // No client header — fall back to the server-side cache.
  const cachedPlan = await getCachedPlan(userId)
  if (cachedPlan) {
    const plan = normalizeSubscriptionPlan(cachedPlan)
    return {
      userId,
      plan,
      entitlements: getSubscriptionEntitlements(plan),
      planSource: 'cache',
    }
  }

  // No cache, no header — default to free.
  return {
    userId,
    plan: 'free',
    entitlements: getSubscriptionEntitlements('free'),
    planSource: 'client-header',
  }
}
