import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authenticateInstantRequest,
  isAuthenticatedUserMismatch,
} from '../server/instant-auth'

const ORIGINAL_APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID
const ORIGINAL_INSTANT_APP_ID = process.env.INSTANT_APP_ID
const ORIGINAL_INSTANT_API_URI = process.env.INSTANT_API_URI
const ORIGINAL_FETCH = globalThis.fetch

afterEach(() => {
  process.env.NEXT_PUBLIC_INSTANT_APP_ID = ORIGINAL_APP_ID
  process.env.INSTANT_APP_ID = ORIGINAL_INSTANT_APP_ID
  process.env.INSTANT_API_URI = ORIGINAL_INSTANT_API_URI
  vi.restoreAllMocks()
  globalThis.fetch = ORIGINAL_FETCH
})

describe('instant request auth helper', () => {
  it('rejects requests without bearer token', async () => {
    process.env.NEXT_PUBLIC_INSTANT_APP_ID = 'app-id-1'

    const result = await authenticateInstantRequest(new Request('http://localhost/api/test'))
    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.failure.status).toBe(401)
    expect(result.failure.code).toBe('missing_token')
  })

  it('verifies bearer token with Instant auth endpoint', async () => {
    process.env.NEXT_PUBLIC_INSTANT_APP_ID = 'app-id-2'
    process.env.INSTANT_API_URI = 'https://instant.example'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'user-1',
            email: 'user1@example.com',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await authenticateInstantRequest(
      new Request('http://localhost/api/test', {
        headers: {
          authorization: 'Bearer refresh-token-1',
        },
      })
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://instant.example/runtime/auth/verify_refresh_token',
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.user.id).toBe('user-1')
    expect(result.user.email).toBe('user1@example.com')
  })

  it('detects spoofed client user ids', () => {
    expect(isAuthenticatedUserMismatch(undefined, 'user-1')).toBe(false)
    expect(isAuthenticatedUserMismatch(null, 'user-1')).toBe(false)
    expect(isAuthenticatedUserMismatch('user-1', 'user-1')).toBe(false)
    expect(isAuthenticatedUserMismatch('spoofed-user', 'user-1')).toBe(true)
  })
})
