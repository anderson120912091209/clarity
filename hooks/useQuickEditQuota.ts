'use client'

import { useCallback, useEffect, useState } from 'react'

export interface QuickEditQuotaState {
  limit: number
  used: number
  remaining: number
  allowed: boolean
  store: 'upstash' | 'memory'
}

const DEFAULT_QUOTA: QuickEditQuotaState = {
  limit: 20,
  used: 0,
  remaining: 20,
  allowed: true,
  store: 'memory',
}

interface UseQuickEditQuotaOptions {
  autoRefreshMs?: number
}

export function useQuickEditQuota(options: UseQuickEditQuotaOptions = {}) {
  const [quota, setQuota] = useState<QuickEditQuotaState>(DEFAULT_QUOTA)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQuota = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/agent/quick-edit', {
        method: 'GET',
        cache: 'no-store',
        signal,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch quota: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as Partial<QuickEditQuotaState>
      setQuota({
        limit: Number.isFinite(data.limit) ? Number(data.limit) : DEFAULT_QUOTA.limit,
        used: Number.isFinite(data.used) ? Number(data.used) : DEFAULT_QUOTA.used,
        remaining: Number.isFinite(data.remaining) ? Number(data.remaining) : DEFAULT_QUOTA.remaining,
        allowed: typeof data.allowed === 'boolean' ? data.allowed : DEFAULT_QUOTA.allowed,
        store: data.store === 'upstash' ? 'upstash' : 'memory',
      })
      setError(null)
    } catch (loadError) {
      if (signal?.aborted) return
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch quick edit quota')
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

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
