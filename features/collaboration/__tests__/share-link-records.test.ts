import { describe, expect, it } from 'vitest'
import { createShareToken } from '../share-token.server'
import {
  extractShareTokenFromRecord,
  hasActiveProjectShareLink,
  isShareLinkRecordActive,
  NEVER_EXPIRY_UNIX_SECONDS,
  resolveShareLinkExpiryMs,
} from '../share-link-records'

const SECRET = 'unit-test-secret'

function createTestToken(exp: number): string {
  return createShareToken(
    {
      v: 1,
      projectId: 'project-1',
      fileId: '*',
      role: 'commenter',
      issuedByUserId: 'owner-1',
      iat: 1700000000,
      exp,
    },
    SECRET
  )
}

describe('share link record helpers', () => {
  it('extracts the first available token field', () => {
    expect(
      extractShareTokenFromRecord({
        token: ' primary-token ',
        edit_token: 'edit-token',
      })
    ).toBe('primary-token')

    expect(
      extractShareTokenFromRecord({
        comment_token: 'comment-token',
      })
    ).toBe('comment-token')
  })

  it('resolves explicit record expiry and honors never-expiring sentinel', () => {
    const token = createTestToken(1700003600)

    expect(
      resolveShareLinkExpiryMs(
        { expires_at_ms: 1700003600000 },
        token
      )
    ).toBe(1700003600000)

    expect(
      resolveShareLinkExpiryMs(
        { expires_at_ms: NEVER_EXPIRY_UNIX_SECONDS * 1000 },
        token
      )
    ).toBeNull()
  })

  it('falls back to token claims when explicit expiry is missing', () => {
    const token = createTestToken(1700007200)
    expect(resolveShareLinkExpiryMs({}, token)).toBe(1700007200000)
  })

  it('evaluates active records across revoked and expired states', () => {
    const validToken = createTestToken(1700007200)
    const expiredToken = createTestToken(1700000001)
    const nowMs = 1700003600000

    expect(
      isShareLinkRecordActive(
        {
          token: validToken,
        },
        nowMs
      )
    ).toBe(true)

    expect(
      isShareLinkRecordActive(
        {
          token: expiredToken,
        },
        nowMs
      )
    ).toBe(false)

    expect(
      isShareLinkRecordActive(
        {
          token: validToken,
          revoked_at: '2026-01-01T00:00:00.000Z',
        },
        nowMs
      )
    ).toBe(false)
  })

  it('detects active project links from mixed record sets', () => {
    const activeToken = createTestToken(1700007200)
    const expiredToken = createTestToken(1700000001)
    const nowMs = 1700003600000

    expect(
      hasActiveProjectShareLink(
        [
          {
            token: expiredToken,
          },
          {
            token: activeToken,
          },
        ],
        nowMs
      )
    ).toBe(true)

    expect(
      hasActiveProjectShareLink(
        [
          {
            token: expiredToken,
          },
          {
            token: activeToken,
            revoked_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        nowMs
      )
    ).toBe(false)
  })
})
