'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-3">
      <div className="space-y-0.5">
        <div className="text-[12px] font-medium text-white/90">{title}</div>
        <p className="text-[11px] text-zinc-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export default function DashboardSettingsPage() {
  const { settings, updateSetting, resetSettings } = useDashboardSettings()

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-white/90">Dashboard settings</h1>
        <p className="mt-1 text-[12px] text-zinc-500">
          Configure the dashboard workspace. These settings only affect dashboard pages, not the
          editor.
        </p>
      </div>

      <section className="space-y-3 rounded-md border border-white/[0.08] bg-white/[0.01] p-4">
        <h2 className="text-[13px] font-medium text-white/90">Layout defaults</h2>

        <div className="space-y-1.5">
          <div className="text-[11px] text-zinc-500">Default view</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={settings.defaultView === 'grid' ? 'secondary' : 'ghost'}
              className="h-8 px-3 text-[12px]"
              onClick={() => updateSetting('defaultView', 'grid')}
            >
              Grid
            </Button>
            <Button
              type="button"
              variant={settings.defaultView === 'list' ? 'secondary' : 'ghost'}
              className="h-8 px-3 text-[12px]"
              onClick={() => updateSetting('defaultView', 'list')}
            >
              List
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] text-zinc-500">Default sorting</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={settings.defaultSort === 'date' ? 'secondary' : 'ghost'}
              className="h-8 px-3 text-[12px]"
              onClick={() => updateSetting('defaultSort', 'date')}
            >
              Date
            </Button>
            <Button
              type="button"
              variant={settings.defaultSort === 'name' ? 'secondary' : 'ghost'}
              className="h-8 px-3 text-[12px]"
              onClick={() => updateSetting('defaultSort', 'name')}
            >
              Name
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] text-zinc-500">Density</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={settings.density === 'comfortable' ? 'secondary' : 'ghost'}
              className="h-8 px-3 text-[12px]"
              onClick={() => updateSetting('density', 'comfortable')}
            >
              Comfortable
            </Button>
            <Button
              type="button"
              variant={settings.density === 'compact' ? 'secondary' : 'ghost'}
              className="h-8 px-3 text-[12px]"
              onClick={() => updateSetting('density', 'compact')}
            >
              Compact
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-white/[0.08] bg-white/[0.01] p-4">
        <h2 className="text-[13px] font-medium text-white/90">Workspace identity</h2>

        <div className="space-y-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-3">
          <div className="text-[12px] font-medium text-white/90">Workspace name</div>
          <p className="text-[11px] text-zinc-500">
            Used first in create-project dialogs. If set to Untitled, we fall back to your profile
            name + Workspace, then email.
          </p>
          <Input
            value={settings.workspaceName}
            onChange={(event) => updateSetting('workspaceName', event.target.value)}
            placeholder="Untitled Workspace"
            className="h-8 bg-white/[0.03] border-white/[0.08] text-[12px] text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20"
            aria-label="Workspace name"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-white/[0.08] bg-white/[0.01] p-4">
        <h2 className="text-[13px] font-medium text-white/90">Metadata visibility</h2>

        <SettingRow
          title="Show project type badge"
          description="Display TeX or Typst beside each project."
          checked={settings.showProjectTypeBadge}
          onCheckedChange={(checked) => updateSetting('showProjectTypeBadge', checked)}
        />
        <SettingRow
          title="Show last edited time"
          description="Display relative timestamps in project rows and cards."
          checked={settings.showLastEditedTime}
          onCheckedChange={(checked) => updateSetting('showLastEditedTime', checked)}
        />
        <SettingRow
          title="Show new project card"
          description="Keep the quick-create card at the start of grid view."
          checked={settings.showNewProjectCard}
          onCheckedChange={(checked) => updateSetting('showNewProjectCard', checked)}
        />
        <SettingRow
          title="Show trash count in sidebar"
          description="Display the number of trashed projects beside Trash."
          checked={settings.showTrashCountBadge}
          onCheckedChange={(checked) => updateSetting('showTrashCountBadge', checked)}
        />
      </section>

      <section className="space-y-3 rounded-md border border-white/[0.08] bg-white/[0.01] p-4">
        <h2 className="text-[13px] font-medium text-white/90">Safety checks</h2>

        <SettingRow
          title="Confirm before moving to trash"
          description="Ask before deleting a project from dashboard."
          checked={settings.confirmBeforeTrash}
          onCheckedChange={(checked) => updateSetting('confirmBeforeTrash', checked)}
        />
        <SettingRow
          title="Confirm before permanent delete"
          description="Ask before deleting projects forever from Trash."
          checked={settings.confirmBeforePermanentDelete}
          onCheckedChange={(checked) => updateSetting('confirmBeforePermanentDelete', checked)}
        />
      </section>

      <section className="rounded-md border border-red-500/20 bg-red-500/[0.03] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[13px] font-medium text-white/90">Reset dashboard settings</h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              Restore defaults for view, sorting, visibility, and delete confirmations.
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
      </section>
    </div>
  )
}
