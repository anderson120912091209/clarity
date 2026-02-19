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

function createRoleToken(
  role: 'viewer' | 'commenter' | 'editor',
  exp: number
): string {
  return createShareToken(
    {
      v: 1,
      projectId: 'project-1',
      fileId: '*',
      role,
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

  it('prefers higher-permission active role over newer lower-permission rows', () => {
    const nowMs = 1700003600000
    const viewerLatest = createRoleToken('viewer', 1700010800)
    const editorOlder = createRoleToken('editor', 1700007200)

    const resolved = resolveLatestActiveMembershipToken(
      [
        {
          projectId: 'project-1',
          share_token: viewerLatest,
          role: 'viewer',
          last_accessed_at: '2024-01-02T12:00:00.000Z',
        },
        {
          projectId: 'project-1',
          share_token: editorOlder,
          role: 'editor',
          last_accessed_at: '2024-01-01T10:00:00.000Z',
        },
      ],
      'project-1',
      nowMs
    )

    expect(resolved).toBe(editorOlder)
  })

  it('uses role from token claims when stored role field is stale', () => {
    const nowMs = 1700003600000
    const editorToken = createRoleToken('editor', 1700010800)
    const viewerToken = createRoleToken('viewer', 1700010800)

    const resolved = resolveLatestActiveMembershipToken(
      [
        {
          projectId: 'project-1',
          share_token: editorToken,
          role: 'viewer',
          last_accessed_at: '2024-01-01T10:00:00.000Z',
        },
        {
          projectId: 'project-1',
          share_token: viewerToken,
          role: 'viewer',
          last_accessed_at: '2024-01-01T11:00:00.000Z',
        },
      ],
      'project-1',
      nowMs
    )

    expect(resolved).toBe(editorToken)
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
      title_snapshot: 'Snapshot title',
      owner_user_id: 'owner-row-id',
    })

    expect(membership?.id).toBe('membership-1')
    expect(membership?.user_id).toBe('user-1')
    expect(membership?.projectId).toBe('project-1')
    expect(membership?.share_token).toBe(token)
    expect(membership?.added_at).toBe('2024-01-01T00:00:00.000Z')
    expect(membership?.last_accessed_at).toBe('2024-01-01T00:00:00.000Z')
    expect(membership?.title_snapshot).toBe('Snapshot title')
    expect(membership?.owner_user_id).toBe('owner-row-id')
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

  it('preserves explicit membership timestamps from rows', () => {
    const token = createTestToken(1700007200)
    const membership = toSharedMembershipFromShareLinkRecord({
      id: 'membership-2',
      created_by_user_id: 'user-1',
      projectId: 'project-1',
      fileId: SHARED_PROJECT_MEMBERSHIP_FILE_MARKER,
      token,
      created_at: '2024-01-01T00:00:00.000Z',
      added_at: '2024-01-02T00:00:00.000Z',
      last_accessed_at: '2024-01-03T00:00:00.000Z',
    })

    expect(membership?.added_at).toBe('2024-01-02T00:00:00.000Z')
    expect(membership?.last_accessed_at).toBe('2024-01-03T00:00:00.000Z')
  })
})
