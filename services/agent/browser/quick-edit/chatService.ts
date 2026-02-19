/**
 * Quick Edit Stream Service
 *
 * Dedicated transport for low-latency Cmd/Ctrl+K edits.
 * This intentionally uses a plain text stream route and avoids
 * structured tool/event parsing used by chat.
 */
import { readRuntimeUserHeaders } from '@/lib/client/runtime-user-context'

export interface StreamDelta {
  content?: string
  error?: string
  done?: boolean
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
}

export interface GenerateResult {
  output: AsyncIterable<StreamDelta>
  requestId: string
}

export interface IChatService {
  generate(opts: GenerateOptions): Promise<GenerateResult>
  abort(requestId: string): void
}

class QuickEditChatService implements IChatService {
  private abortControllers = new Map<string, AbortController>()

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const requestId = `qe-${Date.now()}`
    const controller = new AbortController()
    this.abortControllers.set(requestId, controller)

    if (opts.abortSignal) {
      opts.abortSignal.addEventListener('abort', () => controller.abort())
    }

    try {
      const response = await fetch('/api/agent/quick-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...readRuntimeUserHeaders(),
        },
        body: JSON.stringify({
          messages: opts.messages,
          model: opts.model,
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
        try {
          while (true) {
            if (controller.signal.aborted) break

            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            if (chunk) {
              yield { content: chunk }
            }
          }

          const finalChunk = decoder.decode()
          if (finalChunk) {
            yield { content: finalChunk }
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          const message = err instanceof Error ? err.message : 'Streaming error'
          yield { error: message }
        } finally {
          reader.releaseLock()
          abortControllers.delete(requestId)
          yield { done: true }
        }
      }

      return {
        output: streamIterator(),
        requestId,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error'
      this.abortControllers.delete(requestId)

      async function* errorGenerator(): AsyncIterable<StreamDelta> {
        yield { error: message }
        yield { done: true }
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

export const chatService: IChatService = new QuickEditChatService()
