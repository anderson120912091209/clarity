'use client'

import { useTheme } from 'next-themes'
import {
  SETTINGS_SELECT_TRIGGER_CLASS,
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'

export default function WorkspaceSettingsPage() {
  const { settings, updateSetting } = useDashboardSettings()
  const { theme, setTheme } = useTheme()

  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="Workspace"
        description="Identity and appearance settings used across your workspace."
      />

      <SettingsSectionCard
        title="General"
        description="These values are used in dialogs and workspace labels."
      >
        <SettingsRows>
          <SettingsRow
            label="Workspace name"
            description="Used in the create-project dialog and workspace labels."
          >
            <Input
              value={settings.workspaceName}
              onChange={(event) => updateSetting('workspaceName', event.target.value)}
              placeholder="Untitled Workspace"
              className="h-8 w-[190px] text-[12px]"
            />
          </SettingsRow>

          <SettingsRow
            label="Interface theme"
            description="Choose light, dark, or follow your system preference."
          >
            <Select
              value={theme === 'light' || theme === 'dark' ? theme : 'system'}
              onValueChange={(value) => setTheme(value)}
            >
              <SelectTrigger className={SETTINGS_SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsRows>
      </SettingsSectionCard>
    </div>
  )
}
