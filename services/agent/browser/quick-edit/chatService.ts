/**
 * Quick Edit Stream Service
 *
 * Dedicated transport for low-latency Cmd/Ctrl+K edits.
 * This intentionally uses a plain text stream route and avoids
 * structured tool/event parsing used by chat.
 */
import { readRuntimeUserHeaders } from '@/lib/client/runtime-user-context'
import { qeDebug } from './debug'

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
      const userHeaders = readRuntimeUserHeaders()
      qeDebug.log('fetch', { requestId, model: opts.model, messageCount: opts.messages.length, userHeaders })

      const response = await fetch('/api/agent/quick-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...userHeaders,
        },
        body: JSON.stringify({
          messages: opts.messages,
          model: opts.model,
        }),
        signal: controller.signal,
      })

      qeDebug.log('response', {
        status: response.status,
        statusText: response.statusText,
        quotaLimit: response.headers.get('X-AI-Quota-Limit'),
        quotaUsed: response.headers.get('X-AI-Quota-Used'),
        quotaRemaining: response.headers.get('X-AI-Quota-Remaining'),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        qeDebug.error('API error', { status: response.status, body })
        throw new Error(`API request failed (${response.status}): ${body || response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const abortControllers = this.abortControllers

      async function* streamIterator(): AsyncIterable<StreamDelta> {
        let totalChunks = 0
        let totalChars = 0
        try {
          while (true) {
            if (controller.signal.aborted) break

            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            if (chunk) {
              totalChunks++
              totalChars += chunk.length
              if (totalChunks <= 3) {
                qeDebug.log(`stream chunk #${totalChunks}`, JSON.stringify(chunk.slice(0, 200)))
              }
              yield { content: chunk }
            }
          }

          const finalChunk = decoder.decode()
          if (finalChunk) {
            totalChars += finalChunk.length
            yield { content: finalChunk }
          }
          qeDebug.success('stream complete', { totalChunks, totalChars })
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            qeDebug.warn('stream aborted')
            return
          }
          const message = err instanceof Error ? err.message : 'Streaming error'
          qeDebug.error('stream error', message)
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
