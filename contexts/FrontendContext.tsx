'use client'
import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { db } from '@/lib/constants'
import posthog from 'posthog-js'
import {
  getSubscriptionEntitlements,
  isProSubscription,
  normalizeSubscriptionPlan,
  type SubscriptionEntitlements,
  type SubscriptionPlan,
} from '@/lib/subscription/entitlements'
import {
  clearRuntimeUserContext,
  writeRuntimeUserContext,
  CLARITY_RUNTIME_USER_PLAN_KEY,
} from '@/lib/client/runtime-user-context'

type FrontendAuthState = ReturnType<(typeof db)['useAuth']>
type FrontendUser = FrontendAuthState['user']

type FrontendContextValue = {
  user: FrontendUser
  isLoading: boolean
  plan: SubscriptionPlan
  isPro: boolean
  entitlements: SubscriptionEntitlements
}

const FrontendContext = createContext<FrontendContextValue | undefined>(undefined)

function toUserProperties(user: NonNullable<FrontendUser>) {
  return Object.entries(user).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (key !== 'id') {
      acc[key] = value
    }
    return acc
  }, {})
}

export function FrontendProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = db.useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isPublicRoute =
    pathname === '/' || pathname === '/login' || pathname === '/blogs' || pathname.startsWith('/blogs/')
  const accountPlanQuery = db.useQuery(
    user
      ? {
          account_plans: {
            $: {
              where: {
                user_id: user.id,
              },
            },
          },
          users: {
            $: {
              where: {
                id: user.id,
              },
            },
          },
        }
      : null
  )
  // db.useQuery starts with data=undefined while loading.  Without this
  // guard the plan would momentarily resolve to "free" and overwrite a
  // valid "pro" that's already in localStorage, causing the quota endpoint
  // to flicker between 50 K and 10 M tokens.
  const planQueryLoaded = Boolean(accountPlanQuery.data)
  const accountPlanRecord = accountPlanQuery.data?.account_plans?.[0]
  const legacyUserRecord = accountPlanQuery.data?.users?.[0]

  // While the query is still loading, preserve whatever localStorage has
  // from the last successful resolution so API calls don't regress to "free".
  const cachedPlanRef = useRef<SubscriptionPlan | null>(null)
  if (cachedPlanRef.current === null && typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(CLARITY_RUNTIME_USER_PLAN_KEY)
    cachedPlanRef.current = stored ? normalizeSubscriptionPlan(stored) : null
  }

  const plan: SubscriptionPlan = planQueryLoaded
    ? normalizeSubscriptionPlan(accountPlanRecord?.plan ?? legacyUserRecord?.type)
    : (cachedPlanRef.current ?? 'free')
  const isPro = isProSubscription(plan)
  const entitlements = getSubscriptionEntitlements(plan)

  useEffect(() => {
    if (!isLoading && !user && !isPublicRoute) {
      router.push('/login')
    }
  }, [isLoading, user, router, isPublicRoute])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      posthog.reset()
      return
    }

    const userProperties = toUserProperties(user)
    posthog.identify(user.id, {
      email: user.email,
      ...userProperties,
    })
  }, [isLoading, user])

  useEffect(() => {
    if (!user) {
      clearRuntimeUserContext()
      return
    }

    // Only persist to localStorage once the plan query has actually resolved.
    // Otherwise we'd write "free" on every page load before the query returns.
    if (!planQueryLoaded) return

    writeRuntimeUserContext(user.id, plan)
    cachedPlanRef.current = plan
  }, [plan, planQueryLoaded, user])

  if (isLoading && !isPublicRoute) {
    return null
  }
  
  const value: FrontendContextValue = {
    user,
    isLoading,
    plan,
    isPro,
    entitlements,
  }
  return <FrontendContext.Provider value={value}>{children}</FrontendContext.Provider>
}

export const useFrontend = () => {
  const context = useContext(FrontendContext)
  if (context === undefined) {
    throw new Error('useFrontend must be used within a FrontendProvider')
  }
  return context
}
