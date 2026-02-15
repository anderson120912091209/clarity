import { SidebarProvider } from '@/contexts/SidebarContext'
import { DashboardSettingsProvider } from '@/contexts/DashboardSettingsContext'

export default function ProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <DashboardSettingsProvider>{children}</DashboardSettingsProvider>
    </SidebarProvider>
  )
}
