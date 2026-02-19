import crypto from 'node:crypto'

const QUICK_EDIT_QUOTA_PREFIX = 'quick-edit:quota:v1'

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

interface BuildQuickEditQuotaKeyOptions {
  userId?: string | null
}

function normalizeUserId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized || normalized.length > 200) return null
  return normalized
}

export function buildQuickEditQuotaKey(
  req: Request,
  options: BuildQuickEditQuotaKeyOptions = {}
): string {
  const normalizedUserId = normalizeUserId(options.userId)
  if (normalizedUserId) {
    return `${QUICK_EDIT_QUOTA_PREFIX}:user:${hashIdentifier(normalizedUserId)}`
  }

  return `${QUICK_EDIT_QUOTA_PREFIX}:client:${hashIdentifier(getClientIdentifier(req))}`
}
