import type { FileActionType } from '@/services/agent/browser/chat/chatService'

export interface PendingFileAction {
  id: string
  actionType: FileActionType
  filePath: string
  fileId?: string
  content?: string
  description?: string
  reason?: string
  sourceMessageId?: string
  createdAt: number
}

export interface FileActionManagerSnapshot {
  actions: PendingFileAction[]
  version: number
}

type SnapshotListener = () => void

class FileActionManagerService {
  private listeners = new Set<SnapshotListener>()
  private snapshot: FileActionManagerSnapshot = {
    actions: [],
    version: 0,
  }

  subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): FileActionManagerSnapshot => this.snapshot

  getAllActions = (): PendingFileAction[] => [...this.snapshot.actions]

  getActionsByMessageId = (messageId: string): PendingFileAction[] =>
    this.snapshot.actions.filter((a) => a.sourceMessageId === messageId)

  stageAction = (
    action: Omit<PendingFileAction, 'id' | 'createdAt'>
  ): void => {
    const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newAction: PendingFileAction = {
      ...action,
      id,
      createdAt: Date.now(),
    }
    this.commit({
      ...this.snapshot,
      actions: [...this.snapshot.actions, newAction],
    })
  }

  acceptAction = (actionId: string): PendingFileAction | null => {
    const action = this.snapshot.actions.find((a) => a.id === actionId)
    if (!action) return null

    this.commit({
      ...this.snapshot,
      actions: this.snapshot.actions.filter((a) => a.id !== actionId),
    })

    return action
  }

  rejectAction = (actionId: string): void => {
    if (!this.snapshot.actions.some((a) => a.id === actionId)) return
    this.commit({
      ...this.snapshot,
      actions: this.snapshot.actions.filter((a) => a.id !== actionId),
    })
  }

  clear = (): void => {
    if (this.snapshot.actions.length === 0) return
    this.commit({
      ...this.snapshot,
      actions: [],
    })
  }

  private commit(nextSnapshot: FileActionManagerSnapshot): void {
    this.snapshot = {
      ...nextSnapshot,
      version: this.snapshot.version + 1,
    }
    this.listeners.forEach((listener) => listener())
  }
}

export const fileActionManagerService = new FileActionManagerService()
