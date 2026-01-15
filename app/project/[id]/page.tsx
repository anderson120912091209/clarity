'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import CursorSideNav from '@/components/nav/cursor-side-nav'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/workbench/components/sidebar'
import LatexRenderer from '@/components/latex-render/latex'
import CursorEditorContainer from '@/components/editor/cursor-editor-container'
import { ChatPanel, ChatNavContent } from '@/features/ai-chat'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { WorkspaceNav } from '@/workbench/components/top-nav/workspace-nav'
import { EditorNavContent } from '@/components/editor/cursor-editor-container'
import { PDFNavContent, useLatex } from '@/components/latex-render/latex'

export const maxDuration = 30

export default function Home() {
  const { id } = useParams<{ id: string }>()

  return (
    <ProjectProvider projectId={id}>
      <main className="h-screen w-screen overflow-hidden bg-[#09090b]">
        <div className="h-full flex overflow-hidden">
             <EditorLayout />
        </div>
      </main>
    </ProjectProvider>
  )
}

function EditorLayout() {
  const [isChatVisible, setIsChatVisible] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { currentlyOpen } = useProject()
  const fileContent = currentlyOpen?.content || ''

  const { 
    pdfUrl, 
    isLoading, 
    error, 
    compile, 
    scale, 
    autoFetch, 
    handleZoomIn, 
    handleZoomOut, 
    handleResetZoom, 
    handleDownload 
  } = useLatex()

  return (
    <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with Framer Motion smooth animation */}
        <motion.div 
            initial={false}
            animate={{ 
                width: isSidebarCollapsed ? 48 : 180 // 48px = w-12, 165`px = w-40
            }}
            transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
            }}
            className="h-full shrink-0"
        >
            <Sidebar 
                isCollapsed={isSidebarCollapsed} 
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="w-full h-full border-none"
            />
        </motion.div>

        {/* Main Container with rounded edges */}
        <div className="flex-1 h-full p-2.5 pl-2 overflow-hidden">
            <div className="h-full w-full rounded-2xl bg-[#0c0c0e] border border-[#1f1f1f] shadow-2xl overflow-hidden flex flex-col">
                {/* Unified Workspace Navigation */}
                <WorkspaceNav 
                    editorSection={
                        <EditorNavContent 
                            currentlyOpen={currentlyOpen}
                            onChatToggle={() => setIsChatVisible(!isChatVisible)}
                            isChatVisible={isChatVisible}
                        />
                    }
                    pdfSection={
                        <PDFNavContent 
                            isLoading={isLoading}
                            autoFetch={autoFetch}
                            scale={scale}
                            projectId={currentlyOpen?.projectId || ''}
                            onCompile={compile}
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onResetZoom={handleResetZoom}
                            onDownload={handleDownload}
                        />
                    }
                    chatSection={
                        <ChatNavContent onToggle={() => setIsChatVisible(false)} />
                    }
                    isChatVisible={isChatVisible}
                />
                
                {/* Content Panels */}
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={50} minSize={25}>
                        <CursorEditorContainer 
                            onChatToggle={() => setIsChatVisible(!isChatVisible)}
                            isChatVisible={isChatVisible}
                        />
                    </ResizablePanel>
                    <ResizableHandle className="w-px bg-[#1f1f1f] hover:bg-[#2f2f2f] transition-colors" />
                    <ResizablePanel defaultSize={50} minSize={20} collapsible={true}>
                        <LatexRenderer 
                            pdfUrl={pdfUrl}
                            isLoading={isLoading}
                            error={error}
                        />
                    </ResizablePanel>
                    {isChatVisible && (
                        <>
                        <ResizableHandle className="w-px bg-[#1f1f1f] hover:bg-[#2f2f2f] transition-colors" />
                        <ResizablePanel defaultSize={20} minSize={20} maxSize={45} collapsible={true}>
                            <ChatPanel 
                            fileContent={fileContent}
                            isVisible={isChatVisible}
                            onToggle={() => setIsChatVisible(false)}
                            />
                        </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            </div>
        </div>
    </div>
  )
}

