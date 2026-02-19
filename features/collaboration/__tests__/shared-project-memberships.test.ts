import { describe, expect, it } from 'vitest'
import { createShareToken } from '../share-token.server'
import {
  SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
  buildSharedProjectMembershipId,
  isSharedProjectMembershipActive,
  resolveLatestActiveMembershipToken,
  toSharedMembershipFromShareLinkRecord,
} from '../shared-project-memberships'

const SECRET = 'unit-test-secret'

function createTestToken(exp: number): string {
  return createShareToken(
    {
      v: 1,
      projectId: 'project-1',
      fileId: '*',
      role: 'editor',
      issuedByUserId: 'owner-1',
      iat: 1700000000,
      exp,
    },
    SECRET
  )
}

describe('shared project membership helpers', () => {
  it('builds a deterministic membership id from user and project ids', () => {
    expect(buildSharedProjectMembershipId('  user-1 ', ' project-123  ')).toBe(
      'user-1::project-123'
    )
  })

  it('returns true for non-revoked memberships with non-expired tokens', () => {
    const nowMs = 1700003600000
    const token = createTestToken(1700007200)

    expect(
      isSharedProjectMembershipActive(
        {
          share_token: token,
          revoked_at: null,
        },
        nowMs
      )
    ).toBe(true)
  })

  it('returns false when membership has been revoked', () => {
    const nowMs = 1700003600000
    const token = createTestToken(1700007200)

    expect(
      isSharedProjectMembershipActive(
        {
          share_token: token,
          revoked_at: '2026-01-01T00:00:00.000Z',
        },
        nowMs
      )
    ).toBe(false)
  })

  it('returns false when token is missing or invalid', () => {
    expect(isSharedProjectMembershipActive({})).toBe(false)
    expect(isSharedProjectMembershipActive({ share_token: 'bad-token' })).toBe(false)
  })

  it('returns false when token has expired', () => {
    const nowMs = 1700003600000
    const token = createTestToken(1700000001)

    expect(
      isSharedProjectMembershipActive(
        {
          share_token: token,
          revoked_at: null,
        },
        nowMs
      )
    ).toBe(false)
  })

  it('resolves most recently accessed active membership token for a project', () => {
    const nowMs = 1700003600000
    const activeOlder = createTestToken(1700007200)
    const activeLatest = createTestToken(1700010800)
    const expired = createTestToken(1700000001)

    const resolved = resolveLatestActiveMembershipToken(
      [
        {
          projectId: 'project-1',
          share_token: activeOlder,
          last_accessed_at: '2024-01-01T10:00:00.000Z',
        },
        {
          projectId: 'project-1',
          share_token: activeLatest,
          last_accessed_at: '2024-01-01T12:00:00.000Z',
        },
        {
          projectId: 'project-1',
          share_token: expired,
          last_accessed_at: '2024-01-01T13:00:00.000Z',
        },
      ],
      'project-1',
      nowMs
    )

    expect(resolved).toBe(activeLatest)
  })

  it('returns null when no active membership token exists for project', () => {
    const nowMs = 1700003600000
    const expired = createTestToken(1700000001)

    expect(
      resolveLatestActiveMembershipToken(
        [
          {
            projectId: 'project-1',
            share_token: expired,
          },
        ],
        'project-1',
        nowMs
      )
    ).toBeNull()
  })

  it('converts stored membership share-link rows into membership records', () => {
    const token = createTestToken(1700007200)
    const membership = toSharedMembershipFromShareLinkRecord({
      id: 'membership-1',
      created_by_user_id: 'user-1',
      projectId: 'project-1',
      fileId: SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
      token,
      role: 'editor',
      created_at: '2024-01-01T00:00:00.000Z',
    })

    expect(membership?.id).toBe('membership-1')
    expect(membership?.user_id).toBe('user-1')
    expect(membership?.projectId).toBe('project-1')
    expect(membership?.share_token).toBe(token)
  })

  it('ignores non-membership share-link rows', () => {
    const token = createTestToken(1700007200)
    expect(
      toSharedMembershipFromShareLinkRecord({
        projectId: 'project-1',
        fileId: '*',
        token,
      })
    ).toBeNull()
  })
})
