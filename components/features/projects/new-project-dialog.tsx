'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useFrontend } from '@/contexts/FrontendContext'
import { useDashboardSettings } from '@/contexts/DashboardSettingsContext'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { templateContent, typstTemplateContent, latexTemplates, typstTemplates } from '@/lib/constants/templates'
import { uploadTemplatePlaceholders } from '@/lib/utils/upload-template-placeholders'
import TemplateCard from '@/components/projects/template-card'
import { FileText, Loader2, ArrowRight, LayoutTemplate, Command, CheckIcon } from 'lucide-react'
import { getWorkspaceName, cn } from '@/lib/utils'
import posthog from 'posthog-js'

interface NewProjectDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  tooltip?: React.ReactNode
}

export function NewProjectDialog({ children, open: controlledOpen, onOpenChange: setControlledOpen, tooltip }: NewProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = useCallback((newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen)
      }
      setControlledOpen?.(newOpen)
  }, [isControlled, setControlledOpen])

  const { user } = useFrontend()
  const { settings } = useDashboardSettings()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState<'latex' | 'typst'>('latex')
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const currentTemplates = docType === 'latex' ? latexTemplates : typstTemplates

  // Reset template selection when switching doc type if current template invalid
  useEffect(() => {
    const templateExists = currentTemplates.find(t => t.id === selectedTemplate)
    if (!templateExists) {
      setSelectedTemplate('blank')
    }
  }, [docType, currentTemplates, selectedTemplate])

  // Focus title input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        document.getElementById('new-project-title')?.focus()
      }, 100)
    } else {
      // Reset state on close
      setTitle('')
      setDocType('latex')
      setSelectedTemplate('blank')
      setIsExpanded(false)
      setIsCreating(false)
    }
  }, [open])

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !user) return
    setIsCreating(true)

    try {
        const newProjectId = id()
        const mainFileId = id()
        const extension = docType === 'latex' ? 'tex' : 'typ'
        const fileName = `main.${extension}`
        
        let content = ''
        if (docType === 'latex') {
          content = templateContent[selectedTemplate as keyof typeof templateContent] || templateContent['blank']
        } else {
          content = typstTemplateContent[selectedTemplate as keyof typeof typstTemplateContent] || typstTemplateContent['blank']
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

        // Upload placeholder images referenced by the template (e.g. fig1.png)
        const placeholderOps = await uploadTemplatePlaceholders(
          selectedTemplate,
          user.id,
          newProjectId,
        )

        await db.transact([
          tx.projects[newProjectId].update({
            user_id: user.id,
            title: title.trim(),
            project_content: content,
            template: selectedTemplate,
            last_compiled: new Date(),
            word_count: 0,
            page_count: 0,
            document_class: 'blank',
            created_at: new Date(),
            type: docType,
            activeFileId: mainFileId,
            pdfBackgroundTheme: settings.defaultPdfBackgroundTheme,
            isPdfCaretNavigationEnabled: settings.defaultPdfCaretNavigation,
          }),
          ...fileStructure.map((node) =>
            tx.files[node.id].update({
              user_id: user.id,
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
          ...placeholderOps,
        ])

        // Track quick project creation event
        posthog.capture('project_created', {
          project_id: newProjectId,
          doc_type: docType,
          template: selectedTemplate,
          source: 'quick_dialog',
        })

        setOpen(false)
        router.push(`/project/${newProjectId}`)
    } catch (e) {
        console.error("Failed to create project", e)
        setIsCreating(false)
    }
  }, [docType, router, selectedTemplate, setOpen, settings.defaultPdfBackgroundTheme, settings.defaultPdfCaretNavigation, title, user])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void handleCreate()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleCreate])

  const handleBrowseTemplates = () => {
    setIsExpanded(!isExpanded)
  }

  const handleRouteToMarketplace = () => {
    setOpen(false)
    router.push('/new')
  }

  const triggerContent = (
    <DialogTrigger asChild>
      {children}
    </DialogTrigger>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {triggerContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1E1F22] text-white
           border border-white/[0.08] text-[11px] px-2 py-1 flex items-center gap-1.5 align-center shadow-lg">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        triggerContent
      )}
      <DialogContent className={cn(
        "sm:top-[46%] p-0 gap-0 bg-[#1C1D1F] border-[#2C2C2C] shadow-2xl overflow-hidden transition-all duration-200 ease-out",
        isExpanded ? "sm:max-w-[800px]" : "sm:max-w-[600px]"
      )}>
        <DialogTitle className="sr-only">Create new project</DialogTitle>
        
        {/* Header / Title Input */}
        <div className="p-6 pb-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium tracking-wider">
                    <span className="bg-[#2C2C2C] px-1.5 py-0.5 rounded text-zinc-300 max-w-[150px] truncate">
                      {getWorkspaceName(user, settings.workspaceName)}
                    </span>
                    <span>›</span>
                    <span>Create Project</span>
                </div>
            </div>
            
            <Input
                id="new-project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project title..."
                className="text-xl font-medium bg-transparent
                 border-none p-0 h-auto placeholder:text-zinc-600 
                 focus-visible:ring-0 font-semibold text-white"
                autoComplete="off"
            />

        </div>

        {/* Expanded Templates Section */}
        {isExpanded && (
            <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-[#151619]/50 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                     <span className="text-sm text-zinc-400 font-medium">Select a starting template</span>
                     <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={handleRouteToMarketplace}
                         className="text-zinc-400 hover:text-white hover:bg-white/5 gap-2 h-7 text-xs font-medium px-2 rounded-md transition-colors"
                     >
                         Templates Marketplace <ArrowRight className="w-3.5 h-3.5" />
                     </Button>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                    {currentTemplates.map((template) => (
                        <TemplateCard 
                            key={template.id}
                            template={template}
                            isSelected={selectedTemplate === template.id}
                            onClick={() => setSelectedTemplate(template.id)}
                            imageClassName="aspect-[1/1.414]"
                        />
                    ))}
                </div>
            </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-white/5">
            <div className="flex items-center gap-3">
                <div className="flex shadow-y shadow-md items-center p-0.5 rounded-md
                 border border-white/5">
                    <button
                        onClick={() => setDocType('latex')}
                        className={`px-3 py-1 rounded-sm text-xs font-medium transition-all ${
                            docType === 'latex' 
                                ? 'bg-[#33353E] text-white shadow-sm' 
                                : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
                        }`}
                    >
                        LaTeX
                    </button>
                    <button
                        onClick={() => setDocType('typst')}
                        className={`px-3 py-1 rounded-sm text-xs font-medium transition-all ${
                            docType === 'typst' 
                                ? 'bg-[#33353E] text-white shadow-sm ' 
                                : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
                        }`}
                    >
                        Typst
                    </button>
                </div>

                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleBrowseTemplates}
                    className={cn(
                        "gap-2 h-7 text-xs font-medium px-2 rounded-md transition-colors",
                        isExpanded 
                            ? "bg-[#2C2C2C] text-white" 
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-[#151619]/60"
                    )}
                >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Browse Templates
                </Button>
            </div>

            <div className="flex items-center gap-3">
                 
                
                <Button
                    onClick={handleCreate}
                    disabled={!title.trim() || isCreating}
                    className="h-8 bg-[#5E6AD3] hover:bg-[#6D78E7]
                    text-white transition-all gap-2 text-xs font-medium px-3 pr-1.5
                     rounded-[6px] shadow-md shadow-y border border-white/20 hover:shadow-md active:scale-95"
                >
                    {isCreating ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <span>Create Project</span>
                            <div className="flex items-center gap-0.5 bg-white/10 rounded px-1.5 py-0.5 ml-1 border border-white/5">
                                <Command className="w-2.5 h-2.5 text-white/90" />
                                <span className="font-sans text-[10px] font-medium text-white/90">↵</span>
                            </div>
                        </>
                    )}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
