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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDashboardSettings,
  type ChatModelPreference,
} from '@/contexts/DashboardSettingsContext'
import { QUICK_EDIT_GEMINI_MODEL_OPTIONS } from '@/lib/constants/gemini-models'
import { useQuickEditQuota } from '@/hooks/useQuickEditQuota'
import { AiQuotaDisplay } from '@/components/ai-quota-display'

export default function AssistantSettingsPage() {
  const { settings, updateSetting } = useDashboardSettings()
  const {
    quota: quickEditQuota,
    isLoading: isQuickEditQuotaLoading,
    error: quickEditQuotaError,
    refresh: refreshQuickEditQuota,
  } = useQuickEditQuota({ autoRefreshMs: 30_000 })
  const quickEditQuotaUsagePercent =
    quickEditQuota.limit > 0 ? Math.min((quickEditQuota.used / quickEditQuota.limit) * 100, 100) : 0

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
                {QUICK_EDIT_GEMINI_MODEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
    </div>
  )
}
