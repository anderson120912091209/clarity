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
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'

export default function DashboardSettingsPage() {
  const { settings, updateSetting } = useDashboardSettings()

  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="Dashboard"
        description="Control how projects and trash views are displayed."
      />

      <SettingsSectionCard
        title="Display defaults"
        description="Applied to dashboard and trash when opening the app."
      >
        <SettingsRows>
          <SettingsRow label="Default project layout" description="Choose how projects open by default.">
            <Select
              value={settings.defaultView}
              onValueChange={(value) => updateSetting('defaultView', value as 'grid' | 'list')}
            >
              <SelectTrigger className={SETTINGS_SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow label="Default sorting" description="Applies to projects and trash views.">
            <Select
              value={settings.defaultSort}
              onValueChange={(value) => updateSetting('defaultSort', value as 'date' | 'name')}
            >
              <SelectTrigger className={SETTINGS_SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow label="Density" description="Control spacing in project and trash rows/cards.">
            <Select
              value={settings.density}
              onValueChange={(value) =>
                updateSetting('density', value as 'comfortable' | 'compact')
              }
            >
              <SelectTrigger className={SETTINGS_SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsRows>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Visibility"
        description="Toggle metadata shown in dashboard and sidebar surfaces."
      >
        <SettingsRows>
          <SettingsRow
            label="Show project type badge"
            description="Display LaTeX/Typst tags on project cards and rows."
          >
            <Switch
              checked={settings.showProjectTypeBadge}
              onCheckedChange={(checked) => updateSetting('showProjectTypeBadge', checked)}
            />
          </SettingsRow>

          <SettingsRow
            label="Show last edited time"
            description="Display relative timestamps in dashboard views."
          >
            <Switch
              checked={settings.showLastEditedTime}
              onCheckedChange={(checked) => updateSetting('showLastEditedTime', checked)}
            />
          </SettingsRow>

          <SettingsRow
            label="Show quick-create card"
            description="Keep the 'Create page' card at the start of grid view."
          >
            <Switch
              checked={settings.showNewProjectCard}
              onCheckedChange={(checked) => updateSetting('showNewProjectCard', checked)}
            />
          </SettingsRow>

          <SettingsRow
            label="Show trash count badge"
            description="Display trashed project count in the left sidebar."
          >
            <Switch
              checked={settings.showTrashCountBadge}
              onCheckedChange={(checked) => updateSetting('showTrashCountBadge', checked)}
            />
          </SettingsRow>
        </SettingsRows>
      </SettingsSectionCard>
    </div>
  )
}
