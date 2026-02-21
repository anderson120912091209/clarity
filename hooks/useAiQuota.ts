'use client'

import { useCallback, useEffect, useState } from 'react'
import { useFrontend } from '@/contexts/FrontendContext'
import { readRuntimeUserHeaders } from '@/lib/client/runtime-user-context'

export interface AiQuotaState {
  /** Tokens used so far this billing period */
  used: number
  /** Monthly token limit */
  limit: number
  /** Tokens remaining */
  remaining: number
  /** Whether the user can make more requests */
  allowed: boolean
  /** Backing store type */
  store: 'upstash' | 'memory'
  /** Current billing period (YYYY-MM) */
  period: string
  /** Subscription plan */
  plan: string
}

const DEFAULT_QUOTA: AiQuotaState = {
  used: 0,
  limit: 50_000,
  remaining: 50_000,
  allowed: true,
  store: 'memory',
  period: '',
  plan: 'free',
}

interface UseAiQuotaOptions {
  autoRefreshMs?: number
}

export function useAiQuota(options: UseAiQuotaOptions = {}) {
  const { user, plan, entitlements } = useFrontend()
  const [quota, setQuota] = useState<AiQuotaState>({
    ...DEFAULT_QUOTA,
    limit: entitlements.aiTokenLimit,
    remaining: entitlements.aiTokenLimit,
    plan,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQuota = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/agent/quota', {
        method: 'GET',
        cache: 'no-store',
        signal,
        headers: readRuntimeUserHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch quota: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as Partial<AiQuotaState>
      const normalizedLimit = Number.isFinite(data.limit) ? Number(data.limit) : entitlements.aiTokenLimit
      const normalizedUsed = Number.isFinite(data.used) ? Number(data.used) : 0

      setQuota({
        limit: normalizedLimit,
        used: normalizedUsed,
        remaining: Number.isFinite(data.remaining) ? Number(data.remaining) : Math.max(normalizedLimit - normalizedUsed, 0),
        allowed: typeof data.allowed === 'boolean' ? data.allowed : true,
        store: data.store === 'upstash' ? 'upstash' : 'memory',
        period: typeof data.period === 'string' ? data.period : '',
        plan: typeof data.plan === 'string' ? data.plan : plan,
      })
      setError(null)
    } catch (loadError) {
      if (signal?.aborted) return
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch AI quota')
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [entitlements.aiTokenLimit, plan, user?.id])

  useEffect(() => {
    const controller = new AbortController()
    void loadQuota(controller.signal)

    if (!options.autoRefreshMs || options.autoRefreshMs <= 0) {
      return () => controller.abort()
    }

    const interval = setInterval(() => {
      void loadQuota()
    }, options.autoRefreshMs)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [loadQuota, options.autoRefreshMs])

  const refresh = useCallback(() => {
    void loadQuota()
  }, [loadQuota])

  return {
    quota,
    isLoading,
    error,
    refresh,
  }
}
