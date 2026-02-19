import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRoomHydration,
  hasRoomCompletedHydration,
  markRoomHydrated,
  resolveCollaborationRoomKey,
  shouldBlockInitialHydration,
} from '../editor-hydration'

describe('editor hydration room registry', () => {
  beforeEach(() => {
    clearRoomHydration()
  })

  it('normalizes room keys from room objects', () => {
    expect(resolveCollaborationRoomKey({ id: ' project:abc ' })).toBe('project:abc')
    expect(resolveCollaborationRoomKey({ id: '' })).toBeNull()
    expect(resolveCollaborationRoomKey(null)).toBeNull()
  })

  it('only blocks hydration while collaboration is enabled', () => {
    expect(shouldBlockInitialHydration(false, 'project:abc')).toBe(false)
    expect(shouldBlockInitialHydration(true, null)).toBe(true)
  })

  it('marks a room hydrated and skips future blocking for that room', () => {
    expect(shouldBlockInitialHydration(true, 'project:abc')).toBe(true)

    markRoomHydrated('project:abc')

    expect(hasRoomCompletedHydration('project:abc')).toBe(true)
    expect(shouldBlockInitialHydration(true, 'project:abc')).toBe(false)
    expect(shouldBlockInitialHydration(true, 'project:def')).toBe(true)
  })

  it('clears hydration state for specific rooms or globally', () => {
    markRoomHydrated('project:abc')
    markRoomHydrated('project:def')

    clearRoomHydration('project:abc')
    expect(hasRoomCompletedHydration('project:abc')).toBe(false)
    expect(hasRoomCompletedHydration('project:def')).toBe(true)

    clearRoomHydration()
    expect(hasRoomCompletedHydration('project:def')).toBe(false)
  })
})
