/**
 * Quick Edit Module Index
 * Re-exports all quick edit functionality
 */

// Types
export * from './types'

// Prompts
export {
  ctrlKStream_userMessage,
  extractPrefixAndSuffix,
  extractCodeFromFIM,
  extractCodeFromRegular,
  getLanguageFromFile,
  countLines,
} from './prompts'

// Diff Service
export {
  computeDiffs,
  addDiffDecorations,
  addDeletedLinesViewZone,
  addStreamingDecorations,
  removeDecorations,
  removeViewZone,
  createAcceptRejectWidget,
  findTextInCode,
  DIFF_DECORATION_CLASSES,
} from './diffService'

// Chat Service
export { chatService } from './chatService'
export type { IChatService, ChatMessage, StreamDelta, GenerateOptions } from './chatService'
