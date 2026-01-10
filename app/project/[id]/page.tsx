'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import CursorSideNav from '@/components/nav/cursor-side-nav'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/workbench/components/sidebar'
import LatexRenderer from '@/components/latex-render/latex'
import CursorEditorContainer from '@/components/editor/cursor-editor-container'
import { CursorChat } from '@/components/editor/cursor-chat'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams } from 'next/navigation'
import { useProject } from '@/contexts/ProjectContext'

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
            <div className="h-full w-full rounded-2xl bg-[#0c0c0e] border border-[#1f1f1f] shadow-2xl overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    <ResizablePanel defaultSize={50} minSize={25}>
                        <CursorEditorContainer 
                            onChatToggle={() => setIsChatVisible(!isChatVisible)}
                            isChatVisible={isChatVisible}
                        />
                    </ResizablePanel>
                    <ResizableHandle className="w-px bg-[#1f1f1f] hover:bg-[#2f2f2f] transition-colors" />
                    <ResizablePanel defaultSize={50} minSize={20} collapsible={true}>
                        <LatexRenderer />
                    </ResizablePanel>
                    {isChatVisible && (
                        <>
                        <ResizableHandle className="w-px bg-[#1f1f1f] hover:bg-[#2f2f2f] transition-colors" />
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
            </div>
        </div>
    </div>
  )
}

