'use client'

import { useEffect, useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { CheckIcon, FileText, LayoutTemplate, Command, FileCode2, FileType2, ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { templateContent, typstTemplateContent, latexTemplates, typstTemplates, Template } from '@/lib/constants/templates'
import TemplateCard from '@/components/projects/template-card'
import { useFrontend } from '@/contexts/FrontendContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { completeNavJourney, markNavMilestone } from '@/lib/perf/nav-trace'
import { cn } from '@/lib/utils'
import posthog from 'posthog-js'
import Link from 'next/link'

type DocType = 'latex' | 'typst' | 'all'

export default function NewDocument() {
  const { user } = useFrontend()
  const { settings } = useDashboardSettings()
  const router = useRouter()
  
  const [title, setTitle] = useState('Untitled Project')
  const [activeFilter, setActiveFilter] = useState<DocType>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string, type: 'latex' | 'typst' } | null>(null)
  const [titleError, setTitleError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    markNavMilestone('page_visible', { route: '/new' })
    completeNavJourney('new_doc_open')
  }, [])

  // Combine and interleave templates for the "All" view to make it look diverse
  const allTemplates = useMemo(() => {
     let latex = latexTemplates.map(t => ({ ...t, type: 'latex' as const }))
     let typst = typstTemplates.map(t => ({ ...t, type: 'typst' as const }))
     
     if (activeFilter === 'latex') return latex
     if (activeFilter === 'typst') return typst
     
     // Mix them up a bit for 'all'
     const mixed = []
     const maxLength = Math.max(latex.length, typst.length)
     for (let i = 0; i < maxLength; i++) {
        if (i < latex.length) mixed.push(latex[i])
        if (i < typst.length) mixed.push(typst[i])
     }
     return mixed
  }, [activeFilter])

  // Select the first template by default if none is selected
  useEffect(() => {
    if (!selectedTemplate && allTemplates.length > 0) {
      setSelectedTemplate({ id: allTemplates[0].id, type: allTemplates[0].type })
    }
  }, [allTemplates, selectedTemplate])

  // If filter changes and current selection is not visible, select first available
  useEffect(() => {
    if (selectedTemplate && activeFilter !== 'all' && selectedTemplate.type !== activeFilter) {
      if (allTemplates.length > 0) {
        setSelectedTemplate({ id: allTemplates[0].id, type: allTemplates[0].type })
      } else {
        setSelectedTemplate(null)
      }
    }
  }, [activeFilter, selectedTemplate, allTemplates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError('Title cannot be empty')
      return
    }
    const userId = user?.id
    if (!userId) {
      setTitleError('You must be signed in to create a project')
      return
    }
    if (!selectedTemplate) {
      setTitleError('Please select a template')
      return
    }

    setTitleError('')
    setIsCreating(true)

    try {
        const newProjectId = id()
        const mainFileId = id()
        const extension = selectedTemplate.type === 'latex' ? 'tex' : 'typ'
        const fileName = `main.${extension}`
        
        // Get content based on doc type
        let content = ''
        if (selectedTemplate.type === 'latex') {
          content = templateContent[selectedTemplate.id as keyof typeof templateContent] || templateContent['blank']
        } else {
          content = typstTemplateContent[selectedTemplate.id as keyof typeof typstTemplateContent] || typstTemplateContent['blank']
        }

        const fileStructure = [
            {
            id: mainFileId,
            name: fileName,
            type: 'file',
            parent_id: null,
            content: content,
            isExpanded: null,
            pathname: fileName,
            user_id: userId,
            },
        ]

        await db.transact([
            tx.projects[newProjectId].update({
                user_id: userId,
                title: title.trim(),
                project_content: content,
                template: selectedTemplate.id,
                last_compiled: new Date(),
                word_count: 0,
                page_count: 0,
                document_class: selectedTemplate.id,
                created_at: new Date(),
                type: selectedTemplate.type,
                activeFileId: mainFileId,
                pdfBackgroundTheme: settings.defaultPdfBackgroundTheme,
                isPdfCaretNavigationEnabled: settings.defaultPdfCaretNavigation,
            }),
            ...fileStructure.map((node) =>
                tx.files[node.id].update({
                user_id: userId,
                projectId: newProjectId,
                name: node.name,
                type: node.type,
                parent_id: node.parent_id,
                content: node.content || '',
                created_at: new Date(),
                isExpanded: node.isExpanded,
                isOpen: true,
                main_file: true,
                pathname: node.pathname,
                })
            ),
        ])

        // Track project creation event
        posthog.capture('project_created', {
            project_id: newProjectId,
            doc_type: selectedTemplate.type,
            template: selectedTemplate.id,
            source: 'marketplace',
        })

        router.push(`/project/${newProjectId}`)
    } catch (error) {
        console.error("Failed to create project", error)
        setIsCreating(false)
        setTitleError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0F11] text-white selection:bg-[#6D78E7]/30 selection:text-white relative overflow-hidden flex flex-col items-center">
      
      {/* Background Glowing Effects (Removed for minimalism) */}

      {/* Navigation Bar */}
      <div className="w-full max-w-7xl mx-auto px-6 py-6 absolute top-0 z-50 flex items-center justify-between pointer-events-none">
          <Link href="/dashboard" className="pointer-events-auto flex items-center gap-2 text-zinc-400 hover:text-white transition-colors duration-200 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
          </Link>
      </div>

      <div className="w-full max-w-7xl px-6 md:px-10 pt-32 pb-24 z-10 flex flex-col md:flex-row gap-12 relative animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
          
        {/* Left Sidebar Focus Area */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
                    Templates
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-[240px]">
                    Kickstart your next beautiful document with one of our tailored presets.
                </p>
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="text-xs font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-1">Engines</div>
                
                <button
                    onClick={() => setActiveFilter('all')}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                        activeFilter === 'all' ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    )}
                >
                    <LayoutTemplate className="w-4 h-4 opacity-70" />
                    All Templates
                </button>
                <button
                    onClick={() => setActiveFilter('latex')}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                        activeFilter === 'latex' ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    )}
                >
                    <FileCode2 className="w-4 h-4 opacity-70" />
                    LaTeX Engine
                </button>
                <button
                    onClick={() => setActiveFilter('typst')}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                        activeFilter === 'typst' ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    )}
                >
                    <FileType2 className="w-4 h-4 opacity-70" />
                    Typst Engine
                </button>
            </div>
            
            <div className="mt-4 p-4 rounded-xl bg-[#1A1C20] border border-white/5 shadow-inner">
                <Label htmlFor="title" className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Project Name</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value)
                        if (titleError) setTitleError('')
                    }}
                    placeholder="Untitled Project"
                    className={cn(
                        "bg-[#151619] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#6D78E7] transition-all h-9 text-sm w-full mb-3",
                        titleError ? "border-red-500/50 focus-visible:ring-red-500/50" : ""
                    )}
                />
                <Button
                    onClick={handleSubmit}
                    disabled={!title.trim() || isCreating || !selectedTemplate}
                    className="w-full h-9 bg-white hover:bg-zinc-200 text-black transition-colors gap-2 text-sm font-medium rounded-lg shadow-sm active:scale-95"
                >
                    {isCreating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            Create Project
                            <div className="flex items-center gap-0.5 bg-black/5 rounded px-1.5 py-0.5 ml-1">
                                <Command className="w-3 h-3 text-black/60" />
                                <span className="font-sans text-[10px] leading-none text-black/60">↵</span>
                            </div>
                        </>
                    )}
                </Button>
                {titleError && <p className="text-red-400 text-xs mt-2 font-medium">{titleError}</p>}
            </div>
        </div>

        {/* Right Side Grid */}
        <div className="flex-1">
            
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-white/90">
                  {activeFilter === 'all' ? 'Featured Collections' : activeFilter === 'latex' ? 'LaTeX Templates' : 'Typst Templates'}
              </h2>
              <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                  {allTemplates.length} Available
              </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {allTemplates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id && selectedTemplate?.type === template.type;
              
              return (
                  <TemplateCard 
                      key={`${template.type}-${template.id}`}
                      template={template}
                      isSelected={isSelected}
                      onClick={() => setSelectedTemplate({ id: template.id, type: template.type })}
                      showTypeBadge={true}
                      imageClassName="aspect-[1/1.414]"
                  />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

