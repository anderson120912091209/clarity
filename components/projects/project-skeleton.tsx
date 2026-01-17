import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Sidebar Skeleton */}
      <div className="w-48 bg-[#0A0A0A] border-r border-white/[0.08] hidden lg:flex flex-col">
        <div className="h-12 border-b border-white/[0.08] px-4 flex items-center">
          <Skeleton className="h-4 w-20 bg-white/[0.05]" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          <Skeleton className="h-8 w-full bg-white/[0.05] rounded-[4px]" />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-md p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Skeleton className="h-8 w-72 rounded-[4px] bg-white/[0.05]" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-[4px] bg-white/[0.05]" />
              <Skeleton className="h-8 w-32 rounded-[4px] bg-white/[0.05]" />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="aspect-[1.414/1] w-full bg-white/[0.05] rounded-[4px] border border-white/[0.06]" />
                <div className="mt-3 space-y-2 px-0.5">
                  <Skeleton className="h-3 w-3/4 bg-white/[0.05]" />
                  <Skeleton className="h-3 w-1/2 bg-white/[0.05]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
