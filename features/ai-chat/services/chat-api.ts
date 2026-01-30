'use server'

import { streamText } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { appendFileSync } from 'fs'
import { CHAT_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT } from '../constants/chat-prompts'
import type { ChatMessage, ChatServiceResponse, ChatStreamDelta } from '../types/chat.types'

const LOG_PATH = process.env.AI_LOG_PATH || '/Users/andersonchen/Downloads/jules-main/ai_debug.log'

const appendLog = (msg: string) => {
  try {
    appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`)
  } catch (e) {
    console.error('Failed to write to log file:', e)
  }
}

// Initialize Google provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATION_AI_API_KEY || process.env.GOOGLE_API_KEY,
})

/**
 * Chat with AI using conversation history and file context
 */
export async function chat(
  messages: ChatMessage[],
  context: string
): Promise<{ output: ReturnType<typeof createStreamableValue>['value'] }> {
  appendLog(`Chat Request Started. History length: ${messages.length}`)
  const stream = createStreamableValue<ChatStreamDelta>({
    content: '',
    isComplete: false,
    error: undefined,
  })

  ;(async () => {
    try {
      const systemPrompt = CHAT_SYSTEM_PROMPT.replace('{context}', context)

      const result = await streamText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      })

      for await (const delta of result.textStream) {
        stream.update({ content: delta, isComplete: false, error: undefined })
      }

      stream.update({ content: '', isComplete: true, error: undefined })
    } catch (error: any) {
      appendLog(`CHAT ERROR: ${error.message}`)
      stream.update({ content: '', isComplete: true, error: error.message })
    } finally {
      stream.done()
    }
  })()

  return { output: stream.value }
}

/**
 * Generate LaTeX code based on input prompt
 */
export async function generate(input: string): Promise<{ output: ReturnType<typeof createStreamableValue>['value'] }> {
  appendLog(`AI Request Started. Input length: ${input.length}`)
  const stream = createStreamableValue<ChatStreamDelta>({
    content: '',
    isComplete: false,
    error: undefined,
  })

  ;(async () => {
    try {
      if (input.includes('DEBUG_MOCK')) {
        appendLog('Executing DEBUG_MOCK mode')
        const mockText = 'This is a mock response. Your backend logic is working perfectly.'
        for (const char of mockText) {
          await new Promise((r) => setTimeout(r, 10))
          stream.update({ content: char, isComplete: false, error: undefined })
        }
        stream.update({ content: '', isComplete: true, error: undefined })
        return
      }

      appendLog(`Starting streamText call with Gemini 2.5 Flash`)

      const result = await streamText({
        model: google('gemini-2.5-flash'),
        system: GENERATE_SYSTEM_PROMPT,
        prompt: input,
      })

      for await (const delta of result.textStream) {
        stream.update({ content: delta, isComplete: false, error: undefined })
      }

      stream.update({ content: '', isComplete: true, error: undefined })
    } catch (error: any) {
      const errorMsg = `${error.name}: ${error.message}`
      appendLog(`CRITICAL ERROR: ${errorMsg}`)
      console.error('AI error:', error)
      stream.update({ content: '', isComplete: true, error: errorMsg })
    } finally {
      appendLog('Stream processing final cleanup')
      stream.done()
    }
  })()

  return { output: stream.value }
}

