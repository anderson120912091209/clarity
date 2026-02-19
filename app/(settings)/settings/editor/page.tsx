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
import { EDITOR_SYNTAX_THEME_OPTIONS } from '@/components/editor/syntax/themes/catalog'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import {
  PDF_BACKGROUND_THEME_OPTIONS,
  type PdfBackgroundThemeKey,
} from '@/lib/constants/pdf-background-themes'

export default function EditorDefaultsSettingsPage() {
  const { settings, updateSetting } = useDashboardSettings()

  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="Editor defaults"
        description="Defaults applied when projects do not have explicit saved overrides."
      />

      <SettingsSectionCard
        title="Editor behavior"
        description="Used in source editor and PDF panel defaults."
      >
        <SettingsRows>
          <SettingsRow
            label="Syntax highlighting engine"
            description="Controls code highlighting mode in the source editor."
          >
            <Select
              value={settings.defaultEditorSyntaxTheme}
              onValueChange={(value) =>
                updateSetting('defaultEditorSyntaxTheme', value as 'default' | 'shiki')
              }
            >
              <SelectTrigger className={SETTINGS_SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITOR_SYNTAX_THEME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow
            label="Default PDF background"
            description="Used when opening projects without a saved PDF panel theme."
          >
            <Select
              value={settings.defaultPdfBackgroundTheme}
              onValueChange={(value) =>
                updateSetting('defaultPdfBackgroundTheme', value as PdfBackgroundThemeKey)
              }
            >
              <SelectTrigger className={SETTINGS_SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PDF_BACKGROUND_THEME_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow
            label="Enable PDF click-to-source by default"
            description="Use SyncTeX/ratio mapping navigation when available."
          >
            <Switch
              checked={settings.defaultPdfCaretNavigation}
              onCheckedChange={(checked) => updateSetting('defaultPdfCaretNavigation', checked)}
            />
          </SettingsRow>

          <SettingsRow
            label="Enable Typst auto-compile by default"
            description="When off, Typst documents compile only on demand (Compile button / Cmd+S)."
          >
            <Switch
              checked={settings.defaultTypstAutoCompile}
              onCheckedChange={(checked) => updateSetting('defaultTypstAutoCompile', checked)}
            />
          </SettingsRow>
        </SettingsRows>
      </SettingsSectionCard>
    </div>
  )
}
