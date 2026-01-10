import type { editor } from 'monaco-editor'
import * as monaco from 'monaco-editor'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatState {
  messages: Message[]
  isTyping: boolean
  isVisible: boolean
}

export type CodeEditor = editor.IStandaloneCodeEditor
export type MonacoInstance = typeof monaco
export type Range = monaco.Range

export interface ApplyEditProps {
  editor: CodeEditor
  initialText: string
  range: Range
  diffText: string
}
