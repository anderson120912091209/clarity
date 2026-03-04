'use client'

import { useState, useCallback } from 'react'
import {
  SettingsPageHeader,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Trash2,
} from 'lucide-react'
import { useAIProvider } from '@/contexts/AIProviderContext'
import {
  AI_PROVIDERS,
  PROVIDER_ORDER,
  getModelsForProvider,
  getDefaultModelForProvider,
  type AIProvider,
} from '@/lib/constants/ai-providers'
import { getProviderIcon } from '@/components/icons/ai-provider-icons'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface ProviderCardState {
  keyInput: string
  showKey: boolean
  selectedModel: string
  testStatus: TestStatus
  testError: string | null
  isSaving: boolean
}

const initialCardState = (provider: AIProvider, currentModel?: string): ProviderCardState => ({
  keyInput: '',
  showKey: false,
  selectedModel: currentModel || getDefaultModelForProvider(provider),
  testStatus: 'idle',
  testError: null,
  isSaving: false,
})

function ProviderCard({ provider }: { provider: AIProvider }) {
  const meta = AI_PROVIDERS[provider]
  const models = getModelsForProvider(provider)
  const { providers, activeProvider, saveKey, removeKey, testConnection, setActiveProvider } =
    useAIProvider()
  const providerState = providers[provider]

  const [state, setState] = useState<ProviderCardState>(
    initialCardState(provider, providerState.model || undefined)
  )

  const updateState = useCallback(
    (updates: Partial<ProviderCardState>) => setState((prev) => ({ ...prev, ...updates })),
    []
  )

  const handleTest = useCallback(async () => {
    if (!state.keyInput.trim()) return
    updateState({ testStatus: 'testing', testError: null })

    const result = await testConnection(provider, state.keyInput.trim(), state.selectedModel)

    if (result.success) {
      updateState({ testStatus: 'success', testError: null })
    } else {
      updateState({ testStatus: 'error', testError: result.error ?? 'Connection failed' })
    }
  }, [state.keyInput, state.selectedModel, provider, testConnection, updateState])

  const handleSave = useCallback(async () => {
    if (!state.keyInput.trim()) return
    updateState({ isSaving: true })

    await saveKey(provider, state.keyInput.trim(), state.selectedModel)

    updateState({ isSaving: false, keyInput: '', testStatus: 'idle' })
  }, [state.keyInput, state.selectedModel, provider, saveKey, updateState])

  const handleRemove = useCallback(() => {
    removeKey(provider)
    setState(initialCardState(provider))
  }, [provider, removeKey])

  const isConfigured = providerState.configured
  const isActive = activeProvider === provider

  return (
    <div
      className={`relative rounded-lg border p-4 transition-colors ${
        isActive
          ? 'border-[#6D78E7]/40 bg-[#6D78E7]/[0.04]'
          : 'border-white/[0.06] bg-[#0c0c0e]'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {(() => {
            const ProviderIcon = getProviderIcon(provider)
            return (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ backgroundColor: `${meta.color}15` }}
              >
                <ProviderIcon className="h-4 w-4" />
              </div>
            )
          })()}
          <div>
            <div className="text-[13px] font-medium text-white">{meta.name}</div>
            <div className="text-[11px] text-zinc-500">{meta.shortName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConfigured && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Connected
            </span>
          )}
          {isConfigured && !isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveProvider(provider)}
              className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white"
            >
              Set Active
            </Button>
          )}
          {isActive && (
            <span className="rounded-full bg-[#6D78E7]/15 px-2 py-0.5 text-[10px] font-medium text-[#9ea7ff]">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Key Input (show if not configured OR if user wants to update) */}
      {!isConfigured && (
        <>
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-medium text-zinc-400">API Key</label>
            <div className="relative">
              <input
                type={state.showKey ? 'text' : 'password'}
                value={state.keyInput}
                onChange={(e) => updateState({ keyInput: e.target.value, testStatus: 'idle' })}
                placeholder={meta.keyPlaceholder}
                className="w-full rounded-md border border-white/[0.08] bg-[#0c0c0e] px-3 py-2 pr-9 text-[12px] text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#6D78E7]/40"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => updateState({ showKey: !state.showKey })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {state.showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-medium text-zinc-400">
              Default Model
            </label>
            <Select
              value={state.selectedModel}
              onValueChange={(value) => updateState({ selectedModel: value })}
            >
              <SelectTrigger className="h-8 border-white/[0.08] bg-[#0c0c0e] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          {state.testStatus === 'success' && (
            <div className="mb-3 flex items-center gap-1.5 text-[11px] text-green-400">
              <Check className="h-3.5 w-3.5" />
              Connection successful
            </div>
          )}
          {state.testStatus === 'error' && (
            <div className="mb-3 text-[11px] text-red-400">
              {state.testError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleTest}
              disabled={!state.keyInput.trim() || state.testStatus === 'testing'}
              className="h-7 bg-zinc-800 px-3 text-[11px] text-zinc-300 hover:bg-zinc-700"
            >
              {state.testStatus === 'testing' ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                !state.keyInput.trim() ||
                state.isSaving ||
                state.testStatus === 'testing'
              }
              className="h-7 bg-white px-3 text-[11px] text-black hover:bg-zinc-200"
            >
              {state.isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Key'
              )}
            </Button>

            <a
              href={meta.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Get API key
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </>
      )}

      {/* Configured state */}
      {isConfigured && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-[#0c0c0e] px-3 py-2">
            <span className="font-mono text-[11px] tracking-wide text-zinc-400">
              {providerState.maskedKey ?? '••••••••'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-zinc-500">
              Model: <span className="text-zinc-300">{providerState.model}</span>
              {providerState.lastValidated && (
                <>
                  {' '}
                  · Verified{' '}
                  {new Date(providerState.lastValidated).toLocaleDateString()}
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-6 px-2 text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AIProvidersSettingsPage() {
  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="AI Providers"
        description="Connect your own API keys to use AI features. Keys are encrypted locally and never stored on our servers."
      />

      <SettingsSectionCard
        title="API Keys"
        description="Configure one or more AI providers. You only need one to get started."
      >
        <div className="space-y-3 p-4">
          {PROVIDER_ORDER.map((provider) => (
            <ProviderCard key={provider} provider={provider} />
          ))}
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Security" description="How your API keys are protected.">
        <div className="space-y-3 p-4">
          {[
            {
              title: 'Encrypted at rest',
              description:
                'Keys are encrypted with AES-256-GCM using a device-derived key before being stored in your browser.',
            },
            {
              title: 'Never stored on our servers',
              description:
                'Your keys exist only in your browser. They are sent to our server solely to proxy the AI request, then immediately discarded.',
            },
            {
              title: 'Invisible to analytics',
              description:
                'API keys are explicitly excluded from all analytics, error reports, and logging.',
            },
            {
              title: 'Device-bound',
              description:
                'Encryption is tied to your device fingerprint. Copying browser data to another device will not expose your keys.',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2.5">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6D78E7]" />
              <div>
                <div className="text-[12px] font-medium text-white">{item.title}</div>
                <div className="text-[11px] text-zinc-500">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSectionCard>
    </div>
  )
}
