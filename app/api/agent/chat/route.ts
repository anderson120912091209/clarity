
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Use the API key from environment variables (handle potential naming mismatch)
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATION_AI_API_KEY

  if (!apiKey) {
    return new Response('Missing Google API Key', { status: 401 })
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  })

  try {
    const result = await streamText({
      model: google('gemini-2.5-flash'), // User requested 2.5-flash
      messages,
      temperature: 0.1, // Low temperature for precise code generation
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[Agent Chat] Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
