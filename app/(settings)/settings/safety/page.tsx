'use client'

import {
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { Switch } from '@/components/ui/switch'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'

export default function SafetySettingsPage() {
  const { settings, updateSetting } = useDashboardSettings()

  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="Safety"
        description="Confirmation safeguards for destructive project operations."
      />

      <SettingsSectionCard
        title="Destructive action confirmations"
        description="Keep prompts enabled to reduce accidental data loss."
      >
        <SettingsRows>
          <SettingsRow
            label="Confirm before moving to trash"
            description="Show a prompt before sending projects to Trash."
          >
            <Switch
              checked={settings.confirmBeforeTrash}
              onCheckedChange={(checked) => updateSetting('confirmBeforeTrash', checked)}
            />
          </SettingsRow>

          <SettingsRow
            label="Confirm before permanent delete"
            description="Show a prompt before deleting projects forever."
          >
            <Switch
              checked={settings.confirmBeforePermanentDelete}
              onCheckedChange={(checked) => updateSetting('confirmBeforePermanentDelete', checked)}
            />
          </SettingsRow>
        </SettingsRows>
      </SettingsSectionCard>
    </div>
  )
}
