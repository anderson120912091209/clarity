import crypto from 'node:crypto'

export const CHAT_CLIENT_QUOTA = 120
const CHAT_QUOTA_PREFIX = 'chat:quota:v1'

function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  const userAgent = req.headers.get('user-agent') ?? 'unknown'

  const ip =
    cfConnectingIp?.split(',')[0]?.trim() ||
    realIp?.split(',')[0]?.trim() ||
    forwardedFor?.split(',')[0]?.trim() ||
    'unknown-ip'

  return `${ip}:${userAgent}`
}

function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function buildChatQuotaKey(req: Request): string {
  return `${CHAT_QUOTA_PREFIX}:${hashIdentifier(getClientIdentifier(req))}`
}
