export type SubscriptionPlan = 'free' | 'pro'

export interface SubscriptionEntitlements {
  quickEditQuotaLimit: number
  /** Monthly AI token budget (input + output tokens combined) */
  aiTokenLimit: number
  activeSharedProjectLimit: number | null
  unlimitedCompile: boolean
}

/** Free tier: 50 000 tokens/month — enough to try, not enough to abuse */
const FREE_AI_TOKEN_LIMIT = 50_000
/** Pro tier: 10 000 000 tokens/month — generous but profitable at $9/mo */
const PRO_AI_TOKEN_LIMIT = 10_000_000

const FREE_ENTITLEMENTS: SubscriptionEntitlements = {
  quickEditQuotaLimit: 20,
  aiTokenLimit: FREE_AI_TOKEN_LIMIT,
  activeSharedProjectLimit: 1,
  unlimitedCompile: false,
}

const PRO_ENTITLEMENTS: SubscriptionEntitlements = {
  quickEditQuotaLimit: 100,
  aiTokenLimit: PRO_AI_TOKEN_LIMIT,
  activeSharedProjectLimit: null,
  unlimitedCompile: true,
}

const PRO_PLAN_ALIASES = new Set(['pro', 'supporter', 'premium', 'paid'])

export function normalizeSubscriptionPlan(rawPlan: unknown): SubscriptionPlan {
  if (typeof rawPlan !== 'string') return 'free'
  const normalized = rawPlan.trim().toLowerCase()
  return PRO_PLAN_ALIASES.has(normalized) ? 'pro' : 'free'
}

export function getSubscriptionEntitlements(rawPlan: unknown): SubscriptionEntitlements {
  return normalizeSubscriptionPlan(rawPlan) === 'pro'
    ? PRO_ENTITLEMENTS
    : FREE_ENTITLEMENTS
}

export function isProSubscription(rawPlan: unknown): boolean {
  return normalizeSubscriptionPlan(rawPlan) === 'pro'
}
