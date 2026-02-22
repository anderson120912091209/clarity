/**
 * Chat Service - Vercel AI SDK Data Stream Parser
 *
 * Parses the AI SDK data stream protocol from the backend.
 * The backend uses `toDataStreamResponse()` which emits prefix-tagged lines:
 *   0:"text chunk"           → text delta
 *   9:{"toolCallId":...}     → tool call start
 *   a:{"toolCallId":...}     → tool call result
 *   e:{"finishReason":...}   → step finish
 *   d:{"finishReason":...}   → overall finish
 *
 * This service parses these into structured StreamDelta objects that the
 * chat panel can use to render text, tool calls, and file edits separately.
 */

import type { AgentChatContext } from '@/features/agent/types/chat-context'
import { readRuntimeUserHeaders } from '@/lib/client/runtime-user-context'

// --- Types ---

export interface FileEditDelta {
  fileId?: string
  filePath: string
  editType: 'search_replace' | 'replace_file'
  searchContent: string | null
  replaceContent: string
  description: string
}

export type FileActionType = 'create_file' | 'create_folder' | 'delete_file'

export interface FileActionDelta {
  actionType: FileActionType
  filePath: string
  fileId?: string
  content?: string
  description?: string
  reason?: string
}

export interface ToolCallDelta {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}

export interface ToolResultDelta {
  toolCallId: string
  toolName: string
  result: Record<string, unknown>
}

export interface StreamDelta {
  content?: string
  thinking?: string
  error?: string
  done?: boolean
  fileEdit?: FileEditDelta
  /** Multiple file edits from a batch_apply_edits tool call. */
  fileEdits?: FileEditDelta[]
  fileAction?: FileActionDelta
  toolCall?: ToolCallDelta
  toolResult?: ToolResultDelta
  stateTransition?: string
  stepMetadata?: {
    stepIndex: number
    finishReason: string
    toolCallsInStep: number
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GenerateOptions {
  messages: ChatMessage[]
  stream?: boolean
  abortSignal?: AbortSignal
  model?: string
  context?: AgentChatContext
  planningMode?: boolean
}

export interface GenerateResult {
  output: AsyncIterable<StreamDelta>
  requestId: string
}

export interface IChatService {
  generate(opts: GenerateOptions): Promise<GenerateResult>
  abort(requestId: string): void
}

// --- AI SDK Data Stream Line Parser ---

const TOOL_CALL_NAMES_IN_FLIGHT = new Map<string, string>()
let CURRENT_STEP_INDEX = 0
let TOOL_CALLS_IN_CURRENT_STEP = 0

function normalizeStreamLine(rawLine: string): string | null {
  const trimmed = rawLine.trim()
  if (!trimmed) return null

  if (trimmed.startsWith(':')) return null
  if (trimmed.startsWith('event:')) return null
  if (trimmed.startsWith('id:')) return null
  if (trimmed.startsWith('retry:')) return null

  if (trimmed.startsWith('data:')) {
    const dataValue = trimmed.slice(5).trimStart()
    return dataValue || null
  }

  return trimmed
}

function isStructuredFileEditResult(
  value: unknown
): value is {
  fileId?: string
  applied?: unknown
  filePath: string
  editType: 'search_replace' | 'replace_file'
  searchContent?: string | null
  replaceContent: string
  description?: string
} {
  if (!value || typeof value !== 'object') return false
  const candidate = value as {
    filePath?: unknown
    editType?: unknown
    replaceContent?: unknown
  }

  return (
    typeof candidate.filePath === 'string' &&
    (candidate.editType === 'search_replace' || candidate.editType === 'replace_file') &&
    typeof candidate.replaceContent === 'string'
  )
}

function extractStructuredFileEditResult(value: unknown): {
  fileId?: string
  applied?: unknown
  filePath: string
  editType: 'search_replace' | 'replace_file'
  searchContent?: string | null
  replaceContent: string
  description?: string
} | null {
  if (isStructuredFileEditResult(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return extractStructuredFileEditResult(parsed)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  const nestedKeys = ['result', 'output', 'data', 'value']
  for (const key of nestedKeys) {
    if (!(key in candidate)) continue
    const nested = extractStructuredFileEditResult(candidate[key])
    if (nested) return nested
  }

  return null
}

const FILE_ACTION_TOOL_NAMES = new Set(['create_file', 'create_folder', 'delete_file'])

function extractFileActionResult(
  toolName: string,
  resultValue: Record<string, unknown>
): FileActionDelta | null {
  // Check by tool name first
  if (!FILE_ACTION_TOOL_NAMES.has(toolName)) {
    // Also check by result shape (actionType field)
    const actionType = resultValue.actionType
    if (
      typeof actionType !== 'string' ||
      !FILE_ACTION_TOOL_NAMES.has(actionType)
    ) {
      return null
    }
  }

  const actionType = (resultValue.actionType as string) ?? toolName
  if (!FILE_ACTION_TOOL_NAMES.has(actionType)) return null

  const filePath =
    typeof resultValue.filePath === 'string'
      ? resultValue.filePath
      : typeof resultValue.folderPath === 'string'
        ? resultValue.folderPath
        : null
  if (!filePath) return null

  // Only extract successful actions
  if (resultValue.created === false && resultValue.deleted === false) return null

  return {
    actionType: actionType as FileActionType,
    filePath,
    fileId: typeof resultValue.fileId === 'string' ? resultValue.fileId : undefined,
    content: typeof resultValue.content === 'string' ? resultValue.content : undefined,
    description: typeof resultValue.description === 'string' ? resultValue.description : undefined,
    reason: typeof resultValue.reason === 'string' ? resultValue.reason : undefined,
  }
}

function parseDataStreamLine(line: string): StreamDelta | null {
  const normalizedLine = normalizeStreamLine(line)
  if (!normalizedLine || normalizedLine.length < 2) return null
  if (normalizedLine === '[DONE]') return { done: true }

  if (normalizedLine.startsWith('{')) {
    try {
      const payload = JSON.parse(normalizedLine) as Record<string, unknown>
      const type = typeof payload.type === 'string' ? payload.type : null

      if (type === 'text-delta') {
        const text =
          typeof payload.textDelta === 'string'
            ? payload.textDelta
            : typeof payload.delta === 'string'
              ? payload.delta
              : typeof payload.text === 'string'
                ? payload.text
                : null
        if (text) return { content: text }
      }

      if (type === 'tool-call') {
        const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : null
        const toolName = typeof payload.toolName === 'string' ? payload.toolName : null
        if (toolCallId && toolName) {
          TOOL_CALL_NAMES_IN_FLIGHT.set(toolCallId, toolName)
          return {
            toolCall: {
              toolCallId,
              toolName,
              args:
                payload.args && typeof payload.args === 'object'
                  ? (payload.args as Record<string, unknown>)
                  : {},
            },
          }
        }
      }

      if (type === 'tool-result') {
        const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : null
        if (!toolCallId) return null

        const toolName =
          (typeof payload.toolName === 'string' ? payload.toolName : null) ??
          TOOL_CALL_NAMES_IN_FLIGHT.get(toolCallId) ??
          'unknown'
        TOOL_CALL_NAMES_IN_FLIGHT.delete(toolCallId)

        const resultValue =
          payload.result && typeof payload.result === 'object'
            ? (payload.result as Record<string, unknown>)
            : {}

        const result: StreamDelta = {
          toolResult: {
            toolCallId,
            toolName,
            result: resultValue,
          },
        }

        // Detect batch_apply_edits results (array of sub-edits)
        if (
          (toolName === 'batch_apply_edits' || resultValue.batchApplied === true) &&
          Array.isArray(resultValue.results)
        ) {
          const fileEdits: FileEditDelta[] = []
          for (const subResult of resultValue.results as Record<string, unknown>[]) {
            const extracted = extractStructuredFileEditResult(subResult)
            if (extracted && extracted.applied !== false) {
              fileEdits.push({
                fileId: typeof extracted.fileId === 'string' ? extracted.fileId : undefined,
                filePath: extracted.filePath,
                editType: extracted.editType,
                searchContent:
                  typeof extracted.searchContent === 'string' ? extracted.searchContent : null,
                replaceContent: extracted.replaceContent,
                description: extracted.description ?? `Edit ${extracted.filePath}`,
              })
            }
          }
          if (fileEdits.length > 0) {
            result.fileEdits = fileEdits
          }
        } else {
          // Single apply_file_edit result
          const extractedEditResult = extractStructuredFileEditResult(resultValue)
          if (
            (toolName === 'apply_file_edit' || Boolean(extractedEditResult)) &&
            extractedEditResult &&
            (extractedEditResult.applied === undefined || extractedEditResult.applied === true)
          ) {
            result.fileEdit = {
              fileId: typeof extractedEditResult.fileId === 'string' ? extractedEditResult.fileId : undefined,
              filePath: extractedEditResult.filePath,
              editType: extractedEditResult.editType,
              searchContent:
                typeof extractedEditResult.searchContent === 'string'
                  ? extractedEditResult.searchContent
                  : null,
              replaceContent: extractedEditResult.replaceContent,
              description: extractedEditResult.description ?? `Edit ${extractedEditResult.filePath}`,
            }
          }
        }

        // Detect file creation/deletion tool results
        const extractedAction = extractFileActionResult(toolName, resultValue)
        if (extractedAction) {
          result.fileAction = extractedAction
        }

        return result
      }

      if (type === 'reasoning' || type === 'thinking') {
        const text =
          typeof payload.text === 'string'
            ? payload.text
            : typeof payload.textDelta === 'string'
              ? payload.textDelta
              : typeof payload.delta === 'string'
                ? payload.delta
                : null
        if (text) return { thinking: text }
      }

      if (type === 'error') {
        const errorMessage =
          typeof payload.error === 'string'
            ? payload.error
            : typeof payload.message === 'string'
              ? payload.message
              : 'Unknown error during generation'
        return { error: errorMessage }
      }

      if (type === 'finish') {
        return { done: true }
      }
    } catch {
      // fall through to prefixed parser
    }
  }

  const prefix = normalizedLine[0]
  const colonIndex = normalizedLine.indexOf(':')
  if (colonIndex < 0) return null

  const payload = normalizedLine.slice(colonIndex + 1)

  switch (prefix) {
    // 0: text delta
    case '0': {
      try {
        // AI SDK wraps text in JSON string quotes: 0:"hello"
        const text = JSON.parse(payload) as string
        return { content: text }
      } catch {
        // Fallback: raw text
        return { content: payload }
      }
    }

    // 9: tool call streaming (partial args) - we get the full call via 'b'
    // but we also get tool_call events via '9' in some SDK versions
    case '9': {
      try {
        const data = JSON.parse(payload) as {
          toolCallId: string
          toolName: string
          args: Record<string, unknown>
        }

        // Track tool name for result correlation
        TOOL_CALL_NAMES_IN_FLIGHT.set(data.toolCallId, data.toolName)
        TOOL_CALLS_IN_CURRENT_STEP++

        return {
          toolCall: {
            toolCallId: data.toolCallId,
            toolName: data.toolName,
            args: data.args,
          },
        }
      } catch {
        return null
      }
    }

    // a: tool result
    case 'a': {
      try {
        const data = JSON.parse(payload) as {
          toolCallId: string
          result: Record<string, unknown>
        }

        const toolName = TOOL_CALL_NAMES_IN_FLIGHT.get(data.toolCallId) ?? 'unknown'
        TOOL_CALL_NAMES_IN_FLIGHT.delete(data.toolCallId)

        const result: StreamDelta = {
          toolResult: {
            toolCallId: data.toolCallId,
            toolName,
            result: data.result,
          },
        }

        // Detect batch_apply_edits results (array of sub-edits)
        if (
          (toolName === 'batch_apply_edits' || data.result.batchApplied === true) &&
          Array.isArray(data.result.results)
        ) {
          const fileEdits: FileEditDelta[] = []
          for (const subResult of data.result.results as Record<string, unknown>[]) {
            const extracted = extractStructuredFileEditResult(subResult)
            if (extracted && extracted.applied !== false) {
              fileEdits.push({
                fileId: typeof extracted.fileId === 'string' ? extracted.fileId : undefined,
                filePath: extracted.filePath,
                editType: extracted.editType,
                searchContent:
                  typeof extracted.searchContent === 'string' ? extracted.searchContent : null,
                replaceContent: extracted.replaceContent,
                description: extracted.description ?? `Edit ${extracted.filePath}`,
              })
            }
          }
          if (fileEdits.length > 0) {
            result.fileEdits = fileEdits
          }
        } else {
          // Special handling for apply_file_edit tool results.
          // Some SDK/provider streams might omit the earlier toolName delta,
          // so we also detect by payload shape.
          const extractedEditResult = extractStructuredFileEditResult(data.result)
          if (
            (toolName === 'apply_file_edit' || Boolean(extractedEditResult)) &&
            extractedEditResult &&
            (extractedEditResult.applied === undefined || extractedEditResult.applied === true)
          ) {
            const editResult = extractedEditResult
            result.fileEdit = {
              fileId: typeof editResult.fileId === 'string' ? editResult.fileId : undefined,
              filePath: editResult.filePath,
              editType: editResult.editType,
              searchContent: typeof editResult.searchContent === 'string' ? editResult.searchContent : null,
              replaceContent: editResult.replaceContent,
              description: editResult.description ?? `Edit ${editResult.filePath}`,
            }
          }
        }

        // Detect file creation/deletion tool results
        const extractedAction = extractFileActionResult(toolName, data.result)
        if (extractedAction) {
          result.fileAction = extractedAction
        }

        return result
      } catch {
        return null
      }
    }

    // b: tool call args as string (JSON encoded)
    case 'b': {
      try {
        const data = JSON.parse(payload) as {
          toolCallId: string
          toolName: string
          argsTextDelta: string
        }

        // Track tool name
        if (data.toolName) {
          TOOL_CALL_NAMES_IN_FLIGHT.set(data.toolCallId, data.toolName)
        }

        // Don't emit a delta for partial args, wait for the complete call (9:)
        return null
      } catch {
        return null
      }
    }

    // c: tool call streaming start
    case 'c': {
      try {
        const data = JSON.parse(payload) as {
          toolCallId: string
          toolName: string
        }
        TOOL_CALL_NAMES_IN_FLIGHT.set(data.toolCallId, data.toolName)
        TOOL_CALLS_IN_CURRENT_STEP++

        return {
          toolCall: {
            toolCallId: data.toolCallId,
            toolName: data.toolName,
            args: {},
          },
        }
      } catch {
        return null
      }
    }

    // e: step finish or error
    case 'e': {
      try {
        const data = JSON.parse(payload)
        if (data.finishReason === 'error') {
          return { error: data.error ?? 'Unknown error during generation' }
        }
        // Step finish — emit stepMetadata and advance step counter
        const finishReason =
          typeof data.finishReason === 'string' ? data.finishReason : 'unknown'
        const stepMeta: StreamDelta = {
          stepMetadata: {
            stepIndex: CURRENT_STEP_INDEX,
            finishReason,
            toolCallsInStep: TOOL_CALLS_IN_CURRENT_STEP,
          },
        }
        CURRENT_STEP_INDEX++
        TOOL_CALLS_IN_CURRENT_STEP = 0
        return stepMeta
      } catch {
        return null
      }
    }

    // d: overall finish
    case 'd': {
      return { done: true }
    }

    // 3: error
    case '3': {
      try {
        const errorMsg = JSON.parse(payload) as string
        return { error: errorMsg }
      } catch {
        return { error: payload }
      }
    }

    // 2: data / annotations — may contain thinking/reasoning or agent state
    case '2': {
      try {
        const data = JSON.parse(payload)
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item && typeof item === 'object') {
              const candidate = item as Record<string, unknown>
              if (
                (candidate.type === 'reasoning' || candidate.type === 'thinking') &&
                typeof candidate.text === 'string'
              ) {
                return { thinking: candidate.text }
              }
              if (
                candidate.type === 'agent_state' &&
                typeof candidate.state === 'string'
              ) {
                return { stateTransition: candidate.state }
              }
            }
          }
        }
        return null
      } catch {
        return null
      }
    }

    default:
      // Ignore unknown prefixes (8: message annotation, f: message id, etc.)
      return null
  }
}

// --- Chat Service Implementation ---

class DataStreamChatService implements IChatService {
  private abortControllers = new Map<string, AbortController>()

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const requestId = `req-${Date.now()}`
    const controller = new AbortController()
    this.abortControllers.set(requestId, controller)

    if (opts.abortSignal) {
      opts.abortSignal.addEventListener('abort', () => controller.abort())
    }

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...readRuntimeUserHeaders(),
        },
        body: JSON.stringify({
          messages: opts.messages,
          model: opts.model,
          context: opts.context,
          planningMode: opts.planningMode ?? false,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const abortControllers = this.abortControllers

      async function* streamIterator(): AsyncIterable<StreamDelta> {
        let buffer = ''

        try {
          while (true) {
            if (controller.signal.aborted) break

            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // Process complete lines from the buffer
            const lines = buffer.split('\n')
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue

              const delta = parseDataStreamLine(trimmed)
              if (delta) {
                yield delta
              }
            }
          }

          // Process any remaining content in the buffer
          if (buffer.trim()) {
            const delta = parseDataStreamLine(buffer.trim())
            if (delta) {
              yield delta
            }
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          const message = err instanceof Error ? err.message : 'Streaming error'
          yield { error: message }
        } finally {
          reader.releaseLock()
          abortControllers.delete(requestId)
          TOOL_CALL_NAMES_IN_FLIGHT.clear()
          CURRENT_STEP_INDEX = 0
          TOOL_CALLS_IN_CURRENT_STEP = 0
          yield { done: true }
        }
      }

      return {
        output: streamIterator(),
        requestId,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error'
      console.error('[ChatService] Error:', error)
      this.abortControllers.delete(requestId)

      async function* errorGenerator(): AsyncIterable<StreamDelta> {
        yield { error: message }
      }

      return {
        output: errorGenerator(),
        requestId,
      }
    }
  }

  abort(requestId: string): void {
    const controller = this.abortControllers.get(requestId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(requestId)
    }
  }
}

export const chatService: IChatService = new DataStreamChatService()
