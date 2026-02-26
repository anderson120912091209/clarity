'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Loader2, Command } from 'lucide-react'
import { getWorkspaceName, cn } from '@/lib/utils'
import posthog from 'posthog-js'

type DocFilter = 'all' | 'latex' | 'typst'

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
  const [activeFilter, setActiveFilter] = useState<DocFilter>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string, type: 'latex' | 'typst' }>({ id: 'blank', type: 'latex' })
  const [isCreating, setIsCreating] = useState(false)

  // Combine and interleave templates based on filter
  const filteredTemplates = useMemo(() => {
    const latex = latexTemplates.map(t => ({ ...t, type: 'latex' as const }))
    const typst = typstTemplates.map(t => ({ ...t, type: 'typst' as const }))

    if (activeFilter === 'latex') return latex
    if (activeFilter === 'typst') return typst

    // Interleave for "all"
    const mixed = []
    const maxLength = Math.max(latex.length, typst.length)
    for (let i = 0; i < maxLength; i++) {
      if (i < latex.length) mixed.push(latex[i])
      if (i < typst.length) mixed.push(typst[i])
    }
    return mixed
  }, [activeFilter])

  // When filter changes, reset selection if current isn't visible
  useEffect(() => {
    if (activeFilter !== 'all' && selectedTemplate.type !== activeFilter) {
      if (filteredTemplates.length > 0) {
        setSelectedTemplate({ id: filteredTemplates[0].id, type: filteredTemplates[0].type })
      }
    }
  }, [activeFilter, selectedTemplate.type, filteredTemplates])

  // Focus title input on open; reset state on close
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        document.getElementById('new-project-title')?.focus()
      }, 100)
    } else {
      setTitle('')
      setActiveFilter('all')
      setSelectedTemplate({ id: 'blank', type: 'latex' })
      setIsCreating(false)
    }
  }, [open])

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !user) return
    setIsCreating(true)

    try {
        const newProjectId = id()
        const mainFileId = id()
        const extension = selectedTemplate.type === 'latex' ? 'tex' : 'typ'
        const fileName = `main.${extension}`

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
            user_id: user.id,
          },
        ]

        // Upload placeholder images referenced by the template (e.g. fig1.png)
        const placeholderOps = await uploadTemplatePlaceholders(
          selectedTemplate.id,
          user.id,
          newProjectId,
        )

        await db.transact([
          tx.projects[newProjectId].update({
            user_id: user.id,
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

        posthog.capture('project_created', {
          project_id: newProjectId,
          doc_type: selectedTemplate.type,
          template: selectedTemplate.id,
          source: 'quick_dialog',
        })

        setOpen(false)
        router.push(`/project/${newProjectId}`)
    } catch (e) {
        console.error("Failed to create project", e)
        setIsCreating(false)
    }
  }, [router, selectedTemplate, setOpen, settings.defaultPdfBackgroundTheme, settings.defaultPdfCaretNavigation, title, user])

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
      <DialogContent className="sm:top-[46%] p-0 gap-0 bg-[#1C1D1F] border-[#2C2C2C] shadow-2xl overflow-hidden sm:max-w-[720px]">
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

        {/* Templates Section */}
        <div className="px-6 pb-4 pt-2 border-t border-white/5 bg-[#151619]/50">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-zinc-400 font-medium">Choose a template</span>
                <div className="flex items-center p-0.5 rounded-md border border-white/5">
                    {(['all', 'latex', 'typst'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-2.5 py-1 rounded-sm text-[11px] font-medium transition-all ${
                                activeFilter === filter
                                    ? 'bg-[#33353E] text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
                            }`}
                        >
                            {filter === 'all' ? 'All' : filter === 'latex' ? 'LaTeX' : 'Typst'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={`${template.type}-${template.id}`}
                        template={template}
                        isSelected={selectedTemplate.id === template.id && selectedTemplate.type === template.type}
                        onClick={() => setSelectedTemplate({ id: template.id, type: template.type })}
                        showTypeBadge={activeFilter === 'all'}
                        imageClassName="aspect-[1/1.414]"
                    />
                ))}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-white/5">
            <span className="text-xs text-zinc-500">
                {filteredTemplates.length} templates
            </span>

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
      </DialogContent>
    </Dialog>
  )
}
