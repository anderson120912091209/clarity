type InstantAuthFailureCode =
  | 'missing_app_id'
  | 'missing_token'
  | 'invalid_token'
  | 'upstream_error'

interface InstantVerifiedUser {
  id: string
  email?: string
  refresh_token?: string
}

interface InstantAuthSuccess {
  ok: true
  token: string
  user: InstantVerifiedUser
}

interface InstantAuthFailure {
  ok: false
  failure: {
    code: InstantAuthFailureCode
    status: number
    error: string
  }
}

export type InstantRequestAuthResult = InstantAuthSuccess | InstantAuthFailure

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length ? normalized : null
}

export function resolveInstantAppId(): string | null {
  return (
    asNonEmptyString(process.env.INSTANT_APP_ID) ??
    asNonEmptyString(process.env.NEXT_PUBLIC_INSTANT_APP_ID)
  )
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  const normalized = asNonEmptyString(authorizationHeader)
  if (!normalized) return null

  const bearerPrefix = 'bearer '
  if (!normalized.toLowerCase().startsWith(bearerPrefix)) return null
  return asNonEmptyString(normalized.slice(bearerPrefix.length))
}

export function isAuthenticatedUserMismatch(
  claimedUserId: unknown,
  authenticatedUserId: string
): boolean {
  const normalizedClaimedUserId = asNonEmptyString(claimedUserId)
  if (!normalizedClaimedUserId) return false
  return normalizedClaimedUserId !== authenticatedUserId
}

function normalizeInstantUser(value: unknown): InstantVerifiedUser | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = asNonEmptyString(record.id)
  if (!id) return null

  const email = asNonEmptyString(record.email) ?? undefined
  const refreshToken = asNonEmptyString(record.refresh_token) ?? undefined
  return {
    id,
    email,
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
  }
}

export async function authenticateInstantRequest(req: Request): Promise<InstantRequestAuthResult> {
  const appId = resolveInstantAppId()
  if (!appId) {
    return {
      ok: false,
      failure: {
        code: 'missing_app_id',
        status: 500,
        error: 'Instant App ID is not configured.',
      },
    }
  }

  const refreshToken = extractBearerToken(req.headers.get('authorization'))
  if (!refreshToken) {
    return {
      ok: false,
      failure: {
        code: 'missing_token',
        status: 401,
        error: 'Missing authorization bearer token.',
      },
    }
  }

  const instantApiUri =
    asNonEmptyString(process.env.INSTANT_API_URI) ?? 'https://api.instantdb.com'

  const response = await fetch(`${instantApiUri}/runtime/auth/verify_refresh_token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      'app-id': appId,
      'refresh-token': refreshToken,
    }),
  }).catch(() => null)

  if (!response) {
    return {
      ok: false,
      failure: {
        code: 'upstream_error',
        status: 502,
        error: 'Failed to verify Instant auth token.',
      },
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        failure: {
          code: 'invalid_token',
          status: 401,
          error: 'Invalid or expired authorization token.',
        },
      }
    }

    return {
      ok: false,
      failure: {
        code: 'upstream_error',
        status: 502,
        error: 'Instant auth verification failed.',
      },
    }
  }

  const payload = (await response.json().catch(() => null)) as
    | { user?: unknown }
    | null
  const user = normalizeInstantUser(payload?.user)
  if (!user) {
    return {
      ok: false,
      failure: {
        code: 'upstream_error',
        status: 502,
        error: 'Instant auth response is missing a valid user.',
      },
    }
  }

  return {
    ok: true,
    token: refreshToken,
    user,
  }
}
