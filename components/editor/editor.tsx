import React, { useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useEditorSetup } from './hooks/useEditorSetup'
import { useAIAssist } from '@/features/ai-chat'
import { useEditorTheme } from './hooks/useEditorTheme'
import { editorDefaultOptions } from './constants/editorDefaults'
import { Loader2 } from 'lucide-react'

interface CodeEditorProps {
  onChange: (value: string) => void
  value: string
  setIsStreaming: (isStreaming: boolean) => void
}

const EditorLoading = () => (
  <div className="flex items-center justify-center h-full w-full bg-zinc-950">
    <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
  </div>
)

export const CodeEditor = ({ onChange, value, setIsStreaming }: CodeEditorProps) => {
  const { editorRef, handleEditorDidMount } = useEditorSetup(onChange, value)
  const { handleAIAssist } = useAIAssist()
  const { setTheme } = useEditorTheme()

  return (
    <Editor
      theme="cursor-dark" // Try to use our custom theme name
      language="latex"
      height="100%"
      width="100%"
      value={value}
      className="bg-transparent" // Let Monaco handle bg
      onMount={(editor, monaco) => {
        setTheme(monaco) // Initialize custom theme
        handleEditorDidMount(editor, monaco)
        handleAIAssist(editor, monaco, setIsStreaming)
        
        // Ensure layout updates if container changes (e.g. sidebar toggle)
        const resizeObserver = new ResizeObserver(() => {
           editor.layout();
        });
        const container = editor.getDomNode()?.parentElement;
        if (container) resizeObserver.observe(container);
      }}
      options={{
         ...editorDefaultOptions,
         fontFamily: 'SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', // Premium cursor font stack
         fontSize: 13,
         lineHeight: 20,
         cursorBlinking: 'smooth',
         cursorSmoothCaretAnimation: 'on',
         renderLineHighlight: 'line', // cleaner than 'all'
         guides: {
            indentation: true,
            bracketPairs: true
         },
         minimap: {
            enabled: false // Minimalist
         }
      }}
      loading={<EditorLoading />}
    />
  )
}

export default CodeEditor
