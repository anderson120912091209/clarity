/**
 * Main entry point for AI Chat feature
 * Export all public APIs and components
 */

// Components
export { ChatPanel, ChatNavContent } from './components/chat-panel'
export { ChatMessageComponent } from './components/chat-message'
export { ChatEmptyState } from './components/chat-empty-state'
export { ChatTypingIndicator } from './components/chat-typing-indicator'
export { ChatInput } from './components/chat-input'
export { MarkdownRenderer } from './components/markdown-renderer'

// Hooks
export { useChat } from './hooks/use-chat'
export { useAIAssist } from './hooks/use-ai-assist'

// Services (server-side)
export { chat, generate } from './services/chat-api'

// Types
export type {
  ChatMessage,
  ChatState,
  ChatStreamDelta,
  ChatContext,
  ChatServiceResponse,
  ChatPanelProps,
  ChatInputProps,
  ChatMessageProps,
  ChatEmptyStateProps,
} from './types/chat.types'

// Constants
export { CHAT_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT, CHAT_CONFIG } from './constants/chat-prompts'
