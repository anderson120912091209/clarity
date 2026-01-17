import DashboardSidebar from '@/components/layout/dashboard-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex font-sans selection:bg-white/20">
      <DashboardSidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 pt-16 lg:pt-4 overflow-hidden">
        {/* Content Container */}
        <div className="flex-1 bg-[#0D0D0F] border border-white/[0.06]
         rounded-md p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
