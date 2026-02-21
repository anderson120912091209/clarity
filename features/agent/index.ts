// Agent Feature Exports
// Real implementations + component stubs (to be replaced)

// Real hook exports
export { useAIAssist } from './hooks/useAIAssist'
export { useChangeManagerState } from './hooks/useChangeManagerState'
export { useChatThreadsState } from './hooks/useChatThreadsState'
export { useChatSession } from './hooks/useChatSession'
export { useStreamingState } from './hooks/useStreamingState'
export { ChatPanel } from './components/chat-panel'

// Component stubs - to be replaced during full agent rebuild
export const ChatSidebar = ({ fileContent, isOpen, onClose }: { fileContent?: any; isOpen?: boolean; onClose?: () => void }) => null;
export const ChatNavContent = ({ onToggle }: { onToggle?: () => void }) => null;
