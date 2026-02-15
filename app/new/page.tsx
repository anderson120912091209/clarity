'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { CheckIcon, FileText, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { templateContent, typstTemplateContent } from '@/lib/constants/templates'
import { useFrontend } from '@/contexts/FrontendContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { completeNavJourney, markNavMilestone } from '@/lib/perf/nav-trace'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import posthog from 'posthog-js'

type DocType = 'latex' | 'typst'

const latexTemplates = [
  { id: 'blank', title: 'Blank Project', description: 'Start from scratch', image: '/blank_preview.webp' },
  { id: 'article', title: 'Article', description: 'Standard academic article', image: '/article_preview.webp' },
  { id: 'report', title: 'Report', description: 'Longer documents with chapters', image: '/report_preview.webp' },
  { id: 'resume', title: 'Resume', description: 'Professional CV template', image: '/resume_preview.webp' },
  { id: 'letter', title: 'Cover Letter', description: 'Professional letter format', image: '/letter_preview.webp' },
  { id: 'proposal', title: 'Proposal', description: 'Project proposal template', image: '/proposal_preview.webp' },
  { id: 'presentation', title: 'Presentation', description: 'Beamer slide deck', image: '/presentation_preview.webp' },
  { id: 'assignment', title: 'Assignment', description: 'Homework & problem sets', image: '/assignment_preview.webp' },
  { id: 'ieee_conf', title: 'IEEE Conference', description: 'IEEE conference paper', image: '/ieee_preview.webp' },
]

const typstTemplates = [
  { id: 'blank', title: 'Blank Project', description: 'Start from scratch', image: '/blank_preview.webp' },
  { id: 'report', title: 'Report', description: 'Standard report template', image: '/report_preview.webp' },
  { id: 'resume', title: 'Resume', description: 'Modern CV template', image: '/resume_preview.webp' },
  { id: 'letter', title: 'Letter', description: 'Standard letter format', image: '/letter_preview.webp' },
]

export default function NewDocument() {
  const { user } = useFrontend()
  const { settings } = useDashboardSettings()
  const router = useRouter()
  const [title, setTitle] = useState('Untitled Project')
  const [docType, setDocType] = useState<DocType>('latex')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')
  const [titleError, setTitleError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    markNavMilestone('page_visible', { route: '/new' })
    completeNavJourney('new_doc_open')
  }, [])

  const currentTemplates = docType === 'latex' ? latexTemplates : typstTemplates

  // Reset template selection when switching doc type if current template invalid
  useEffect(() => {
    const templateExists = currentTemplates.find(t => t.id === selectedTemplate)
    if (!templateExists) {
      setSelectedTemplate('blank')
    }
  }, [docType, currentTemplates, selectedTemplate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError('Title cannot be empty')
      return
    }
    setTitleError('')
    setIsCreating(true)

    const newProjectId = id()
    const mainFileId = id()
    const extension = docType === 'latex' ? 'tex' : 'typ'
    const fileName = `main.${extension}`
    
    // Get content based on doc type
    let content = ''
    if (docType === 'latex') {
      content = templateContent[selectedTemplate as keyof typeof templateContent] || ''
    } else {
      content = typstTemplateContent[selectedTemplate as keyof typeof typstTemplateContent] || ''
    }

    const createFileStructure = () => {
      return [
        {
          id: mainFileId,
          name: fileName,
          type: 'file',
          parent_id: null,
          content: content,
          isExpanded: null,
          pathname: fileName,
          user_id: user.id,
        },
      ]
    }

    const fileStructure = createFileStructure()

    db.transact([
      tx.projects[newProjectId].update({
        user_id: user?.id,
        title: title.trim(),
        project_content: content, // Legacy field, check if still needed
        template: selectedTemplate,
        last_compiled: new Date(),
        word_count: 0,
        page_count: 0,
        document_class: selectedTemplate,
        created_at: new Date(),
        type: docType, // Verify if 'type' field exists in schema or if we need to add it
        activeFileId: mainFileId,
        pdfBackgroundTheme: settings.defaultPdfBackgroundTheme,
        isPdfCaretNavigationEnabled: settings.defaultPdfCaretNavigation,
      }),
      ...fileStructure.map((node) =>
        tx.files[node.id].update({
          user_id: user?.id,
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
      doc_type: docType,
      template: selectedTemplate,
      source: 'template_page',
    })

    router.push(`/project/${newProjectId}`)
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-4">
            <h1 className="text-4xl font-light tracking-tight text-white/90">
              Create New <span className="text-white font-medium">Document</span>
            </h1>
            <p className="text-zinc-400 text-lg font-light max-w-xl">
              Start your next project with one of our professionally crafted templates.
            </p>
          </div>
          
          <div className="w-full md:w-auto min-w-[300px] space-y-4 bg-[#111] p-4 rounded-xl border border-white/5 shadow-2xl">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs uppercase tracking-wider text-zinc-500 font-semibold pl-1">Project Title</Label>
                <div className="flex gap-2">
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (titleError) setTitleError('')
                    }}
                    placeholder="My Awesome Paper"
                    className={cn(
                      "bg-[#090909] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all",
                      titleError ? "border-red-500/50 focus-visible:ring-red-500/50" : ""
                    )}
                  />
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isCreating}
                    className="bg-white text-black hover:bg-zinc-200 transition-colors"
                  >
                    {isCreating ? 'Creating...' : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
                {titleError && <p className="text-red-400 text-xs pl-1">{titleError}</p>}
              </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <Tabs value={docType} onValueChange={(v) => setDocType(v as DocType)} className="w-auto">
              <TabsList className="bg-[#111] border border-white/5 p-1 h-11">
                <TabsTrigger 
                  value="latex" 
                  className="px-6 data-[state=active]:bg-[#222] data-[state=active]:text-white text-zinc-400"
                >
                  Running LaTeX
                </TabsTrigger>
                <TabsTrigger 
                  value="typst" 
                  className="px-6 data-[state=active]:bg-[#222] data-[state=active]:text-white text-zinc-400"
                >
                  Running Typst
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <span className="text-sm text-zinc-500 font-mono">
              {currentTemplates.length} templates available
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "group relative cursor-pointer rounded-xl overflow-hidden border transition-all duration-300",
                  selectedTemplate === template.id 
                    ? "border-white/40 ring-1 ring-white/10 bg-[#111]" 
                    : "border-white/5 bg-[#0e0e0e] hover:border-white/20 hover:bg-[#111]"
                )}
              >
                <div className="aspect-[3/4] w-full relative overflow-hidden bg-[#050505]">
                  {/* Since we might not have images for all, use a placeholder if needed, but assuming paths exist */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 z-10" />
                  
                  {/* Icon Placeholder for missing images */}
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-800">
                    <FileText className="w-16 h-16 opacity-20" />
                  </div>
                  
                  {/* Actual Image */}
                   <img
                    src={template.image}
                    alt={template.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0'
                    }}
                  />
                  
                  {selectedTemplate === template.id && (
                    <div className="absolute top-3 right-3 z-20 bg-white rounded-full p-1 shadow-lg animate-in zoom-in-50 duration-200">
                      <CheckIcon className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-1 relative z-20">
                  <h3 className={cn(
                    "font-medium text-sm transition-colors",
                    selectedTemplate === template.id ? "text-white" : "text-zinc-300 group-hover:text-white"
                  )}>
                    {template.title}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
