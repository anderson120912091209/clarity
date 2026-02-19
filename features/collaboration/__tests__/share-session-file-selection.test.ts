import { describe, expect, it } from 'vitest'
import { resolveShareSessionActiveFile } from '../share-session-file-selection'

function asFileSet(...fileIds: string[]): Set<string> {
  return new Set(fileIds)
}

describe('share session file selection', () => {
  it('applies the share-target file once when entering a shared session', () => {
    const result = resolveShareSessionActiveFile({
      availableFileIds: asFileSet('main', 'new-file'),
      fallbackFileId: 'main',
      hasInitializedSharedTarget: false,
      isShareSession: true,
      previousActiveFileId: 'new-file',
      sharedTargetFileId: 'main',
    })

    expect(result.nextActiveFileId).toBe('main')
    expect(result.hasInitializedSharedTarget).toBe(true)
  })

  it('preserves the user-selected active file after initial share-target hydration', () => {
    const result = resolveShareSessionActiveFile({
      availableFileIds: asFileSet('main', 'new-file'),
      fallbackFileId: 'main',
      hasInitializedSharedTarget: true,
      isShareSession: true,
      previousActiveFileId: 'new-file',
      sharedTargetFileId: 'main',
    })

    expect(result.nextActiveFileId).toBe('new-file')
    expect(result.hasInitializedSharedTarget).toBe(true)
  })

  it('falls back to share-target if the previous active file disappears', () => {
    const result = resolveShareSessionActiveFile({
      availableFileIds: asFileSet('main'),
      fallbackFileId: 'main',
      hasInitializedSharedTarget: true,
      isShareSession: true,
      previousActiveFileId: 'new-file',
      sharedTargetFileId: 'main',
    })

    expect(result.nextActiveFileId).toBe('main')
    expect(result.hasInitializedSharedTarget).toBe(true)
  })

  it('does not initialize share-target behavior for non-share sessions', () => {
    const result = resolveShareSessionActiveFile({
      availableFileIds: asFileSet('main', 'new-file'),
      fallbackFileId: 'main',
      hasInitializedSharedTarget: false,
      isShareSession: false,
      previousActiveFileId: 'new-file',
      sharedTargetFileId: 'main',
    })

    expect(result.nextActiveFileId).toBe('new-file')
    expect(result.hasInitializedSharedTarget).toBe(false)
  })
})
