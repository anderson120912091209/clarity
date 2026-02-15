import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const SETTINGS_SELECT_TRIGGER_CLASS = 'h-7 w-[180px] text-[12px]'

interface SettingsPageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

interface SettingsSectionCardProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

interface SettingsRowProps {
  label: string
  description?: string
  children?: ReactNode
  className?: string
}

export function SettingsPageHeader({ title, description, children }: SettingsPageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-[18px] font-medium text-white">{title}</h1>
        {description && <p className="mt-1 text-[12px] text-zinc-500">{description}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
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
    <section className="mb-6">
      <div className="mb-2 px-1">
        <h2 className="text-[13px] font-medium text-white">{title}</h2>
        {description && <p className="text-[11px] text-zinc-500">{description}</p>}
      </div>
      <div className={cn('rounded-lg border border-white/[0.08] bg-[#17181A] p-3', className)}>
        {children}
      </div>
    </section>
  )
}

export function SettingsRows({ children }: { children: ReactNode }) {
  return <div className="space-y-0.5 divide-y divide-white/[0.04]">{children}</div>
}

export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <div className="space-y-0.5 pr-4">
        <div className="text-[12px] font-medium text-white">{label}</div>
        {description && <div className="text-[11px] text-zinc-500">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}
