/**
 * Quick Edit Types
 * 
 * Centralized type definitions for the quick edit coding agent.
 * Designed for extensibility and clear separation of concerns.
 */

import type * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'

// ============================================================================
// State Management
// ============================================================================

/**
 * Quick edit workflow states
 */
export type QuickEditState = 
  | 'idle'       // No quick edit active
  | 'input'      // User is typing instructions
  | 'streaming'  // AI is generating code
  | 'review'     // Showing diff for accept/reject

/**
 * Context passed through the quick edit lifecycle
 */
export interface QuickEditContext {
  id: string
  state: QuickEditState
  editor: editor.IStandaloneCodeEditor
  monacoInstance: typeof monaco
  selection: NormalizedSelection
  instructions?: string
  originalCode: string
  generatedCode?: string
}

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Normalized selection with line information
 */
export interface NormalizedSelection {
  range: monaco.Range
  text: string
  isEmpty: boolean
  lineNumbers: {
    start: number  // 1-indexed
    end: number    // 1-indexed, inclusive
  }
}

/**
 * How to handle empty selections when Cmd+K is pressed
 */
export type EmptySelectionBehavior = 'line' | 'block' | 'cancel'

// ============================================================================
// Diff Types
// ============================================================================

/**
 * Types of diffs that can occur
 */
export type DiffType = 'insertion' | 'deletion' | 'edit'

/**
 * A computed diff between original and modified code
 */
export interface ComputedDiff {
  type: DiffType
  diffId: number
  
  // For insertion/edit: lines in the new code
  startLine: number      // 1-indexed, where new code starts
  endLine: number        // 1-indexed, where new code ends (inclusive)
  
  // For deletion/edit: the original code that was removed/changed
  originalCode: string
  originalStartLine: number
  originalEndLine: number
}

/**
 * A zone in the editor where a diff is being displayed
 */
export interface DiffZone {
  id: string
  uri: string  // File URI for tracking across tabs
  
  // Location
  startLine: number
  endLine: number
  
  // Content
  originalCode: string
  currentCode: string
  
  // State
  isStreaming: boolean
  streamState?: StreamState
  
  // Diffs within this zone
  diffs: Map<number, ComputedDiff>
  
  // Monaco resources (for cleanup)
  decorationIds: string[]
  viewZoneIds: string[]
  
  // Callbacks
  onChange?: (value: string) => void
}

/**
 * Stream state for active AI generation
 */
export interface StreamState {
  isStreaming: boolean
  requestId?: string
  line: number      // Current line being written
  col: number       // Current column
  addedSplitYet: boolean
}

// ============================================================================
// FIM (Fill-in-Middle) Types
// ============================================================================

/**
 * Tags for FIM prompt format
 * These wrap the code sections in prompts and responses
 */
export interface FIMTags {
  preTag: string   // Tag for code ABOVE selection (e.g., "ABOVE")
  sufTag: string   // Tag for code BELOW selection (e.g., "BELOW")
  midTag: string   // Tag for the SELECTION itself (e.g., "SELECTION")
}

/**
 * Default FIM tags (matches Void editor pattern)
 */
export const DEFAULT_FIM_TAGS: FIMTags = {
  preTag: 'ABOVE',
  sufTag: 'BELOW',
  midTag: 'SELECTION',
}

// ============================================================================
// UI Component Props
// ============================================================================

/**
 * Props for QuickEditInput component
 */
export interface QuickEditInputProps {
  diffZoneId: string
  onSubmit: (instructions: string, modelId: string) => void
  onCancel: () => void
  onHeightChange: (height: number) => void
  initialValue?: string
  isLoading?: boolean
  placeholder?: string
  initialModelId?: string
  modelOptions?: Array<{ value: string; label: string }>
}

/**
 * Props for AcceptRejectWidget component
 */
export interface AcceptRejectWidgetProps {
  diffId: number
  onAccept: () => void
  onReject: () => void
  startLine: number
  acceptLabel?: string
  rejectLabel?: string
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Options for starting a quick edit
 */
export interface StartQuickEditOptions {
  editor: editor.IStandaloneCodeEditor
  monacoInstance: typeof monaco
  selection: NormalizedSelection
  instructions: string
  onChange?: (value: string) => void
  setIsStreaming?: (isStreaming: boolean) => void
}

/**
 * Options for applying edits
 */
export interface ApplyEditOptions {
  from: 'QuickEdit' | 'ChatApply'
  diffZoneId: string
  startBehavior: 'accept-conflicts' | 'reject-conflicts' | 'keep-conflicts'
}

/**
 * Event types emitted by the edit service
 */
export type EditServiceEvent = 
  | { type: 'zone-created'; zoneId: string }
  | { type: 'zone-deleted'; zoneId: string }
  | { type: 'streaming-start'; zoneId: string }
  | { type: 'streaming-end'; zoneId: string }
  | { type: 'diff-added'; zoneId: string; diffId: number }
  | { type: 'diff-accepted'; zoneId: string; diffId: number }
  | { type: 'diff-rejected'; zoneId: string; diffId: number }

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Disposable resource for cleanup
 */
export interface Disposable {
  dispose: () => void
}

/**
 * ID generator for consistent ID creation
 */
let idCounter = 0
export const generateId = (prefix: string = 'qe'): string => {
  return `${prefix}-${Date.now()}-${++idCounter}`
}
