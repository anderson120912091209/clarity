import type { FileEditDelta, ToolCallDelta, ToolResultDelta } from '@/services/agent/browser/chat/chatService'

// ── Agent Run State Machine ──

export type AgentRunState =
  | 'idle'
  | 'llm_generating'
  | 'tool_pending'
  | 'tool_executing'
  | 'tool_result_ready'
  | 'completed'
  | 'error'
  | 'aborted'

// ── Tracked Tool Calls ──

export interface TrackedToolCall {
  toolCallId: string
  toolName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt?: number
  durationMs?: number
  args?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
}

// ── Panel Messages ──

export interface PanelMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  toolCalls?: TrackedToolCall[]
  fileEdits?: FileEditDelta[]
  timestamp: number
  isStreaming?: boolean
}

// ── Enhanced Stream Delta ──

export interface EnhancedStreamDelta {
  content?: string
  thinking?: string
  error?: string
  done?: boolean
  fileEdit?: FileEditDelta
  toolCall?: ToolCallDelta
  toolResult?: ToolResultDelta
  stateTransition?: AgentRunState
  stepMetadata?: {
    stepIndex: number
    finishReason: string
    toolCallsInStep: number
  }
  checkpoint?: {
    filePath: string
    stepIndex: number
  }
}

// ── Tool Call Summary ──

export interface ToolCallSummary {
  total: number
  completed: number
  failed: number
  running: number
}

// ── Chat Session Types ──

export interface SendPromptOptions {
  autoApplyStagedEdits?: boolean
  sourceMessageId?: string
}

export interface SendPromptResult {
  assistantMessageId: string | null
  status: 'completed' | 'interrupted' | 'error'
  error?: string
}
