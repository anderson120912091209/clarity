'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AIProvider,
  getActiveProvider,
  getConfiguredProviders,
  getProviderKey,
  hasAnyConfiguredProvider,
  markProviderValidated,
  migrateUnscoped,
  removeProviderKey,
  saveProviderKey,
  setActiveProvider as storeActiveProvider,
  updateProviderModel,
} from '@/lib/client/ai-key-store'
import { getDefaultModelForProvider } from '@/lib/constants/ai-providers'

interface ProviderState {
  configured: boolean
  model: string
  lastValidated: number | null
  maskedKey?: string
}

interface AIProviderContextValue {
  providers: Record<AIProvider, ProviderState>
  activeProvider: AIProvider | null
  hasAnyProvider: boolean
  isLoading: boolean

  saveKey: (provider: AIProvider, apiKey: string, model?: string) => Promise<void>
  removeKey: (provider: AIProvider) => void
  getDecryptedKey: (provider: AIProvider) => Promise<string | null>
  setActiveProvider: (provider: AIProvider) => void
  setProviderModel: (provider: AIProvider, model: string) => void
  testConnection: (
    provider: AIProvider,
    apiKey: string,
    model: string
  ) => Promise<{ success: boolean; error?: string }>
  refreshState: () => void
}

const defaultProviderState: ProviderState = {
  configured: false,
  model: '',
  lastValidated: null,
}

const AIProviderContext = createContext<AIProviderContextValue | null>(null)

export function AIProviderProvider({
  children,
  userId: userIdProp,
}: {
  children: ReactNode
  userId?: string | undefined
}) {
  const userId = userIdProp
  const [providers, setProviders] = useState<Record<AIProvider, ProviderState>>({
    anthropic: defaultProviderState,
    google: defaultProviderState,
    openai: defaultProviderState,
  })
  const [activeProvider, setActiveProviderState] = useState<AIProvider | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshState = useCallback(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    const configured = getConfiguredProviders(userId)
    const newState: Record<AIProvider, ProviderState> = {
      anthropic: { ...defaultProviderState },
      google: { ...defaultProviderState },
      openai: { ...defaultProviderState },
    }

    for (const entry of configured) {
      newState[entry.provider] = {
        configured: true,
        model: entry.model,
        lastValidated: entry.lastValidated,
        maskedKey: entry.maskedKey,
      }
    }

    setProviders(newState)
    setActiveProviderState(getActiveProvider(userId))
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    migrateUnscoped(userId)
    refreshState()
  }, [userId, refreshState])

  const saveKey = useCallback(
    async (provider: AIProvider, apiKey: string, model?: string) => {
      if (!userId) return
      const resolvedModel = model ?? getDefaultModelForProvider(provider)
      await saveProviderKey(userId, provider, apiKey, resolvedModel)

      // Set as active if no active provider
      if (!getActiveProvider(userId)) {
        storeActiveProvider(userId, provider)
      }

      refreshState()
    },
    [userId, refreshState]
  )

  const removeKey = useCallback(
    (provider: AIProvider) => {
      if (!userId) return
      removeProviderKey(userId, provider)
      refreshState()
    },
    [userId, refreshState]
  )

  const getDecryptedKey = useCallback(
    async (provider: AIProvider): Promise<string | null> => {
      if (!userId) return null
      const result = await getProviderKey(userId, provider)
      return result?.apiKey ?? null
    },
    [userId]
  )

  const setActiveProviderAction = useCallback(
    (provider: AIProvider) => {
      if (!userId) return
      storeActiveProvider(userId, provider)
      refreshState()
    },
    [userId, refreshState]
  )

  const setProviderModel = useCallback(
    (provider: AIProvider, model: string) => {
      if (!userId) return
      updateProviderModel(userId, provider, model)
      refreshState()
    },
    [userId, refreshState]
  )

  const testConnection = useCallback(
    async (
      provider: AIProvider,
      apiKey: string,
      model: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/agent/validate-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, apiKey, model }),
        })

        const data = await res.json()

        if (data.valid && userId) {
          markProviderValidated(userId, provider)
          refreshState()
        }

        return { success: data.valid, error: data.error }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Connection failed',
        }
      }
    },
    [userId, refreshState]
  )

  const hasAnyProvider = useMemo(
    () => (userId ? hasAnyConfiguredProvider(userId) : false),
    [providers, userId]
  )

  const value = useMemo<AIProviderContextValue>(
    () => ({
      providers,
      activeProvider,
      hasAnyProvider,
      isLoading,
      saveKey,
      removeKey,
      getDecryptedKey,
      setActiveProvider: setActiveProviderAction,
      setProviderModel,
      testConnection,
      refreshState,
    }),
    [
      providers,
      activeProvider,
      hasAnyProvider,
      isLoading,
      saveKey,
      removeKey,
      getDecryptedKey,
      setActiveProviderAction,
      setProviderModel,
      testConnection,
      refreshState,
    ]
  )

  return <AIProviderContext.Provider value={value}>{children}</AIProviderContext.Provider>
}

export function useAIProvider(): AIProviderContextValue {
  const ctx = useContext(AIProviderContext)
  if (!ctx) {
    throw new Error('useAIProvider must be used within an AIProviderProvider')
  }
  return ctx
}
