import * as monaco from 'monaco-editor'
import type { ComputedDiff } from '../quick-edit/types'
import { EventEmitter } from 'events'

// Types for History Items
export type AIWidgetSnapshot = {
  diffs: ComputedDiff[]
  // We can add more widget state here if needed (e.g. specific open/closed states)
  // For now, restoring diffs is enough to recreate the red/green highlights and buttons
}

export type HistoryItem =
  | { type: 'monaco'; label?: string } // Native edit, we just trigger native undo
  | {
      type: 'ai_state'
      label: string
      snapshot: {
        text: string // The full text content at this point
        versionId: number // Monaco model version ID
        aiState: AIWidgetSnapshot | null // null means "clean state" (after accept/reject)
      }
    }

export class UndoRedoStack {
  private undoStack: HistoryItem[] = []
  private redoStack: HistoryItem[] = []

  public push(item: HistoryItem) {
    this.undoStack.push(item)
    this.redoStack = [] // Clear redo stack on new action
  }

  public popUndo(): HistoryItem | undefined {
    const item = this.undoStack.pop()
    if (item) {
      this.redoStack.push(item)
    }
    return item
  }

  public popRedo(): HistoryItem | undefined {
    const item = this.redoStack.pop()
    if (item) {
      this.undoStack.push(item)
    }
    return item
  }
  
  public peekUndo(): HistoryItem | undefined {
    return this.undoStack[this.undoStack.length - 1]
  }

  public clear() {
    this.undoStack = []
    this.redoStack = []
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0
  }
}



export class HistoryService extends EventEmitter {
  private stacks: Map<string, UndoRedoStack> = new Map()

  // ... (rest of class)

  public async undo(uri: string, editor: monaco.editor.IStandaloneCodeEditor) {
    const stack = this.getStack(uri)
    if (!stack.canUndo) return

    const item = stack.popUndo()
    if (!item) return

    if (item.type === 'monaco') {
      editor.trigger('keyboard', 'undo', null)
    } else if (item.type === 'ai_state') {
       // 1. Restore Text
       const model = editor.getModel()
       if (model && item.snapshot.text !== model.getValue()) {
           // We use pushEditOperations to avoid destroying the undo stack? 
           // No, setValue wipes the stack usually. 
           // We should use executeEdits to replace the whole range.
           const fullRange = model.getFullModelRange()
           editor.executeEdits('history-restore', [{
               range: fullRange,
               text: item.snapshot.text,
               forceMoveMarkers: true
           }])
       }
       
       // 2. Emit event to restore UI (Diffs/Widgets)
       this.emit('restore', { uri, snapshot: item.snapshot })
    }
  }

  public async redo(uri: string, editor: monaco.editor.IStandaloneCodeEditor) {
      const stack = this.getStack(uri)
      if (!stack.canRedo) return

      const item = stack.popRedo()
      if (!item) return

      if (item.type === 'monaco') {
          editor.trigger('keyboard', 'redo', null)
      } else if (item.type === 'ai_state') {
          const model = editor.getModel()
          if (model && item.snapshot.text !== model.getValue()) {
              const fullRange = model.getFullModelRange()
              editor.executeEdits('history-restore', [{
                   range: fullRange,
                   text: item.snapshot.text,
                   forceMoveMarkers: true
               }])
          }
          this.emit('restore', { uri, snapshot: item.snapshot })
      }
  }
  // ...


  private getStack(uri: string): UndoRedoStack {
    if (!this.stacks.has(uri)) {
      this.stacks.set(uri, new UndoRedoStack())
    }
    return this.stacks.get(uri)!
  }

  public push(uri: string, item: HistoryItem) {
    this.getStack(uri).push(item)
  }

  public getStackForUri(uri: string) {
    return this.getStack(uri)
  }

  public clear(uri: string) {
    this.stacks.delete(uri)
  }
}

export const historyService = new HistoryService()
