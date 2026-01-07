import { Skeleton } from '@/components/ui/skeleton'
import ProjectNav from '@/components/projects/project-nav'

export default function ProjectSkeleton() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col font-sans">
      <ProjectNav />
      <main className="flex-grow container mx-auto px-6 py-12 max-w-7xl">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative w-full md:w-96">
            <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg bg-white/5" />
        </div>

        <section className="mb-16">
          <Skeleton className="h-4 w-24 mb-6 bg-white/5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="aspect-[1.414/1] w-full bg-white/5 rounded-[4px] border border-white/5" />
                <div className="mt-3 space-y-2 px-0.5">
                  <Skeleton className="h-4 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-4 w-24 mb-6 bg-white/5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="aspect-[1.414/1] w-full bg-white/5 rounded-[4px] border border-white/5" />
                <div className="mt-3 space-y-2 px-0.5">
                  <Skeleton className="h-4 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
