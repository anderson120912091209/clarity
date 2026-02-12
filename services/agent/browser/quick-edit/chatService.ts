/**
 * Chat Service - Real Implementation
 * Connects to the backend /api/agent/chat route for Gemini streaming.
 */

import type { AgentChatContext } from '@/features/agent/types/chat-context'

export interface StreamDelta {
  content?: string
  error?: string
  done?: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
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

class RealChatService implements IChatService {
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

      // Handle streaming response (raw text stream)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const abortControllers = this.abortControllers

      async function* streamIterator(): AsyncIterable<StreamDelta> {
        try {
          while (true) {
            if (controller.signal.aborted) {
              break;
            }
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            if (chunk) {
              yield { content: chunk }
            }
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
      console.error('[ChatService] Error:', error)
      this.abortControllers.delete(requestId)
      // Return a generator that yields the error immediately
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

export const chatService: IChatService = new RealChatService()
