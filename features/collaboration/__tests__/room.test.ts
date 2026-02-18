import { describe, expect, it } from 'vitest'
import { buildCollaborationRoomId, parseCollaborationRoomId } from '../room'

describe('collaboration room helpers', () => {
  it('builds deterministic room ids', () => {
    expect(buildCollaborationRoomId('project-1', 'file-a')).toBe('project:project-1:file:file-a')
  })

  it('parses valid room ids', () => {
    expect(parseCollaborationRoomId('project:abc:file:def')).toEqual({
      projectId: 'abc',
      fileId: 'def',
    })
  })

  it('rejects invalid room ids', () => {
    expect(parseCollaborationRoomId('room:abc')).toBeNull()
    expect(parseCollaborationRoomId('project::file:def')).toBeNull()
  })
})

