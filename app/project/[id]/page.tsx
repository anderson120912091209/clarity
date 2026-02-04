'use client'

import { useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { AppLayout } from '@/components/layout/app-layout'
import EditorSidebar from '@/components/layout/editor-sidebar'
import SidebarToggle from '@/components/layout/sidebar-toggle'
import LatexRenderer from '@/components/latex-render/latex'
import CursorEditorContainer from '@/components/editor/cursor-editor-container'
import { ChatPanel, ChatNavContent } from '@/features/agent'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'
import { EditorNavContent } from '@/components/editor/cursor-editor-container'
import { EditorTabs } from '@/components/editor/editor-tabs'
import { PDFNavContent, useLatex } from '@/components/latex-render/latex'

export const maxDuration = 30

export default function Home() {
  const { id } = useParams<{ id: string }>()

  return (
    <ProjectProvider projectId={id}>
      <EditorLayout />
    </ProjectProvider>
  )
}

function EditorLayout() {
  const [isChatVisible, setIsChatVisible] = useState(false)
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
    handleDownload,
    logs
  } = useLatex()
  
  const [showLogs, setShowLogs] = useState(false)

  // Header content for the editor pane
  const editorHeader = (
    <div className="flex items-center w-full h-full gap-3 overflow-hidden">
        <div className="pl-2 flex items-center">
            <SidebarToggle />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden pl-2">
           <EditorTabs />
        </div>
    </div>
  )

  // Header content for the PDF pane
  const pdfHeader = (
    <div className="flex items-center justify-between w-full h-full overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-end gap-2 pr-1">
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
            onToggleLogs={() => setShowLogs(!showLogs)}
            showLogs={showLogs}
          />
        </div>
        {/* Chat controls when visible */}
        {isChatVisible && (
           <div className="flex items-center ml-2 border-l border-white/10 pl-2 shrink-0">
             <ChatNavContent onToggle={() => setIsChatVisible(false)} />
           </div>
         )}
    </div>
  )

  return (
    <AppLayout
      sidebar={<EditorSidebar />}
      header={null}
      showHeader={false}
    >
      {/* Content Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1" autoSaveId="project-editor-layout">
        <ResizablePanel defaultSize={50} minSize={25}>
          <CursorEditorContainer 
            onChatToggle={() => setIsChatVisible(!isChatVisible)}
            isChatVisible={isChatVisible}
            header={editorHeader}
          />
        </ResizablePanel>
        <ResizableHandle className="w-2 bg-transparent flex items-center justify-center group outline-none">
          <div className="h-8 w-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-all" />
        </ResizableHandle>
        <ResizablePanel defaultSize={50} minSize={20} collapsible={true}>
          <LatexRenderer 
            pdfUrl={pdfUrl}
            isLoading={isLoading}
            error={error}
            logs={logs}
            showLogs={showLogs}
            header={pdfHeader}
          />
        </ResizablePanel>
        {isChatVisible && (
          <>
            <ResizableHandle className="w-2 bg-transparent flex items-center justify-center group outline-none">
              <div className="h-8 w-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-all" />
            </ResizableHandle>
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
    </AppLayout>
  )
}
