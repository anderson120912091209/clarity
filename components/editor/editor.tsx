import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { useEditorSetup } from './hooks/useEditorSetup'
import { useAIAssist } from '@/features/agent'
import { useEditorTheme } from './hooks/useEditorTheme'
import { editorDefaultOptions } from './constants/editorDefaults'
import { Loader2 } from 'lucide-react'
import { historyService } from '@/services/agent/browser/history/historyService'
import { setupShikiMonaco } from './utils/shiki-monaco'
import { useTheme } from 'next-themes'
import type { editor as MonacoEditorNamespace, IDisposable } from 'monaco-editor'
import {
  applyMonarchTokensProvider,
  resolveEditorLanguageId,
} from './syntax/languages/registry'
import type { EditorLanguageId } from './syntax/languages/registry'
import { resolveMonacoThemeForSyntaxTheme } from './syntax/themes/catalog'
import { DEFAULT_EDITOR_SYNTAX_THEME, type EditorSyntaxTheme } from './types'

type MonacoInstance = typeof import('monaco-editor')
type MonacoModel = MonacoEditorNamespace.ITextModel
type TokenizableMonacoModel = MonacoModel & {
  forceTokenization?: (lineNumber: number) => void
}

interface CodeEditorProps {
  onChange: (value: string) => void
  value: string
  setIsStreaming: (isStreaming: boolean) => void
  onCursorClick?: (payload: { lineNumber: number; column: number; lineCount: number }) => void
  syntaxTheme?: EditorSyntaxTheme
  fileName?: string
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
  fileName,
}: CodeEditorProps) => {
  const activeLanguage = useMemo<EditorLanguageId>(
    () => resolveEditorLanguageId(fileName),
    [fileName]
  )
  const { editorRef, handleEditorDidMount } = useEditorSetup(
    onChange,
    value,
    activeLanguage
  )
  const { handleAIAssist } = useAIAssist(onChange)
  const { setTheme } = useEditorTheme()
  const { theme, systemTheme } = useTheme()

  const monacoRef = useRef<MonacoInstance | null>(null)
  const originalSetThemeRef = useRef<((theme: string) => void) | null>(null)
  const defaultTokensDisposableRef = useRef<IDisposable | null>(null)
  const onCursorClickRef = useRef(onCursorClick)
  const applySeqRef = useRef(0)
  const isMac =
    typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh')
  const isDark =
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark')

  const applyDefaultSyntaxTheme = useCallback(
    (monacoInstance: MonacoInstance, model: MonacoModel) => {
      if (
        originalSetThemeRef.current &&
        monacoInstance.editor.setTheme !== originalSetThemeRef.current
      ) {
        monacoInstance.editor.setTheme = originalSetThemeRef.current
      }
      defaultTokensDisposableRef.current?.dispose()
      defaultTokensDisposableRef.current = applyMonarchTokensProvider(
        monacoInstance,
        activeLanguage
      )
      setTheme(monacoInstance)
      monacoInstance.editor.setModelLanguage(model, activeLanguage)
      ;(model as TokenizableMonacoModel).forceTokenization?.(model.getLineCount())
    },
    [activeLanguage, setTheme]
  )

  const applyShikiSyntaxTheme = useCallback(
    (monacoInstance: MonacoInstance, model: MonacoModel) => {
      monacoInstance.editor.setTheme(
        resolveMonacoThemeForSyntaxTheme('shiki', isDark)
      )
      monacoInstance.editor.setModelLanguage(model, activeLanguage)
      ;(model as TokenizableMonacoModel).forceTokenization?.(model.getLineCount())
    },
    [activeLanguage, isDark]
  )

  const applySyntaxTheme = useCallback(async () => {
    const seq = ++applySeqRef.current
    const monacoInstance = monacoRef.current
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!monacoInstance || !editor || !model) return

    if (syntaxTheme === 'shiki') {
      try {
        defaultTokensDisposableRef.current?.dispose()
        defaultTokensDisposableRef.current = null
        await setupShikiMonaco(monacoInstance)
        if (applySeqRef.current !== seq) return
        applyShikiSyntaxTheme(monacoInstance, model)
      } catch (err) {
        console.warn('[Shiki] Theme setup failed; falling back to default:', err)
        if (applySeqRef.current !== seq) return
        applyDefaultSyntaxTheme(monacoInstance, model)
      }
      return
    }

    applyDefaultSyntaxTheme(monacoInstance, model)
  }, [applyDefaultSyntaxTheme, applyShikiSyntaxTheme, editorRef, syntaxTheme])

  useEffect(() => {
    applySyntaxTheme()
  }, [applySyntaxTheme])

  useEffect(
    () => () => {
      defaultTokensDisposableRef.current?.dispose()
      defaultTokensDisposableRef.current = null
    },
    []
  )

  useEffect(() => {
    onCursorClickRef.current = onCursorClick
  }, [onCursorClick])

  const editorTheme = resolveMonacoThemeForSyntaxTheme(syntaxTheme, isDark)

  return (
    <Editor
      language={activeLanguage}
      height="100%"
      width="100%"
      value={value}
      theme={editorTheme}
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
        const hintWidget: MonacoEditorNamespace.IContentWidget = {
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

        editor.addContentWidget(hintWidget)

        const updateInlineChatHint = () => {
          const model = editor.getModel()
          const selection = editor.getSelection()
          if (!model || !selection || !editor.hasTextFocus()) {
            hintPosition = null
            editor.layoutContentWidget(hintWidget)
            return
          }

          if (!selection.isEmpty()) {
            hintPosition = null
            editor.layoutContentWidget(hintWidget)
            return
          }

          const lineNumber = selection.positionLineNumber
          const column = selection.positionColumn
          const lineContent = model.getLineContent(lineNumber)
          const isEmptyLine = lineContent.trim().length === 0
          hintPosition = isEmptyLine ? { lineNumber, column } : null
          editor.layoutContentWidget(hintWidget)
        }

        // Some Monaco tokenizers/themes can "snap back" after (re)focus; re-apply for stability.
        editor.onDidFocusEditorWidget(() => {
          applySyntaxTheme()
          updateInlineChatHint()
        })
        editor.onDidBlurEditorWidget(() => {
          updateInlineChatHint()
        })

        editor.onMouseDown((e) => {
          const position = e.target.position
          const model = editor.getModel()
          const cursorClickHandler = onCursorClickRef.current
          if (!position || !model || !cursorClickHandler) return
          cursorClickHandler({
            lineNumber: position.lineNumber,
            column: position.column,
            lineCount: model.getLineCount(),
          })
        })

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
