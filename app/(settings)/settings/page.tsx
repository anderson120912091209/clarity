'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  SettingsPageHeader,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { Button } from '@/components/ui/button'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'

const SETTINGS_PAGES = [
  {
    href: '/settings/workspace',
    title: 'Workspace',
    description: 'Workspace name and interface theme.',
  },
  {
    href: '/settings/dashboard',
    title: 'Dashboard',
    description: 'Project list defaults, density, and visibility.',
  },
  {
    href: '/settings/editor',
    title: 'Editor defaults',
    description: 'Default syntax engine and PDF panel behavior.',
  },
  {
    href: '/settings/assistant',
    title: 'AI assistant',
    description: 'Default chat model and context inclusion behavior.',
  },
  {
    href: '/settings/safety',
    title: 'Safety',
    description: 'Confirmation prompts for destructive actions.',
  },
]

export default function PreferencesPage() {
  const { resetSettings } = useDashboardSettings()

  return (
    <div className="pb-20">
      <SettingsPageHeader
        title="Preferences"
        description="Manage defaults for workspace, dashboard, editor, assistant, and safety."
      />

      <SettingsSectionCard
        title="Sections"
        description="Each settings area is now on its own page for faster navigation."
      >
        <div className="divide-y divide-white/[0.05]">
          {SETTINGS_PAGES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="text-[13px] font-medium text-white">{item.title}</p>
                <p className="text-[12px] text-zinc-500">{item.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-white" />
            </Link>
          ))}
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Reset preferences"
        description="Restore all settings to their default values."
        className="border-red-500/20 bg-red-500/[0.03]"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[12px] text-zinc-400">
            This clears custom dashboard, editor, assistant, and safety defaults.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-3 text-[12px] text-red-300 hover:bg-red-500/10 hover:text-red-200"
            onClick={resetSettings}
          >
            Reset to defaults
          </Button>
        </div>
      </SettingsSectionCard>
    </div>
  )
}
