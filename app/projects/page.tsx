'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchIcon, PlusIcon, FileText } from 'lucide-react'
import ProjectNav from '@/components/projects/project-nav'
import Link from 'next/link'
import ProjectSkeleton from '@/components/projects/project-skeleton'
import ProjectCard from '@/components/projects/project-card'
import { useFrontend } from '@/contexts/FrontendContext'
import { getAllProjects } from '@/hooks/data'

export default function Projects() {
  const { user, isLoading: userLoading } = useFrontend();
  const [searchTerm, setSearchTerm] = useState('');
  const { isLoading, error, data } = getAllProjects(user?.id || '');

  if (userLoading || !user) return <ProjectSkeleton />
  if (isLoading) return <ProjectSkeleton />

  const projects = data?.projects || []
  const filteredProjects = projects.filter((project) => project.title.toLowerCase().includes(searchTerm.toLowerCase()))
  const recentProjects = projects.slice(0, 3)
  const allProjects = projects

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white/20">
      <ProjectNav />
      {/* Ambient Background Removed for cleaner look */}

      <main className="flex-grow container mx-auto px-6 py-12 z-10 max-w-7xl">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative w-full md:w-96 group">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-600 group-focus-within:text-zinc-400 transition-colors h-4 w-4" />
            <Input
              className="pl-10 h-10 bg-white/[0.03] border-white/5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:bg-white/[0.05] focus:border-white/10 rounded-lg transition-all"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            className="h-10 px-6 bg-white text-black hover:bg-zinc-200 text-[13px] font-semibold tracking-wide rounded-lg transition-all shadow-lg shadow-white/5" 
            asChild
          >
            <Link href="/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {allProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-700">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <FileText className="h-8 w-8 text-zinc-600" />
            </div>
            <h2 className="text-lg font-medium text-zinc-200 mb-2">No projects yet</h2>
            <p className="text-sm text-zinc-500 max-w-sm mb-8">
              Create your first project to start writing beautiful LaTeX documents with AI assistance.
            </p>
            <Button 
              asChild
              variant="outline"
              className="bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all"
            >
              <Link href="/new">
                Create Project
              </Link>
            </Button>
          </div>
        ) : searchTerm ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-6 pl-1">Search Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section>
              <h2 className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-6 pl-1">Recent</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {recentProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} detailed={true} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-6 pl-1">All Projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {allProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
