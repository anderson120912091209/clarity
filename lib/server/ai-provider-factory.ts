import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

export type AIProvider = 'anthropic' | 'google' | 'openai'

interface ProviderRequest {
  provider?: string
  apiKey?: string
  model?: string
}

interface ProviderResult {
  model: LanguageModel
  resolvedModelId: string
  provider: AIProvider
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  google: 'gemini-2.5-flash',
  openai: 'gpt-4.1',
}

const SUPPORTED_PROVIDERS = new Set<string>(['anthropic', 'google', 'openai'])

export function createProviderFromRequest(req: ProviderRequest): ProviderResult {
  const { provider, apiKey, model } = req

  if (!provider || !SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported or missing AI provider: ${provider}`)
  }

  if (!apiKey) {
    throw new Error('API key is required. Configure your AI keys in Settings.')
  }

  const typedProvider = provider as AIProvider
  const resolvedModel = model || DEFAULT_MODELS[typedProvider]

  switch (typedProvider) {
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey })
      return { model: google(resolvedModel), resolvedModelId: resolvedModel, provider: 'google' }
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey })
      return { model: anthropic(resolvedModel), resolvedModelId: resolvedModel, provider: 'anthropic' }
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey })
      return { model: openai(resolvedModel), resolvedModelId: resolvedModel, provider: 'openai' }
    }
  }
}
