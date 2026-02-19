export type SubscriptionPlan = 'free' | 'pro'

export interface SubscriptionEntitlements {
  quickEditQuotaLimit: number
  activeSharedProjectLimit: number | null
  unlimitedCompile: boolean
}

const FREE_ENTITLEMENTS: SubscriptionEntitlements = {
  quickEditQuotaLimit: 20,
  activeSharedProjectLimit: 1,
  unlimitedCompile: false,
}

const PRO_ENTITLEMENTS: SubscriptionEntitlements = {
  quickEditQuotaLimit: 100,
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
