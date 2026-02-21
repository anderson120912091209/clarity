import { resolveUserContext } from '@/lib/server/resolve-user-plan'
import { getTokenUsage } from '@/lib/server/token-quota'

export const runtime = 'nodejs'

/**
 * GET /api/agent/quota
 *
 * Returns the caller's current AI token usage and limits.
 * The client should send x-clarity-user-id and x-clarity-user-plan headers.
 */
export async function GET(req: Request) {
  const ctx = await resolveUserContext(req)
  const snapshot = await getTokenUsage(ctx.userId, ctx.entitlements.aiTokenLimit)

  return Response.json({
    userId: ctx.userId,
    plan: ctx.plan,
    planSource: ctx.planSource,
    period: snapshot.period,
    limit: snapshot.limit,
    used: snapshot.used,
    remaining: snapshot.remaining,
    allowed: snapshot.allowed,
    store: snapshot.store,
  })
}
