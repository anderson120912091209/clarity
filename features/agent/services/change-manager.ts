import type { ComputedDiff } from '@/services/agent/browser/quick-edit/types'

export interface ChangeDiffSummary {
  insertions: number
  deletions: number
  edits: number
  linesAdded: number
  linesDeleted: number
  totalChangedBlocks: number
}

export interface StagedFileChange {
  fileId: string
  fileName: string
  filePath: string
  originalContent: string
  proposedContent: string
  diffs: ComputedDiff[]
  summary: ChangeDiffSummary
  firstChangedLine: number
  isStreaming: boolean
  isPreviewApplied: boolean
  sourceMessageId?: string
  updatedAt: number
}

export interface ChangeManagerSnapshot {
  byFileId: Record<string, StagedFileChange>
  sortedFileIds: string[]
  activeFileId: string | null
  version: number
}

type SnapshotListener = () => void

class ChangeManagerService {
  private listeners = new Set<SnapshotListener>()
  private snapshot: ChangeManagerSnapshot = {
    byFileId: {},
    sortedFileIds: [],
    activeFileId: null,
    version: 0,
  }

  subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): ChangeManagerSnapshot => this.snapshot

  getAllChanges = (): StagedFileChange[] =>
    this.snapshot.sortedFileIds
      .map((fileId) => this.snapshot.byFileId[fileId])
      .filter((entry): entry is StagedFileChange => Boolean(entry))

  getChange = (fileId: string): StagedFileChange | undefined => this.snapshot.byFileId[fileId]

  stageChange = (change: Omit<StagedFileChange, 'updatedAt'> & { updatedAt?: number }): void => {
    const updatedAt = change.updatedAt ?? Date.now()
    const nextEntry: StagedFileChange = { ...change, updatedAt }
    const byFileId = {
      ...this.snapshot.byFileId,
      [change.fileId]: nextEntry,
    }
    const sortedFileIds = this.sortFileIdsByUpdatedAt(byFileId)

    this.commit({
      ...this.snapshot,
      byFileId,
      sortedFileIds,
      activeFileId:
        this.snapshot.activeFileId && byFileId[this.snapshot.activeFileId]
          ? this.snapshot.activeFileId
          : sortedFileIds[0] ?? null,
    })
  }

  stageChanges = (changes: Array<Omit<StagedFileChange, 'updatedAt'> & { updatedAt?: number }>): void => {
    if (!changes.length) return
    const byFileId = { ...this.snapshot.byFileId }

    for (const change of changes) {
      const updatedAt = change.updatedAt ?? Date.now()
      byFileId[change.fileId] = { ...change, updatedAt }
    }

    const sortedFileIds = this.sortFileIdsByUpdatedAt(byFileId)
    this.commit({
      ...this.snapshot,
      byFileId,
      sortedFileIds,
      activeFileId:
        this.snapshot.activeFileId && byFileId[this.snapshot.activeFileId]
          ? this.snapshot.activeFileId
          : sortedFileIds[0] ?? null,
    })
  }

  updateChange = (
    fileId: string,
    patch: Partial<Omit<StagedFileChange, 'fileId' | 'updatedAt'>>
  ): void => {
    const current = this.snapshot.byFileId[fileId]
    if (!current) return

    const next: StagedFileChange = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    }

    const byFileId = {
      ...this.snapshot.byFileId,
      [fileId]: next,
    }

    this.commit({
      ...this.snapshot,
      byFileId,
      sortedFileIds: this.sortFileIdsByUpdatedAt(byFileId),
    })
  }

  removeChange = (fileId: string): void => {
    if (!this.snapshot.byFileId[fileId]) return

    const byFileId = { ...this.snapshot.byFileId }
    delete byFileId[fileId]
    const sortedFileIds = this.snapshot.sortedFileIds.filter((id) => id !== fileId)

    this.commit({
      ...this.snapshot,
      byFileId,
      sortedFileIds,
      activeFileId:
        this.snapshot.activeFileId === fileId ? sortedFileIds[0] ?? null : this.snapshot.activeFileId,
    })
  }

  clear = (): void => {
    if (!this.snapshot.sortedFileIds.length) return
    this.commit({
      ...this.snapshot,
      byFileId: {},
      sortedFileIds: [],
      activeFileId: null,
    })
  }

  setActiveFile = (fileId: string | null): void => {
    if (fileId && !this.snapshot.byFileId[fileId]) return
    if (this.snapshot.activeFileId === fileId) return
    this.commit({
      ...this.snapshot,
      activeFileId: fileId,
    })
  }

  private sortFileIdsByUpdatedAt(byFileId: Record<string, StagedFileChange>): string[] {
    return Object.values(byFileId)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map((entry) => entry.fileId)
  }

  private commit(nextSnapshot: ChangeManagerSnapshot): void {
    this.snapshot = {
      ...nextSnapshot,
      version: this.snapshot.version + 1,
    }
    this.listeners.forEach((listener) => listener())
  }
}

export const changeManagerService = new ChangeManagerService()
