import React, { useCallback, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { useEditorSetup } from './hooks/useEditorSetup'
import { useAIAssist } from '@/features/agent'
import { useEditorTheme } from './hooks/useEditorTheme'
import { editorDefaultOptions } from './constants/editorDefaults'
import { Loader2 } from 'lucide-react'
import { historyService } from '@/services/agent/browser/history/historyService'
import { setupShikiMonaco } from './utils/shiki-monaco'
import { useTheme } from 'next-themes'
import latex from 'monaco-latex'
import { DEFAULT_EDITOR_SYNTAX_THEME, type EditorSyntaxTheme } from './types'

const LATEX_LANGUAGE_ID = 'latex'

interface CodeEditorProps {
  onChange: (value: string) => void
  value: string
  setIsStreaming: (isStreaming: boolean) => void
  onCursorClick?: (payload: { lineNumber: number; column: number; lineCount: number }) => void
  syntaxTheme?: EditorSyntaxTheme
}

const EditorLoading = () => (
  <div className="flex items-center justify-center h-full w-full bg-zinc-950">
    <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
  </div>
)

export const CodeEditor = ({
  onChange,
  value,
  setIsStreaming,
  onCursorClick,
  syntaxTheme = DEFAULT_EDITOR_SYNTAX_THEME,
}: CodeEditorProps) => {
  const { editorRef, handleEditorDidMount } = useEditorSetup(onChange, value)
  const { handleAIAssist } = useAIAssist(onChange)
  const { setTheme } = useEditorTheme()
  const { theme, systemTheme } = useTheme()

  const monacoRef = useRef<any>(null)
  const originalSetThemeRef = useRef<((theme: string) => void) | null>(null)
  const defaultTokensDisposableRef = useRef<{ dispose: () => void } | null>(null)
  const applySeqRef = useRef(0)
  const isMac =
    typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh')
  const isDark =
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark')

  const ensureLatexLanguage = useCallback((monaco: any) => {
    try {
      const alreadyRegistered = monaco.languages
        .getLanguages?.()
        ?.some((lang: any) => lang.id === LATEX_LANGUAGE_ID)
      if (!alreadyRegistered) {
        monaco.languages.register({ id: LATEX_LANGUAGE_ID })
      }
    } catch {
      monaco.languages.register({ id: LATEX_LANGUAGE_ID })
    }
  }, [])

  const applyDefaultSyntaxTheme = useCallback(
    (monaco: any, model: any) => {
      ensureLatexLanguage(monaco)
      if (originalSetThemeRef.current && monaco.editor.setTheme !== originalSetThemeRef.current) {
        monaco.editor.setTheme = originalSetThemeRef.current
      }
      defaultTokensDisposableRef.current?.dispose()
      defaultTokensDisposableRef.current = monaco.languages.setMonarchTokensProvider(
        LATEX_LANGUAGE_ID,
        latex as any
      )
      setTheme(monaco)
      monaco.editor.setModelLanguage(model, LATEX_LANGUAGE_ID)
      model.forceTokenization?.(model.getLineCount())
    },
    [ensureLatexLanguage, setTheme]
  )

  const applyShikiSyntaxTheme = useCallback(
    (monaco: any, model: any) => {
      monaco.editor.setTheme(isDark ? 'vitesse-dark' : 'vitesse-light')
      monaco.editor.setModelLanguage(model, LATEX_LANGUAGE_ID)
      model.forceTokenization?.(model.getLineCount())
    },
    [isDark]
  )

  const applySyntaxTheme = useCallback(async () => {
    const seq = ++applySeqRef.current
    const monaco = monacoRef.current
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!monaco || !editor || !model) return

    if (syntaxTheme === 'shiki') {
      try {
        ensureLatexLanguage(monaco)
        defaultTokensDisposableRef.current?.dispose()
        defaultTokensDisposableRef.current = null
        await setupShikiMonaco(monaco)
        if (applySeqRef.current !== seq) return
        applyShikiSyntaxTheme(monaco, model)
      } catch (err) {
        console.warn('[Shiki] Theme setup failed; falling back to default:', err)
        if (applySeqRef.current !== seq) return
        applyDefaultSyntaxTheme(monaco, model)
      }
      return
    }

    applyDefaultSyntaxTheme(monaco, model)
  }, [applyDefaultSyntaxTheme, applyShikiSyntaxTheme, ensureLatexLanguage, syntaxTheme])

  useEffect(() => {
    applySyntaxTheme()
  }, [applySyntaxTheme])

  return (
    <Editor
      language={LATEX_LANGUAGE_ID}
      height="100%"
      width="100%"
      value={value}
      theme={
        syntaxTheme === 'shiki'
          ? isDark
            ? 'vitesse-dark'
            : 'vitesse-light'
          : isDark
            ? 'vs-dark'
            : 'vs'
      }
      className="bg-transparent" // Let Monaco handle bg
      onMount={(editor, monaco) => {
        monacoRef.current = monaco
        if (!originalSetThemeRef.current) {
          originalSetThemeRef.current = monaco.editor.setTheme
        }
        handleEditorDidMount(editor, monaco)
        handleAIAssist(editor, monaco, setIsStreaming, onChange)

        // Inline chat hint on focused empty lines
        const hintNode = document.createElement('div')
        hintNode.className = 'inline-chat-hint'
        hintNode.textContent = isMac
          ? '⌘+L to chat, ⌘+K to generate'
          : 'Ctrl+L to chat, Ctrl+K to generate'

        let hintPosition: { lineNumber: number; column: number } | null = null
        const hintWidget = {
          getId: () => 'inline-chat-hint-widget',
          getDomNode: () => hintNode,
          getPosition: () =>
            hintPosition
              ? {
                  position: hintPosition,
                  preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
                }
              : null,
        }

        editor.addContentWidget(hintWidget as any)

        const updateInlineChatHint = () => {
          const model = editor.getModel()
          const selection = editor.getSelection()
          if (!model || !selection || !editor.hasTextFocus()) {
            hintPosition = null
            editor.layoutContentWidget(hintWidget as any)
            return
          }

          if (!selection.isEmpty()) {
            hintPosition = null
            editor.layoutContentWidget(hintWidget as any)
            return
          }

          const lineNumber = selection.positionLineNumber
          const column = selection.positionColumn
          const lineContent = model.getLineContent(lineNumber)
          const isEmptyLine = lineContent.trim().length === 0
          hintPosition = isEmptyLine ? { lineNumber, column } : null
          editor.layoutContentWidget(hintWidget as any)
        }

        // Some Monaco tokenizers/themes can "snap back" after (re)focus; re-apply for stability.
        editor.onDidFocusEditorWidget(() => {
          applySyntaxTheme()
          updateInlineChatHint()
        })
        editor.onDidBlurEditorWidget(() => {
          updateInlineChatHint()
        })

        if (onCursorClick) {
          editor.onMouseDown((e) => {
            const position = e.target.position
            const model = editor.getModel()
            if (!position || !model) return
            onCursorClick({
              lineNumber: position.lineNumber,
              column: position.column,
              lineCount: model.getLineCount(),
            })
          })
        }

        editor.onDidChangeCursorPosition(() => {
          updateInlineChatHint()
        })
        editor.onDidChangeModelContent(() => {
          updateInlineChatHint()
        })

        applySyntaxTheme()
        updateInlineChatHint()
        
        // Register undo/redo interception
        console.log('[Editor] Registering HistoryService', historyService)
        if (historyService && typeof historyService.register === 'function') {
           historyService.register(editor)
        } else {
           console.error('[Editor] historyService.register is not a function', historyService)
        }
        
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
         cursorSmoothCaretAnimation: 'off',
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
