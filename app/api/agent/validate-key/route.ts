import { NextResponse } from 'next/server'
import { createProviderFromRequest } from '@/lib/server/ai-provider-factory'
import { generateText } from 'ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { provider, apiKey, model } = body

    if (!provider || !apiKey) {
      return NextResponse.json({ valid: false, error: 'Provider and API key are required' }, { status: 400 })
    }

    // Create provider instance — key is used transiently and never stored
    const providerResult = createProviderFromRequest({ provider, apiKey, model })

    // Minimal API call to validate the key works
    await generateText({
      model: providerResult.model,
      prompt: 'Say "ok"',
      maxTokens: 5,
    })

    return NextResponse.json({ valid: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation failed'

    // Sanitize error — never echo the API key back
    const safeMessage = message
      .replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED]')
      .replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED]')

    return NextResponse.json({ valid: false, error: safeMessage }, { status: 200 })
  }
}
