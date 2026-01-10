/**
 * TypeScript types for AI Chat feature
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  id?: string
  timestamp?: number
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
}

export interface ChatStreamDelta {
  content?: string | null
  error?: string | null
  isComplete?: boolean
}

export interface ChatContext {
  fileContent: string
  fileName?: string
  projectId?: string
}

export type ChatServiceResponse = {
  output: any // StreamableValue from ai/rsc
}

export interface ChatPanelProps {
  fileContent: string
  isVisible: boolean
  onToggle: () => void
}

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  placeholder?: string
}

export interface ChatMessageProps {
  message: ChatMessage
  index: number
}

export interface ChatEmptyStateProps {
  title?: string
  description?: string
}

