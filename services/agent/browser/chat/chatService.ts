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

// --- Types ---

export interface FileEditDelta {
  filePath: string
  editType: 'search_replace' | 'replace_file'
  searchContent: string | null
  replaceContent: string
  description: string
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
  error?: string
  done?: boolean
  fileEdit?: FileEditDelta
  toolCall?: ToolCallDelta
  toolResult?: ToolResultDelta
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

function isStructuredFileEditResult(
  value: unknown
): value is {
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

function parseDataStreamLine(line: string): StreamDelta | null {
  if (!line || line.length < 2) return null

  const prefix = line[0]
  const colonIndex = line.indexOf(':')
  if (colonIndex < 0) return null

  const payload = line.slice(colonIndex + 1)

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

        // Special handling for apply_file_edit tool results.
        // Some SDK/provider streams might omit the earlier toolName delta,
        // so we also detect by payload shape.
        if (
          (toolName === 'apply_file_edit' || isStructuredFileEditResult(data.result)) &&
          isStructuredFileEditResult(data.result) &&
          (data.result.applied === undefined || data.result.applied === true)
        ) {
          const editResult = data.result
          result.fileEdit = {
            filePath: editResult.filePath,
            editType: editResult.editType,
            searchContent: typeof editResult.searchContent === 'string' ? editResult.searchContent : null,
            replaceContent: editResult.replaceContent,
            description: editResult.description ?? `Edit ${editResult.filePath}`,
          }
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
        // Step finish — not an error, just continue
        return null
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

    default:
      // Ignore unknown prefixes (2: data, 8: message annotation, f: message id, etc.)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: opts.messages,
          model: opts.model,
          context: opts.context,
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
