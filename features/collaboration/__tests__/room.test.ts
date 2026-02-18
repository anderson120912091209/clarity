import { describe, expect, it } from 'vitest'
import { buildCollaborationRoomId, parseCollaborationRoomId } from '../room'

describe('collaboration room helpers', () => {
  it('builds deterministic room ids', () => {
    expect(buildCollaborationRoomId('project-1')).toBe('project:project-1')
  })

  it('parses valid project-scoped room ids', () => {
    expect(parseCollaborationRoomId('project:abc')).toEqual({
      projectId: 'abc',
      fileId: null,
    })
  })

  it('parses legacy file-scoped room ids', () => {
    expect(parseCollaborationRoomId('project:abc:file:def')).toEqual({
      projectId: 'abc',
      fileId: 'def',
    })
  })

  it('rejects invalid room ids', () => {
    expect(parseCollaborationRoomId('room:abc')).toBeNull()
    expect(parseCollaborationRoomId('project:')).toBeNull()
  })
})
