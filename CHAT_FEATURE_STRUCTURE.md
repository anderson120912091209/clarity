# AI Chat Feature - File Structure Overview

## Current Chat-Related Files

### 1. **Backend/Server Actions**
- `app/actions.tsx` - Server-side AI chat logic
  - `chat()` function - Main chat function using Google Gemini
  - `generate()` function - AI generation for LaTeX (not directly chat, but related)

### 2. **UI Components**
- `components/editor/cursor-chat.tsx` - Main chat component (Cursor-style design)
  - `CursorChat` - Main chat interface component
  - `ChatNavContent` - Navigation header for chat panel
- `components/editor/chat-sidebar.tsx` - Alternative sidebar chat (older implementation?)
- `components/editor/markdown-renderer.tsx` - Renders AI responses with Markdown
  - Handles code blocks, syntax highlighting, formatting

### 3. **Integration Points**
- `app/project/[id]/page.tsx` - Uses CursorChat component
  - Manages `isChatVisible` state
  - Integrates chat into editor layout

### 4. **Related Utilities**
- `components/editor/hooks/useAIAssist.tsx` - AI assist feature (Cmd+K)
  - Not directly chat, but related AI functionality

## Recommended File Structure for Better Organization

Since chat will be a big and important feature, consider this structure:

```
features/
  chat/                              # New dedicated chat feature folder
    components/
      chat-panel.tsx                 # Main chat UI component
      chat-message.tsx               # Individual message component
      chat-input.tsx                 # Input area component
      chat-header.tsx                # Chat header/navigation
      chat-empty-state.tsx           # Empty state when no messages
      chat-typing-indicator.tsx      # Typing animation
      
    hooks/
      useChat.ts                     # Main chat logic hook
      useChatHistory.ts              # Chat history management
      useChatStream.ts               # Streaming logic
      useChatContext.ts              # File context management
      
    types/
      chat.types.ts                  # TypeScript types (Message, ChatState, etc.)
      
    utils/
      chat-helpers.ts                # Utility functions
      message-parser.ts              # Parse/format messages
      context-builder.ts             # Build file context for AI
      
    services/
      chat-api.ts                    # API calls (move from app/actions.tsx)
      chat-storage.ts                # Save/load chat history (if needed)
      
    constants/
      chat-prompts.ts                # System prompts
      chat-config.ts                 # Configuration constants
      
  ai-assist/                         # Separate AI assist feature
    components/
      ai-assist-panel.tsx
    hooks/
      useAIAssist.ts                 # Already exists, could move here
```

## Current Dependencies

### Packages Used:
- `ai` - Vercel AI SDK for streaming
- `@ai-sdk/google` - Google Gemini integration
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `rehype-highlight` - Code syntax highlighting
- `rehype-raw` - Raw HTML support
- `highlight.js` - Syntax highlighting theme

### Key Patterns:
1. **Streaming**: Uses `createStreamableValue` from `ai/rsc`
2. **State Management**: React useState for messages
3. **Context**: File content passed as context to AI
4. **Rendering**: MarkdownRenderer for AI responses

## Suggested Refactoring Steps

1. **Create `features/chat/` folder structure**
2. **Extract chat logic from `app/actions.tsx`** → `features/chat/services/chat-api.ts`
3. **Move UI components** to `features/chat/components/`
4. **Create custom hooks** to manage chat state and logic
5. **Add TypeScript types** for better type safety
6. **Consider chat history persistence** (localStorage, IndexedDB, or backend)
