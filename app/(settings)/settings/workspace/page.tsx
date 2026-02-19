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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { useFrontend } from '@/contexts/FrontendContext'
import { db } from '@/lib/constants'
import { id as instantId, tx } from '@instantdb/react'
import { useMemo, useState } from 'react'

export default function WorkspaceSettingsPage() {
  const { settings, updateSetting } = useDashboardSettings()
  const { theme, setTheme } = useTheme()
  const { user, plan, isPro } = useFrontend()
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)
  const showDevPlanControls =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_PLAN_OVERRIDE === 'true'
  const { data: accountPlanData } = db.useQuery(
    user?.id
      ? {
          account_plans: {
            $: {
              where: {
                user_id: user.id,
              },
            },
          },
        }
      : null
  )
  const existingAccountPlanRecord = useMemo(
    () => accountPlanData?.account_plans?.[0],
    [accountPlanData?.account_plans]
  )

  const updatePlan = async (nextPlan: 'free' | 'pro') => {
    if (!user?.id) return

    const nowIso = new Date().toISOString()
    setIsUpdatingPlan(true)
    try {
      await db.transact([
        tx.account_plans[user.id].update({
          user_id: user.id,
          plan: nextPlan,
          status: 'active',
          source: 'manual-dev-override',
          created_at:
            typeof existingAccountPlanRecord?.created_at === 'string'
              ? existingAccountPlanRecord.created_at
              : nowIso,
          updated_at: nowIso,
        }),
        tx.account_plan_events[instantId()].update({
          user_id: user.id,
          actor_user_id: user.id,
          from_plan: plan,
          to_plan: nextPlan,
          source: 'manual-dev-override',
          changed_at: nowIso,
          note: 'Updated from workspace developer controls',
        }),
      ])
    } finally {
      setIsUpdatingPlan(false)
    }
  }

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

      {showDevPlanControls ? (
        <SettingsSectionCard
          title="Developer Plan Controls"
          description="Internal testing override. This updates app entitlements only and does not touch billing provider data."
        >
          <SettingsRows>
            <SettingsRow
              label="Subscription plan"
              description="Switch between Free and Pro for this account."
            >
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isPro ? 'outline' : 'default'}
                  disabled={isUpdatingPlan || isPro || !user?.id}
                  onClick={() => void updatePlan('pro')}
                >
                  {isPro ? 'Pro Active' : isUpdatingPlan ? 'Updating...' : 'Set Pro'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isPro ? 'default' : 'outline'}
                  disabled={isUpdatingPlan || !isPro || !user?.id}
                  onClick={() => void updatePlan('free')}
                >
                  {!isPro ? 'Free Active' : isUpdatingPlan ? 'Updating...' : 'Set Free'}
                </Button>
              </div>
            </SettingsRow>
          </SettingsRows>
        </SettingsSectionCard>
      ) : null}
    </div>
  )
}
