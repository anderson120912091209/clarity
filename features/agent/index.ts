// Agent Feature Exports
// Real implementations + component stubs (to be replaced)

// Real hook export
export { useAIAssist } from './hooks/useAIAssist'

// Component stubs - to be replaced during full agent rebuild
export const ChatSidebar = ({ fileContent, isOpen, onClose }: { fileContent?: any; isOpen?: boolean; onClose?: () => void }) => null;
export const ChatPanel = ({ fileContent, isVisible, onToggle }: { fileContent?: any; isVisible?: boolean; onToggle?: () => void }) => null;
export const ChatNavContent = ({ onToggle }: { onToggle?: () => void }) => null;
