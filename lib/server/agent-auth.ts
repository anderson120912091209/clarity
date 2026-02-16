import { timingSafeEqual } from 'node:crypto'

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function extractProvidedApiKey(req: Request): string {
  const directHeader = req.headers.get('x-agent-api-key')?.trim()
  if (directHeader) return directHeader

  const authHeader = req.headers.get('authorization')?.trim() ?? ''
  const bearerPrefix = 'bearer '
  if (authHeader.toLowerCase().startsWith(bearerPrefix)) {
    return authHeader.slice(bearerPrefix.length).trim()
  }

  return ''
}

export function authorizeAgentRequest(req: Request): Response | null {
  const expectedApiKey = process.env.AGENT_API_KEY?.trim()
  if (!expectedApiKey) return null

  const providedApiKey = extractProvidedApiKey(req)
  if (!providedApiKey || !safeEqual(expectedApiKey, providedApiKey)) {
    return new Response('Unauthorized', { status: 401 })
  }

  return null
}
