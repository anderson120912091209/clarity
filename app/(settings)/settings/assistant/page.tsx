'use client'

import {
  SETTINGS_SELECT_TRIGGER_CLASS,
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDashboardSettings,
  type ChatModelPreference,
} from '@/contexts/DashboardSettingsContext'
import { QUICK_EDIT_GEMINI_MODEL_OPTIONS } from '@/lib/constants/gemini-models'
import { useAiQuota } from '@/hooks/useAiQuota'
import { AiQuotaDisplay } from '@/components/ai-quota-display'
import { useAIProvider } from '@/contexts/AIProviderContext'
import { useFrontend } from '@/contexts/FrontendContext'
import {
  AI_PROVIDERS,
  PROVIDER_ORDER,
  getModelsForProvider,
} from '@/lib/constants/ai-providers'
import Link from 'next/link'
import { Key } from 'lucide-react'

export default function AssistantSettingsPage() {
  const { isPro } = useFrontend()
  const { settings, updateSetting } = useDashboardSettings()
  const {
    quota: quickEditQuota,
    isLoading: isQuickEditQuotaLoading,
    error: quickEditQuotaError,
    refresh: refreshQuickEditQuota,
  } = useAiQuota({ autoRefreshMs: 30_000 })

  let aiProvider: ReturnType<typeof useAIProvider> | null = null
  try {
    aiProvider = useAIProvider()
  } catch {
    // AIProviderContext not available — use legacy model options
  }

  const hasAnyProvider = aiProvider?.hasAnyProvider ?? false
  const configuredProviders = PROVIDER_ORDER.filter(
    (p) => aiProvider?.providers[p]?.configured
  )

  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="AI assistant"
        description="Default configuration used by the in-editor assistant chat panel."
      />

      <SettingsSectionCard
        title="Chat defaults"
        description="Applied when opening new editor chat sessions."
      >
        <SettingsRows>
          <SettingsRow label="Default model" description="Preselect model for new chat interactions.">
            <Select
              value={settings.defaultChatModel}
              onValueChange={(value) =>
                updateSetting('defaultChatModel', value as ChatModelPreference)
              }
            >
              <SelectTrigger className={SETTINGS_SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>

                {/* Show BYOK provider models if any providers are configured */}
                {hasAnyProvider &&
                  configuredProviders.map((provider) => (
                    <SelectGroup key={provider}>
                      <SelectLabel className="text-[10px] uppercase text-zinc-500">
                        {AI_PROVIDERS[provider].shortName}
                      </SelectLabel>
                      {getModelsForProvider(provider).map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}

                {/* Always show legacy Gemini options as fallback */}
                {!hasAnyProvider &&
                  QUICK_EDIT_GEMINI_MODEL_OPTIONS.filter((o) => o.value !== 'auto').map(
                    (option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )
                  )}
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow
            label="Include current document by default"
            description="Attach active file content to assistant requests automatically."
          >
            <Switch
              checked={settings.defaultChatIncludeCurrentDocument}
              onCheckedChange={(checked) =>
                updateSetting('defaultChatIncludeCurrentDocument', checked)
              }
            />
          </SettingsRow>
        </SettingsRows>
      </SettingsSectionCard>

      {/* Provider configuration prompt */}
      {!hasAnyProvider && (
        <SettingsSectionCard
          title="AI Provider"
          description="Connect your own API key to use AI features."
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#6D78E7]/10">
              <Key className="h-4 w-4 text-[#6D78E7]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] text-zinc-300">
                No AI provider configured.
              </p>
              <p className="text-[11px] text-zinc-500">
                Connect your Anthropic, Google, or OpenAI API key to get started.
              </p>
            </div>
            <Link
              href="/settings/ai-providers"
              className="rounded-md bg-white px-3 py-1.5 text-[11px] font-medium text-black transition-colors hover:bg-zinc-200"
            >
              Configure
            </Link>
          </div>
        </SettingsSectionCard>
      )}

      {isPro ? (
        <SettingsSectionCard
          title="Usage quota"
          description="Quick edit quota is enforced per browser client (20 total requests)."
        >
          <div className="px-4 py-3">
            <AiQuotaDisplay
              used={quickEditQuota.used}
              limit={quickEditQuota.limit}
              loading={isQuickEditQuotaLoading}
              error={quickEditQuotaError || null}
              onRefresh={refreshQuickEditQuota}
              showLabel={true}
              compact={false}
            />
            <p className="mt-3 text-[11px] text-zinc-500">
              {quickEditQuota.remaining} requests remaining
            </p>
          </div>
        </SettingsSectionCard>
      ) : (
        <SettingsSectionCard
          title="AI Provider Required"
          description="Free accounts require a personal API key to use AI features."
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#6D78E7]/10">
              <Key className="h-4 w-4 text-[#6D78E7]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] text-zinc-300">
                {hasAnyProvider
                  ? 'Using your own API key — no usage quota applies.'
                  : 'Connect your own API key to start using AI features.'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Your keys are encrypted locally and never stored on our servers.
              </p>
            </div>
            {!hasAnyProvider && (
              <Link
                href="/settings/ai-providers"
                className="rounded-md bg-white px-3 py-1.5 text-[11px] font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Configure
              </Link>
            )}
          </div>
        </SettingsSectionCard>
      )}
    </div>
  )
}
