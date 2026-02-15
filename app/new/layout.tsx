import { DashboardSettingsProvider } from '@/contexts/DashboardSettingsContext'

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardSettingsProvider>{children}</DashboardSettingsProvider>
}
