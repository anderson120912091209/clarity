import type { AIProvider } from '@/lib/client/ai-key-store'

export type { AIProvider }

export interface AIProviderMeta {
  name: string
  shortName: string
  keyPlaceholder: string
  keyPrefix: string
  docsUrl: string
  color: string
}

export interface AIModelOption {
  id: string
  label: string
  provider: AIProvider
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderMeta> = {
  anthropic: {
    name: 'Anthropic (Claude)',
    shortName: 'Claude',
    keyPlaceholder: 'sk-ant-api03-...',
    keyPrefix: 'sk-ant-',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: '#D4A574',
  },
  google: {
    name: 'Google (Gemini)',
    shortName: 'Gemini',
    keyPlaceholder: 'AIza...',
    keyPrefix: 'AIza',
    docsUrl: 'https://aistudio.google.com/apikey',
    color: '#4285F4',
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    shortName: 'ChatGPT',
    keyPlaceholder: 'sk-proj-...',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: '#10A37F',
  },
}

export const AI_MODEL_OPTIONS: AIModelOption[] = [
  // ── Anthropic (Claude) ──
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },

  // ── Google (Gemini) ──
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', provider: 'google' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'google' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google' },

  // ── OpenAI ──
  { id: 'o3', label: 'o3', provider: 'openai' },
  { id: 'o4-mini', label: 'o4-mini', provider: 'openai' },
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
]

export const PROVIDER_ORDER: AIProvider[] = ['anthropic', 'google', 'openai']

export function getModelsForProvider(provider: AIProvider): AIModelOption[] {
  return AI_MODEL_OPTIONS.filter((m) => m.provider === provider)
}

export function getDefaultModelForProvider(provider: AIProvider): string {
  const models = getModelsForProvider(provider)
  return models[0]?.id ?? ''
}

export function getModelLabel(modelId: string): string {
  const model = AI_MODEL_OPTIONS.find((m) => m.id === modelId)
  return model?.label ?? modelId
}

export function getProviderForModel(modelId: string): AIProvider | null {
  const model = AI_MODEL_OPTIONS.find((m) => m.id === modelId)
  return model?.provider ?? null
}
