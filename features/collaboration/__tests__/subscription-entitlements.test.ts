import { describe, expect, it } from 'vitest'
import {
  getSubscriptionEntitlements,
  isProSubscription,
  normalizeSubscriptionPlan,
} from '../../../lib/subscription/entitlements'

describe('subscription entitlements', () => {
  it('defaults to free when plan is missing or unknown', () => {
    expect(normalizeSubscriptionPlan(undefined)).toBe('free')
    expect(normalizeSubscriptionPlan(null)).toBe('free')
    expect(normalizeSubscriptionPlan('')).toBe('free')
    expect(normalizeSubscriptionPlan('enterprise')).toBe('free')
  })

  it('normalizes pro aliases', () => {
    expect(normalizeSubscriptionPlan('pro')).toBe('pro')
    expect(normalizeSubscriptionPlan('supporter')).toBe('pro')
    expect(normalizeSubscriptionPlan('premium')).toBe('pro')
    expect(isProSubscription('PRO')).toBe(true)
  })

  it('returns free entitlements for free users', () => {
    expect(getSubscriptionEntitlements('free')).toEqual({
      quickEditQuotaLimit: 20,
      activeSharedProjectLimit: 1,
      unlimitedCompile: false,
    })
  })

  it('returns pro entitlements for pro users', () => {
    expect(getSubscriptionEntitlements('pro')).toEqual({
      quickEditQuotaLimit: 100,
      activeSharedProjectLimit: null,
      unlimitedCompile: true,
    })
  })
})
