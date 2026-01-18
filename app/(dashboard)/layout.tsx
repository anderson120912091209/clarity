import DashboardSidebar from '@/components/layout/dashboard-sidebar'
import { SidebarProvider } from '@/contexts/SidebarContext'
import SidebarToggle from '@/components/layout/sidebar-toggle'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="h-screen bg-[#090909] text-white flex font-sans selection:bg-white/20">
        {/* Dashboard Sidebar */}
        <DashboardSidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col p-3 pt-16 lg:pt-3 overflow-hidden transition-all duration-300 ease-out">
          {/* Content Container */}
          <div id="main-content-wrapper" className="flex-1 bg-[#101011] border-[0.5px] border-white/[0.12] 
          rounded-md flex flex-col overflow-hidden">
            {/* Content Header */}
            <div id="content-wrapper-header" className="flex items-center justify-between px-4 
            py-2.5 border-white/[0.12] border-b-[0.5px] shrink-0">
              {/* Left side - Toggle & Tabs */}
              <div className="flex items-center gap-3">
                <SidebarToggle />
                {/* This space is for tabs that will switch per page */}
              </div>
              
              {/* Right side - Action buttons (can be replaced with children or slot props in future) */}
              <div className="flex items-center gap-1">
                {/* This space is for action buttons per page */}
              </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
