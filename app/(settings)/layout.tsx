import { SettingsSidebar } from '@/components/layout/settings-sidebar'
import { DashboardSettingsProvider } from '@/contexts/DashboardSettingsContext'
import { SidebarProvider } from '@/contexts/SidebarContext'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardSettingsProvider>
        <div className="h-screen bg-[#090909] text-white flex font-sans selection:bg-white/20">
            {/* Settings Sidebar */}
            <SettingsSidebar />
            
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col p-3 overflow-hidden transition-all duration-300 ease-out">
                {/* Content Container */}
                <div
                  id="settings-content-wrapper"
                  className="flex-1 bg-[#101011] border-[0.5px] border-white/[0.12] rounded-md flex flex-col overflow-hidden"
                >
                    <div id="settings-scroll-container" className="flex-1 overflow-auto scroll-smooth">
                        <div className="mx-auto max-w-4xl px-8 py-10">
                            {children}
                        </div>
                    </div>
                </div>
            </main>
        </div>
      </DashboardSettingsProvider>
    </SidebarProvider>
  )
}
