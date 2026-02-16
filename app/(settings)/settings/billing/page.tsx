'use client'

import {
  SETTINGS_SELECT_TRIGGER_CLASS,
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSectionCard,
} from '@/components/settings/settings-page-ui'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { UpgradeModal } from '@/components/upgrade-modal'
import { useState } from 'react'

export default function BillingSettingsPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Billing & Plan"
        description="Manage your subscription and billing information."
      />

      <SettingsSectionCard
        title="Current Plan"
        description="You are currently on the Free plan."
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Free Plan</h3>
              <p className="text-sm text-zinc-400">Basic features for individual use</p>
            </div>
            <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-full">
              Active
            </span>
          </div>

          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2 text-zinc-300 text-sm">
              <Check className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span>Editor & LaTeX/Typst</span>
            </li>
            <li className="flex items-start gap-2 text-zinc-300 text-sm">
              <Check className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span>Cloud preview</span>
            </li>
            <li className="flex items-start gap-2 text-zinc-300 text-sm">
              <Check className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span>One project</span>
            </li>
          </ul>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Upgrade to Supporter"
        description="Get unlimited projects, faster builds, and support the development."
      >
        <div className="px-4 py-3">
          <div className="relative rounded-lg bg-[#0c0c0e] p-4 overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6D78E7]/10 via-transparent to-transparent" />
            
            <div className="relative z-10">
              <div className="flex items-baseline gap-1 mb-2">
                <h3 className="text-2xl font-semibold text-white">$9</h3>
                <span className="text-sm text-zinc-300">/ month</span>
              </div>

              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-zinc-300 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>Unlimited projects</span>
                </li>
                <li className="flex items-start gap-2 text-zinc-300 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>Team controls</span>
                </li>
                <li className="flex items-start gap-2 text-zinc-300 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-[#6D78E7] shrink-0" />
                  <span>Faster builds</span>
                </li>
              </ul>

              <UpgradeModal
                open={showUpgradeModal}
                onOpenChange={setShowUpgradeModal}
                trigger={
                  <Button className="w-full bg-white text-black hover:bg-zinc-200">
                    Upgrade Now
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </SettingsSectionCard>
    </div>
  )
}
