// Temporary stub exports - to be replaced during agent rebuild

// Component stubs
export const ChatSidebar = ({ fileContent, isOpen, onClose }: { fileContent?: any; isOpen?: boolean; onClose?: () => void }) => null;
export const ChatPanel = ({ fileContent, isVisible, onToggle }: { fileContent?: any; isVisible?: boolean; onToggle?: () => void }) => null;
export const ChatNavContent = ({ onToggle }: { onToggle?: () => void }) => null;

// Hook stubs
export const useAIAssist = (onChange?: any) => ({
  isActive: false,
  toggleAssist: () => {},
  sendMessage: async () => {},
  handleAIAssist: async () => {},
});
