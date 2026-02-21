/**
 * Checkpoint Manager
 *
 * Saves file content snapshots before each edit operation, enabling
 * undo to any step in the agent's tool-use loop. Inspired by the
 * Void editor's checkpoint system.
 */

export interface FileCheckpoint {
  filePath: string
  content: string
  timestamp: number
  stepIndex: number
  editDescription: string
}

export class CheckpointManager {
  private checkpoints: Map<string, FileCheckpoint[]> = new Map()

  saveCheckpoint(
    filePath: string,
    content: string,
    meta: { stepIndex: number; editDescription: string }
  ): void {
    const existing = this.checkpoints.get(filePath) ?? []
    existing.push({
      filePath,
      content,
      timestamp: Date.now(),
      stepIndex: meta.stepIndex,
      editDescription: meta.editDescription,
    })
    this.checkpoints.set(filePath, existing)
  }

  getCheckpoints(filePath: string): FileCheckpoint[] {
    return this.checkpoints.get(filePath) ?? []
  }

  getLastCheckpoint(filePath: string): FileCheckpoint | null {
    const checkpoints = this.checkpoints.get(filePath)
    if (!checkpoints || checkpoints.length === 0) return null
    return checkpoints[checkpoints.length - 1]
  }

  revertToCheckpoint(filePath: string, stepIndex: number): string | null {
    const checkpoints = this.checkpoints.get(filePath)
    if (!checkpoints) return null

    // Find the last checkpoint at or before the target step
    for (let i = checkpoints.length - 1; i >= 0; i--) {
      if (checkpoints[i].stepIndex <= stepIndex) {
        return checkpoints[i].content
      }
    }

    // Return the earliest checkpoint if all are after the target step
    return checkpoints.length > 0 ? checkpoints[0].content : null
  }

  getAllCheckpoints(): Map<string, FileCheckpoint[]> {
    return new Map(this.checkpoints)
  }

  getEditHistory(): FileCheckpoint[] {
    const all: FileCheckpoint[] = []
    for (const checkpoints of this.checkpoints.values()) {
      all.push(...checkpoints)
    }
    return all.sort((a, b) => a.timestamp - b.timestamp)
  }

  clear(): void {
    this.checkpoints.clear()
  }
}
