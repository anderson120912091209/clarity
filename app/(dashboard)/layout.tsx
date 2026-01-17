import DashboardSidebar from '@/components/layout/dashboard-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-[#090909] text-white flex font-sans selection:bg-white/20">
      {/* Dashboard Sidebar */}
      <DashboardSidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-3 pt-16 lg:pt-3 overflow-hidden">
        {/* Content Container */}
        <div id="main-content-wrapper" className="flex-1 bg-[#101011] border-[0.5px] border-white/[0.12] 
        rounded-sm flex flex-col overflow-hidden">
          {/* Content Header */}
          <div id="content-wrapper-header" className="flex items-center justify-between px-4 
          py-4 border-white/[0.12] border-b-[0.5px] shrink-0">
            {/* Left side - Tabs (can be replaced with children or slot props in future) */}
            <div className="flex items-center gap-1">
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
  )
}
