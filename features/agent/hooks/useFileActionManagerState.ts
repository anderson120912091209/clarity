import { useMemo, useSyncExternalStore } from 'react'
import { fileActionManagerService } from '@/features/agent/services/file-action-manager'

export function useFileActionManagerState() {
  const snapshot = useSyncExternalStore(
    fileActionManagerService.subscribe,
    fileActionManagerService.getSnapshot,
    fileActionManagerService.getSnapshot
  )

  const actions = useMemo(() => [...snapshot.actions], [snapshot])

  return {
    snapshot,
    actions,
    actionCount: actions.length,
    hasActions: actions.length > 0,
  }
}
