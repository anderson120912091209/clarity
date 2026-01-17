import DashboardSidebar from '@/components/layout/dashboard-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-[#090909] text-white flex font-sans selection:bg-white/20">
      <DashboardSidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-2 pt-16 lg:pt-2 overflow-hidden">
        {/* Content Container */}
        <div className="flex-1 bg-[#101011] border-[0.5px] border-white/[0.1] 
         rounded-md p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
