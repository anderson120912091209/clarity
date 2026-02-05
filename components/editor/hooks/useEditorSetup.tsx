'use client'
import { useRef } from 'react'
import { editor } from 'monaco-editor'
import * as monaco from 'monaco-editor'
import { createMathPreview, MathPreviewExtension } from '@/features/source-editor/extensions/math-preview'
import { setupAutoCloseBrackets } from '@/features/languages/latex/linter/autoclose-bracket'

export function useEditorSetup(onChange: (value: string) => void, value: string) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const mathPreviewRef = useRef<MathPreviewExtension | null>(null)
  const autoCloseDisposableRef = useRef<monaco.IDisposable | null>(null)

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor
    editor.onDidChangeModelContent(() => {
      onChange(editor.getValue())
    })
    editor.getModel()?.updateOptions({ tabSize: 4, insertSpaces: true })
    editor.setScrollTop(1)
    editor.setPosition({ lineNumber: 2, column: 0 })
    editor.focus()

    // Initialize math preview extension
    mathPreviewRef.current = createMathPreview(editor, monacoInstance, true)

    // Setup auto-closing brackets for LaTeX
    autoCloseDisposableRef.current = setupAutoCloseBrackets(editor, monacoInstance)

    editor.setValue(value)

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      const selection = editor.getSelection()
      if (selection) {
        const model = editor.getModel()
        if (model) {
          const startLineNumber = selection.startLineNumber
          const endLineNumber = selection.endLineNumber
          const operations = []

          for (let i = startLineNumber; i <= endLineNumber; i++) {
            const lineContent = model.getLineContent(i)
            if (lineContent.startsWith('%')) {
              operations.push({
                range: new monaco.Range(i, 1, i, 2),
                text: '',
              })
            } else {
              operations.push({
                range: new monaco.Range(i, 1, i, 1),
                text: '%',
              })
            }
          }

          model.pushEditOperations([], operations, () => null)
        }
      }
    })
  }

  return { editorRef, handleEditorDidMount }
}
