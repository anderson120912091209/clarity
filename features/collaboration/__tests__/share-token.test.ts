import { describe, expect, it } from 'vitest'
import { createShareToken, verifyShareToken } from '../share-token.server'
import { decodeShareTokenUnsafe } from '../share-token'

const SECRET = 'unit-test-secret'

describe('share token signing', () => {
  it('signs and verifies a valid token', () => {
    const token = createShareToken(
      {
        v: 1,
        projectId: 'project-123',
        fileId: 'file-abc',
        role: 'commenter',
        issuedByUserId: 'user-1',
        iat: 1700000000,
        exp: 1700003600,
      },
      SECRET
    )

    const verified = verifyShareToken(token, SECRET)
    expect(verified).not.toBeNull()
    expect(verified?.projectId).toBe('project-123')
    expect(verified?.role).toBe('commenter')
  })

  it('rejects tampered tokens', () => {
    const token = createShareToken(
      {
        v: 1,
        projectId: 'project-123',
        fileId: 'file-abc',
        role: 'viewer',
        issuedByUserId: 'user-1',
        iat: 1700000000,
        exp: 1700003600,
      },
      SECRET
    )
    const tampered = `${token.slice(0, -1)}x`
    expect(verifyShareToken(tampered, SECRET)).toBeNull()
  })

  it('decodes payload without signature validation for client-side UX', () => {
    const token = createShareToken(
      {
        v: 1,
        projectId: 'project-777',
        fileId: '*',
        role: 'editor',
        issuedByUserId: 'owner-1',
        iat: 1700000000,
        exp: 1700007200,
      },
      SECRET
    )

    const decoded = decodeShareTokenUnsafe(token)
    expect(decoded?.projectId).toBe('project-777')
    expect(decoded?.fileId).toBe('*')
  })
})

