import { describe, expect, it } from 'vitest'
import { createShareToken } from '../share-token.server'
import { buildShareGrantRecord, tokenFieldForRole } from '../share-grants'

const SECRET = 'unit-test-secret'

describe('share grant helpers', () => {
  it('maps role tokens to the correct grant field', () => {
    expect(tokenFieldForRole('viewer', 'token-1')).toEqual({})
    expect(tokenFieldForRole('commenter', 'token-2')).toEqual({ comment_token: 'token-2' })
    expect(tokenFieldForRole('editor', 'token-3')).toEqual({ edit_token: 'token-3' })
  })

  it('builds grant records from token claims by default', () => {
    const token = createShareToken(
      {
        v: 1,
        projectId: 'project-1',
        fileId: '*',
        role: 'editor',
        issuedByUserId: 'owner-1',
        iat: 1700000000,
        exp: 1700003600,
      },
      SECRET
    )

    const grant = buildShareGrantRecord({
      projectId: 'project-1',
      fileId: 'file-1',
      token,
      createdByUserId: 'owner-1',
      createdAtIso: '2025-01-01T00:00:00.000Z',
    })

    expect(grant.role).toBe('editor')
    expect(grant.edit_token).toBe(token)
    expect(grant.expires_at_ms).toBe(1700003600 * 1000)
  })

  it('allows explicit role override when creating grants', () => {
    const token = createShareToken(
      {
        v: 1,
        projectId: 'project-2',
        fileId: '*',
        role: 'viewer',
        issuedByUserId: 'owner-2',
        iat: 1700000000,
        exp: 1700007200,
      },
      SECRET
    )

    const grant = buildShareGrantRecord({
      projectId: 'project-2',
      fileId: 'file-2',
      token,
      role: 'commenter',
      createdByUserId: 'owner-2',
    })

    expect(grant.role).toBe('commenter')
    expect(grant.comment_token).toBe(token)
    expect(grant.token).toBe(token)
  })
})
