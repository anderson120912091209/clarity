'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  useDashboardSettings,
  type ChatModelPreference,
} from '@/contexts/DashboardSettingsContext'
import { EDITOR_SYNTAX_THEME_OPTIONS } from '@/components/editor/syntax/themes/catalog'
import { QUICK_EDIT_GEMINI_MODEL_OPTIONS } from '@/lib/constants/gemini-models'
import {
  PDF_BACKGROUND_THEME_OPTIONS,
  type PdfBackgroundThemeKey,
} from '@/lib/constants/pdf-background-themes'
import { cn } from '@/lib/utils'

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}

function SettingRow({ label, description, children, className }: SettingRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-3', className)}>
      <div className="space-y-0.5 pr-4">
        <div className="text-[13px] font-medium text-white">{label}</div>
        {description && <div className="text-[12px] text-zinc-500">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

const SELECT_TRIGGER_CLASS = 'h-8 w-[190px] text-[12px]'

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-6">
      <div className="mb-3 px-1">
        <h2 className="text-[14px] font-medium text-white">{title}</h2>
        {description && <p className="text-[12px] text-zinc-500">{description}</p>}
      </div>
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="space-y-1 divide-y divide-white/[0.04]">{children}</div>
      </div>
    </section>
  )
}

export default function PreferencesPage() {
  const { settings, updateSetting, resetSettings } = useDashboardSettings()
  const { theme, setTheme } = useTheme()

  return (
    <div className="pb-20">
      <header className="mb-8">
        <h1 className="text-[20px] font-medium text-white">Preferences</h1>
        <p className="mt-1 text-[12px] text-zinc-500">
          Configure how Clarity behaves across dashboard, editor, and assistant workflows.
        </p>
      </header>

      <div className="space-y-10">
        <Section
          id="workspace"
          title="Workspace"
          description="Identity and appearance settings for your workspace."
        >
          <SettingRow
            label="Workspace name"
            description="Used in the create-project dialog and workspace labels."
          >
            <Input
              value={settings.workspaceName}
              onChange={(event) => updateSetting('workspaceName', event.target.value)}
              placeholder="Untitled Workspace"
              className="h-8 w-[190px] text-[12px]"
            />
          </SettingRow>

          <SettingRow
            label="Interface theme"
            description="Choose light, dark, or follow your system preference."
          >
            <Select
              value={theme === 'light' || theme === 'dark' ? theme : 'system'}
              onValueChange={(value) => setTheme(value)}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </Section>

        <Section
          id="dashboard"
          title="Dashboard"
          description="Control how projects and trash are displayed."
        >
          <SettingRow
            label="Default project layout"
            description="Choose how projects open by default."
          >
            <Select
              value={settings.defaultView}
              onValueChange={(value) => updateSetting('defaultView', value as 'grid' | 'list')}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Default sorting"
            description="Applies to projects and trash views."
          >
            <Select
              value={settings.defaultSort}
              onValueChange={(value) => updateSetting('defaultSort', value as 'date' | 'name')}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Density" description="Control spacing in project and trash rows/cards.">
            <Select
              value={settings.density}
              onValueChange={(value) =>
                updateSetting('density', value as 'comfortable' | 'compact')
              }
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Show project type badge"
            description="Display LaTeX/Typst tags on project cards and rows."
          >
            <Switch
              checked={settings.showProjectTypeBadge}
              onCheckedChange={(checked) => updateSetting('showProjectTypeBadge', checked)}
            />
          </SettingRow>

          <SettingRow
            label="Show last edited time"
            description="Display relative timestamps in dashboard views."
          >
            <Switch
              checked={settings.showLastEditedTime}
              onCheckedChange={(checked) => updateSetting('showLastEditedTime', checked)}
            />
          </SettingRow>

          <SettingRow
            label="Show quick-create card"
            description="Keep the 'Create page' card at the start of grid view."
          >
            <Switch
              checked={settings.showNewProjectCard}
              onCheckedChange={(checked) => updateSetting('showNewProjectCard', checked)}
            />
          </SettingRow>

          <SettingRow
            label="Show trash count badge"
            description="Display trashed project count in the left sidebar."
          >
            <Switch
              checked={settings.showTrashCountBadge}
              onCheckedChange={(checked) => updateSetting('showTrashCountBadge', checked)}
            />
          </SettingRow>
        </Section>

        <Section
          id="editor"
          title="Editor defaults"
          description="Defaults applied when a project has no explicit override yet."
        >
          <SettingRow
            label="Syntax highlighting engine"
            description="Controls code highlighting mode in the source editor."
          >
            <Select
              value={settings.defaultEditorSyntaxTheme}
              onValueChange={(value) =>
                updateSetting('defaultEditorSyntaxTheme', value as 'default' | 'shiki')
              }
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
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
          </SettingRow>

          <SettingRow
            label="Default PDF background"
            description="Used when opening projects without a saved PDF panel theme."
          >
            <Select
              value={settings.defaultPdfBackgroundTheme}
              onValueChange={(value) =>
                updateSetting('defaultPdfBackgroundTheme', value as PdfBackgroundThemeKey)
              }
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
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
          </SettingRow>

          <SettingRow
            label="Enable PDF click-to-source by default"
            description="Use SyncTeX/ratio mapping navigation when available."
          >
            <Switch
              checked={settings.defaultPdfCaretNavigation}
              onCheckedChange={(checked) => updateSetting('defaultPdfCaretNavigation', checked)}
            />
          </SettingRow>
        </Section>

        <Section
          id="assistant"
          title="AI assistant"
          description="Defaults used by the in-editor AI chat panel."
        >
          <SettingRow
            label="Default model"
            description="Preselect model for new chat interactions."
          >
            <Select
              value={settings.defaultChatModel}
              onValueChange={(value) =>
                updateSetting('defaultChatModel', value as ChatModelPreference)
              }
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
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
          </SettingRow>

          <SettingRow
            label="Include current document by default"
            description="Attach active file content to assistant requests automatically."
          >
            <Switch
              checked={settings.defaultChatIncludeCurrentDocument}
              onCheckedChange={(checked) =>
                updateSetting('defaultChatIncludeCurrentDocument', checked)
              }
            />
          </SettingRow>
        </Section>

        <Section
          id="safety"
          title="Safety"
          description="Confirmation prompts for destructive project actions."
        >
          <SettingRow
            label="Confirm before moving to trash"
            description="Show a prompt before sending projects to Trash."
          >
            <Switch
              checked={settings.confirmBeforeTrash}
              onCheckedChange={(checked) => updateSetting('confirmBeforeTrash', checked)}
            />
          </SettingRow>

          <SettingRow
            label="Confirm before permanent delete"
            description="Show a prompt before deleting projects forever."
          >
            <Switch
              checked={settings.confirmBeforePermanentDelete}
              onCheckedChange={(checked) => updateSetting('confirmBeforePermanentDelete', checked)}
            />
          </SettingRow>
        </Section>

        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[13px] font-medium text-white/90">Reset preferences</h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Restore all dashboard, editor, assistant, and safety settings to defaults.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3 text-[12px] text-red-300 hover:bg-red-500/10 hover:text-red-200"
              onClick={resetSettings}
            >
              Reset to defaults
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
