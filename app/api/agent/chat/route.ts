
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { GEMINI_DEFAULT_MODEL, resolveGeminiModel } from '@/lib/constants/gemini-models'
export const runtime = 'edge'

interface ChatRequestBody {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  model?: string
}

export async function POST(req: Request) {
  const payload = (await req.json()) as ChatRequestBody
  const { messages } = payload

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid chat messages payload', { status: 400 })
  }

  // Use the API key from environment variables (handle potential naming mismatch)
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY

  if (!apiKey) {
    return new Response('Missing Google API Key', { status: 401 })
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  })

  const selectedModel = resolveGeminiModel(payload.model)

  const runWithModel = (modelId: string) =>
    streamText({
      model: google(modelId),
      messages,
      temperature: 0.1, // Low temperature for precise code generation
    })

  const shouldRetryWithDefaultModel = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    return /not found|not supported/i.test(message)
  }

  try {
    let result
    try {
      result = await runWithModel(selectedModel)
    } catch (modelError) {
      if (selectedModel === GEMINI_DEFAULT_MODEL || !shouldRetryWithDefaultModel(modelError)) {
        throw modelError
      }

      console.warn(
        `[Agent Chat] Model "${selectedModel}" failed, retrying with default "${GEMINI_DEFAULT_MODEL}".`
      )
      result = await runWithModel(GEMINI_DEFAULT_MODEL)
    }

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[Agent Chat] Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
