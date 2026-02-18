import { describe, expect, it } from 'vitest'
import { clampRoleByCeiling, permissionsForRole, roleRank } from '../roles'

describe('collaboration role helpers', () => {
  it('clamps requested role to token ceiling', () => {
    expect(clampRoleByCeiling('editor', 'viewer')).toBe('viewer')
    expect(clampRoleByCeiling('commenter', 'editor')).toBe('commenter')
  })

  it('orders role ranks correctly', () => {
    expect(roleRank('viewer')).toBeLessThan(roleRank('commenter'))
    expect(roleRank('commenter')).toBeLessThan(roleRank('editor'))
  })

  it('maps roles to room permissions', () => {
    const session = {
      FULL_ACCESS: ['room:write', 'comments:write'],
      READ_ACCESS: ['room:read', 'room:presence:write', 'comments:read'],
    } as const

    expect(permissionsForRole(session as never, 'viewer')).toEqual(session.READ_ACCESS)
    expect(permissionsForRole(session as never, 'editor')).toEqual(session.FULL_ACCESS)
    expect(permissionsForRole(session as never, 'commenter')).toEqual([
      'room:read',
      'room:presence:write',
      'comments:write',
    ])
  })
})

