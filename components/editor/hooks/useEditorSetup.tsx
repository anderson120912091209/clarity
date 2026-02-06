'use client'
import { useCallback, useEffect, useRef } from 'react'
import { editor } from 'monaco-editor'
import * as monaco from 'monaco-editor'
import { createMathPreview, MathPreviewExtension } from '@/features/source-editor/extensions/math-preview'
import { setupAutoCloseBrackets } from '@/features/languages/latex/linter/autoclose-bracket'
import type { EditorLanguageId } from '../syntax/languages/registry'

export function useEditorSetup(
  onChange: (value: string) => void,
  value: string,
  languageId: EditorLanguageId
) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const mathPreviewRef = useRef<MathPreviewExtension | null>(null)
  const autoCloseDisposableRef = useRef<monaco.IDisposable | null>(null)
  const onChangeRef = useRef(onChange)

  const applyLanguageSpecificEditorConfig = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      autoCloseDisposableRef.current?.dispose()
      autoCloseDisposableRef.current = null

      if (languageId === 'latex') {
        autoCloseDisposableRef.current = setupAutoCloseBrackets(editorInstance, monaco)
        return
      }

      editorInstance.updateOptions({
        autoClosingBrackets: 'languageDefined',
        autoClosingQuotes: 'languageDefined',
      })
    },
    [languageId]
  )

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor
    editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue())
    })
    editor.getModel()?.updateOptions({ tabSize: 4, insertSpaces: true })
    editor.setScrollTop(1)
    editor.setPosition({ lineNumber: 2, column: 0 })
    editor.focus()

    // Initialize math preview extension
    mathPreviewRef.current = createMathPreview(editor, monacoInstance, true)
    applyLanguageSpecificEditorConfig(editor)

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

  useEffect(() => {
    const editorInstance = editorRef.current
    if (!editorInstance) return
    applyLanguageSpecificEditorConfig(editorInstance)
  }, [applyLanguageSpecificEditorConfig])

  useEffect(
    () => () => {
      autoCloseDisposableRef.current?.dispose()
      autoCloseDisposableRef.current = null
      mathPreviewRef.current?.dispose()
      mathPreviewRef.current = null
    },
    []
  )

  return { editorRef, handleEditorDidMount }
}
