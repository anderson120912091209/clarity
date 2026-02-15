import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const SETTINGS_SELECT_TRIGGER_CLASS = 'h-8 w-[190px] text-[12px]'

interface SettingsPageHeaderProps {
  title: string
  description?: string
}

interface SettingsSectionCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsPageHeader({ title, description }: SettingsPageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-[20px] font-medium text-white">{title}</h1>
      {description && <p className="mt-1 text-[12px] text-zinc-500">{description}</p>}
    </header>
  )
}

export function SettingsSectionCard({
  title,
  description,
  children,
  className,
}: SettingsSectionCardProps) {
  return (
    <section className="mb-8">
      <div className="mb-3 px-1">
        <h2 className="text-[14px] font-medium text-white">{title}</h2>
        {description && <p className="text-[12px] text-zinc-500">{description}</p>}
      </div>
      <div className={cn('rounded-lg border border-white/[0.08] bg-white/[0.02] p-4', className)}>
        {children}
      </div>
    </section>
  )
}

export function SettingsRows({ children }: { children: ReactNode }) {
  return <div className="space-y-1 divide-y divide-white/[0.04]">{children}</div>
}

export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
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
