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
  const [isChatVisible, setIsChatVisible] = useState(true)
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

  // Header content for the workspace navigation
  const headerContent = (
    <>
      {/* Left side - Toggle & Editor controls */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <SidebarToggle />
        <EditorNavContent 
          currentlyOpen={currentlyOpen}
          onChatToggle={() => setIsChatVisible(!isChatVisible)}
          isChatVisible={isChatVisible}
        />
      </div>
      

      
      {/* PDF controls */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
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
      </div>
      
      {/* Chat controls when visible */}
      {isChatVisible && (
        <>

          <div className="flex items-center">
            <ChatNavContent onToggle={() => setIsChatVisible(false)} />
          </div>
        </>
      )}
    </>
  )

  return (
    <AppLayout
      sidebar={<EditorSidebar />}
      header={headerContent}
      showHeader={true}
    >
      {/* Content Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={25}>
          <CursorEditorContainer 
            onChatToggle={() => setIsChatVisible(!isChatVisible)}
            isChatVisible={isChatVisible}
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
