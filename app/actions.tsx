'use server'

import { streamText } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { appendFileSync } from 'fs'

const LOG_PATH = '/Users/andersonchen/Downloads/jules-main/ai_debug.log'

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

export async function generate(input: string) {
  appendLog(`AI Request Started. Input length: ${input.length}`)
  const stream = createStreamableValue({ content: '', isComplete: false, error: null as string | null })

  ;(async () => {
    try {
      if (input.includes('DEBUG_MOCK')) {
        appendLog('Executing DEBUG_MOCK mode')
        const mockText = 'This is a mock response. Your backend logic is working perfectly.'
        for (const char of mockText) {
          await new Promise(r => setTimeout(r, 10))
          stream.update({ content: char, isComplete: false, error: null })
        }
        stream.update({ content: '', isComplete: true, error: null })
        return
      }

      appendLog(`Starting streamText call with Gemini 2.0 Flash`)
      
      const result = await streamText({
        model: google('gemini-2.0-flash-exp'), 
        system: 
          'You are a LaTeX expert. ' +
          'CRITICAL RULES:\n' +
          '1. ONLY output valid, compileable LaTeX. NO backticks, NO markdown.\n' +
          '2. NEVER shorten commands. \n' +
          '   - INCORRECT: \\titlef, \\sect, \\subsect\n' +
          '   - CORRECT: \\titleformat, \\section, \\subsection\n' +
          '3. If using the "titlesec" package, ALWAYS use the full \\titleformat command with all required arguments.\n' +
          '4. Ensure all packages used are standard (amsmath, geometry, titlesec, graphicx).\n' +
          '5. Maintain the existing indentation and style of the document.\n' +
          '6. Do not include a preamble (\\documentclass, etc.) unless you are writing a completely new file.',
        prompt: input,
      })

      for await (const delta of result.textStream) {
        stream.update({ content: delta, isComplete: false, error: null })
      }

      stream.update({ content: '', isComplete: true, error: null })
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

export async function chat(messages: { role: 'user' | 'assistant', content: string }[], context: string) {
  appendLog(`Chat Request Started. History length: ${messages.length}`)
  const stream = createStreamableValue({ content: '', isComplete: false, error: null as string | null })

  ;(async () => {
    try {
      const result = await streamText({
        model: google('gemini-2.0-flash-exp'),
        system: 
          'You are a helpful LaTeX AI assistant. You have full visibility into the user\'s current file.\n' +
          'CONTEXT:\n' +
          '--- CURRENT FILE START ---\n' +
          context +
          '\n--- CURRENT FILE END ---\n\n' +
          'GUIDELINES:\n' +
          '1. Answer questions about the LaTeX document accurately.\n' +
          '2. If requested to change code, provide the full LaTeX block or explain clearly.\n' +
          '3. Be concise but premium in your tone.\n' +
          '4. You can analyze the structure, suggest packages, or fix syntax errors.\n' +
          '5. CRITICAL: Always format your responses in Markdown. Use code blocks with language tags for LaTeX code (```latex), use headings, lists, and proper formatting for readability.\n' +
          '6. For code examples, always use syntax-highlighted code blocks with the appropriate language identifier (latex, python, javascript, etc.).',
        messages: messages,
      })

      for await (const delta of result.textStream) {
        stream.update({ content: delta, isComplete: false, error: null })
      }

      stream.update({ content: '', isComplete: true, error: null })
    } catch (error: any) {
      appendLog(`CHAT ERROR: ${error.message}`)
      stream.update({ content: '', isComplete: true, error: error.message })
    } finally {
      stream.done()
    }
  })()

  return { output: stream.value }
}
