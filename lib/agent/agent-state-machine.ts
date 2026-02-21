/**
 * Agent State Machine
 *
 * Pure, immutable state machine for tracking the agent's tool-use loop.
 * Used on both server (to emit state transitions) and client (to drive UI).
 */

// ── States ──

export type AgentRunState =
  | 'idle'
  | 'llm_generating'
  | 'tool_pending'
  | 'tool_executing'
  | 'tool_result_ready'
  | 'completed'
  | 'error'
  | 'aborted'

// ── Events ──

export type AgentRunEvent =
  | { type: 'START_GENERATION' }
  | { type: 'TEXT_DELTA'; content: string }
  | { type: 'THINKING_DELTA'; content: string }
  | { type: 'TOOL_CALL_START'; toolCallId: string; toolName: string }
  | { type: 'TOOL_CALL_RESULT'; toolCallId: string; success: boolean }
  | { type: 'FILE_EDIT_APPLIED'; filePath: string; editType: string }
  | { type: 'STEP_COMPLETE'; finishReason: string }
  | { type: 'GENERATION_COMPLETE' }
  | { type: 'ERROR'; message: string; recoverable: boolean }
  | { type: 'ABORT' }
  | { type: 'RETRY' }

// ── Context ──

export interface AgentRunError {
  step: number
  toolName?: string
  message: string
  recoverable: boolean
  timestamp: number
}

export interface AgentRunContext {
  state: AgentRunState
  stepIndex: number
  maxSteps: number
  toolCallsCompleted: number
  fileEditsApplied: number
  filesRead: Set<string>
  errors: AgentRunError[]
  retryCount: number
  currentToolName: string | null
  currentToolCallId: string | null
}

// ── Factory ──

export function createInitialContext(maxSteps: number): AgentRunContext {
  return {
    state: 'idle',
    stepIndex: 0,
    maxSteps,
    toolCallsCompleted: 0,
    fileEditsApplied: 0,
    filesRead: new Set(),
    errors: [],
    retryCount: 0,
    currentToolName: null,
    currentToolCallId: null,
  }
}

// ── Transition ──

export function transition(ctx: AgentRunContext, event: AgentRunEvent): AgentRunContext {
  switch (event.type) {
    case 'START_GENERATION':
      return { ...ctx, state: 'llm_generating' }

    case 'TEXT_DELTA':
      // Stay in llm_generating, no state change needed
      return ctx.state === 'idle' ? { ...ctx, state: 'llm_generating' } : ctx

    case 'THINKING_DELTA':
      return ctx.state === 'idle' ? { ...ctx, state: 'llm_generating' } : ctx

    case 'TOOL_CALL_START':
      return {
        ...ctx,
        state: 'tool_executing',
        currentToolName: event.toolName,
        currentToolCallId: event.toolCallId,
      }

    case 'TOOL_CALL_RESULT':
      return {
        ...ctx,
        state: 'tool_result_ready',
        toolCallsCompleted: ctx.toolCallsCompleted + 1,
        currentToolName: null,
        currentToolCallId: null,
      }

    case 'FILE_EDIT_APPLIED':
      return {
        ...ctx,
        fileEditsApplied: ctx.fileEditsApplied + 1,
      }

    case 'STEP_COMPLETE': {
      const nextStep = ctx.stepIndex + 1
      if (event.finishReason === 'stop' || nextStep >= ctx.maxSteps) {
        return { ...ctx, state: 'completed', stepIndex: nextStep }
      }
      // More steps to come (tool-use loop continues)
      return { ...ctx, state: 'llm_generating', stepIndex: nextStep }
    }

    case 'GENERATION_COMPLETE':
      return { ...ctx, state: 'completed' }

    case 'ERROR':
      return {
        ...ctx,
        state: event.recoverable ? ctx.state : 'error',
        errors: [
          ...ctx.errors,
          {
            step: ctx.stepIndex,
            toolName: ctx.currentToolName ?? undefined,
            message: event.message,
            recoverable: event.recoverable,
            timestamp: Date.now(),
          },
        ],
      }

    case 'ABORT':
      return { ...ctx, state: 'aborted' }

    case 'RETRY':
      return {
        ...ctx,
        state: 'llm_generating',
        retryCount: ctx.retryCount + 1,
      }

    default:
      return ctx
  }
}

// ── Helpers ──

export function isTerminalState(state: AgentRunState): boolean {
  return state === 'completed' || state === 'error' || state === 'aborted'
}

export function isActiveState(state: AgentRunState): boolean {
  return !isTerminalState(state) && state !== 'idle'
}

export function getStateLabel(state: AgentRunState, toolName?: string | null): string {
  switch (state) {
    case 'idle':
      return 'Ready'
    case 'llm_generating':
      return 'Thinking...'
    case 'tool_pending':
      return toolName ? `Preparing ${formatToolName(toolName)}...` : 'Preparing tool...'
    case 'tool_executing':
      return toolName ? `Running ${formatToolName(toolName)}...` : 'Running tool...'
    case 'tool_result_ready':
      return 'Processing result...'
    case 'completed':
      return 'Done'
    case 'error':
      return 'Error'
    case 'aborted':
      return 'Stopped'
  }
}

function formatToolName(toolName: string): string {
  const labels: Record<string, string> = {
    list_workspace_files: 'file listing',
    read_workspace_file: 'file read',
    search_workspace: 'workspace search',
    list_typst_skill_docs: 'Typst docs listing',
    search_typst_skill_docs: 'Typst docs search',
    read_typst_skill_doc: 'Typst doc read',
    get_compile_logs: 'compile log check',
    get_active_file_context: 'context fetch',
    apply_file_edit: 'file edit',
  }
  return labels[toolName] ?? toolName.replace(/_/g, ' ')
}
