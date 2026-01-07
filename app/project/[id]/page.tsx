'use client'
import { useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import CursorSideNav from '@/components/nav/cursor-side-nav'
import LatexRenderer from '@/components/latex-render/latex'
import CursorEditorContainer from '@/components/editor/cursor-editor-container'
import { CursorChat } from '@/components/editor/cursor-chat'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'

export const maxDuration = 30

function EditorLayout() {
  const [isChatVisible, setIsChatVisible] = useState(true)
  const { currentlyOpen } = useProject()
  const fileContent = currentlyOpen?.content || ''

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={16} minSize={12} maxSize={30} collapsible={true}>
        <CursorSideNav />
      </ResizablePanel>
      <ResizableHandle className="w-px bg-border/30 hover:bg-border/50 transition-colors" />
      <ResizablePanel defaultSize={isChatVisible ? 38 : 50} minSize={25}>
        <CursorEditorContainer 
          onChatToggle={() => setIsChatVisible(!isChatVisible)}
          isChatVisible={isChatVisible}
        />
      </ResizablePanel>
      <ResizableHandle className="w-px bg-border/30 hover:bg-border/50 transition-colors" />
      <ResizablePanel defaultSize={isChatVisible ? 30 : 50} minSize={20} collapsible={true}>
        <LatexRenderer />
      </ResizablePanel>
      {isChatVisible && (
        <>
          <ResizableHandle className="w-px bg-border/30 hover:bg-border/50 transition-colors" />
          <ResizablePanel defaultSize={32} minSize={20} maxSize={45} collapsible={true}>
            <CursorChat 
              fileContent={fileContent}
              isVisible={isChatVisible}
              onToggle={() => setIsChatVisible(false)}
            />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}

export default function Home() {
  const { id } = useParams<{ id: string }>()

  return (
    <ProjectProvider projectId={id}>
      <main className="h-screen w-screen overflow-hidden bg-background">
        <EditorLayout />
      </main>
    </ProjectProvider>
  )
}
