'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchIcon, PlusIcon, FileText } from 'lucide-react'
import Link from 'next/link'
import ProjectCard from '@/components/projects/project-card'
import NewProjectCard from '@/components/projects/new-project-card'
import { useFrontend } from '@/contexts/FrontendContext'
import { getAllProjects } from '@/hooks/data'
import { ViewToggle } from '@/components/projects/view-toggle'
import ProjectListItem from '@/components/projects/project-list-item'

export default function ProjectsPage() {
  const { user, isLoading: userLoading } = useFrontend()
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date')
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false)
  
  const { isLoading, error, data } = getAllProjects(user?.id || '')

  // Loading Screen Timer, use this to adjust the loading screen UI 
  // For loading other resources we could elongate the loading screen time for users first entrance 
  // so we could load the first few documents in the background to allow for faster UX. 
  useEffect(() => {
    setMinLoadTimeElapsed(false)
    const timer = setTimeout(() => {
      setMinLoadTimeElapsed(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const projects = data?.projects || []
  const isPageLoading = !minLoadTimeElapsed || userLoading || !user || isLoading
  const filteredProjects = projects.filter((project) => 
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const allProjects = projects

  const sortedProjects = [...(searchTerm ? filteredProjects : allProjects)].sort((a, b) => {
    if (sortOrder === 'name') {
      return a.title.localeCompare(b.title)
    }
    return new Date(b.last_compiled || 0).getTime() - new Date(a.last_compiled || 0).getTime()
  })

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72 group">
          <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
            <SearchIcon className="h-3.5 w-3.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
          </div>
          <Input
            className="pl-8 h-8 bg-white/[0.03] border-white/[0.08] text-[12px]
             text-zinc-300 placeholder:text-zinc-600 focus:bg-white/[0.06]
              focus:border-white/20 focus:ring-0 rounded-[4px] transition-all"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search projects"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ViewToggle view={view} onViewChange={setView} />
          
          <div className="h-3 w-[1px] bg-white/10 mx-1 hidden md:block" />

          <Button 
            onClick={() => setSortOrder(sortOrder === 'date' ? 'name' : 'date')}
            variant="ghost"
            className="h-8 px-2.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 rounded-[4px] transition-all"
          >
            Sort: {sortOrder === 'date' ? 'Date' : 'Name'}
          </Button>
          
          <Button 
            className="h-8 px-3 text-white font-medium tracking-wide rounded-md transition-all shadow-sm ml-auto md:ml-0 text-[12px]" 
            style={{ backgroundColor: '#6D78E7' }}
            asChild
          >
            <Link href="/new">
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              NewProject
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isPageLoading ? (
        <div className="animate-in fade-in duration-500">
          {view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <ProjectCard key={i} loading={true} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.01]">
              {/* List Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-4 border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <div className="w-8"></div>
                <div>Name</div>
                <div className="hidden sm:block">Last Edited</div>
                <div className="w-7"></div>
              </div>
              {[...Array(8)].map((_, i) => (
                <ProjectListItem key={i} project={null} loading={true} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
               {/* New Project Card - Always visible in grid view */}
              <NewProjectCard />
              
              {sortedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              
              {/* Show message if no projects found during search */}
              {searchTerm && sortedProjects.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center py-12 text-zinc-500">
                    <p>No projects found matching &quot;{searchTerm}&quot;</p>
                 </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.01]">
              {/* List Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-2 px-4 border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <div className="w-8"></div>
                <div>Name</div>
                <div className="hidden sm:block">Last Edited</div>
                <div className="w-7"></div>
              </div>
              
              {/* In list view, we might want a "New Project" row or just rely on the top button. 
                  Usually list views rely on the header button, but grid views use the card. 
                  I'll leave it as just projects for list view for now unless requested. */}
                  
              {sortedProjects.map((project) => (
                <ProjectListItem key={project.id} project={project} />
              ))}
              
              {sortedProjects.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                   <p>{searchTerm ? `No projects found matching "${searchTerm}"` : "No projects yet"}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
