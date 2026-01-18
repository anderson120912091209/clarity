import { SidebarProvider } from '@/contexts/SidebarContext'

export default function ProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  )
}
