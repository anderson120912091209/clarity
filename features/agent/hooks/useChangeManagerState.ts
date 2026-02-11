import { useMemo, useSyncExternalStore } from 'react'
import { changeManagerService } from '@/features/agent/services/change-manager'

export function useChangeManagerState() {
  const snapshot = useSyncExternalStore(
    changeManagerService.subscribe,
    changeManagerService.getSnapshot,
    changeManagerService.getSnapshot
  )

  const files = useMemo(
    () =>
      snapshot.sortedFileIds
        .map((fileId) => snapshot.byFileId[fileId])
        .filter((file): file is NonNullable<typeof file> => Boolean(file)),
    [snapshot]
  )

  const activeFile = useMemo(() => {
    if (!snapshot.activeFileId) return null
    return snapshot.byFileId[snapshot.activeFileId] ?? null
  }, [snapshot])

  const anyStreaming = useMemo(() => files.some((file) => file.isStreaming), [files])

  return {
    snapshot,
    files,
    activeFile,
    fileCount: files.length,
    hasChanges: files.length > 0,
    anyStreaming,
  }
}
