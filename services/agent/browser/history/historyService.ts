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
  private suppressedUris: Map<string, number> = new Map()

  // ... (rest of class)

  public register(editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable {
    let disposed = false
    const disposables: monaco.IDisposable[] = []

    let currentUri = editor.getModel()?.uri.toString() ?? ''
    let lastAltVersionId =
      editor.getModel()?.getAlternativeVersionId() ?? 0

    const updateModelState = () => {
      const model = editor.getModel()
      currentUri = model?.uri.toString() ?? ''
      lastAltVersionId = model?.getAlternativeVersionId() ?? 0
    }

    // Track edits to align custom history with Monaco undo stops
    disposables.push(
      editor.onDidChangeModelContent((e) => {
        if (!currentUri) return
        if (this.isSuppressed(currentUri)) return
        if (e.isUndoing || e.isRedoing) return
        if (e.isFlush) {
          this.clear(currentUri)
          updateModelState()
          return
        }

        const model = editor.getModel()
        if (!model) return
        const altVersionId = model.getAlternativeVersionId()
        if (altVersionId !== lastAltVersionId) {
          lastAltVersionId = altVersionId
          this.push(currentUri, { type: 'monaco' })
        }
      })
    )

    disposables.push(
      editor.onDidChangeModel(() => {
        updateModelState()
      })
    )

    const runUndo = () => {
      if (!currentUri) {
        editor.trigger('keyboard', 'undo', null)
        return
      }
      const stack = this.getStackForUri(currentUri)
      if (stack.canUndo) {
        this.undo(currentUri, editor)
      } else {
        editor.trigger('keyboard', 'undo', null)
      }
    }

    const runRedo = () => {
      if (!currentUri) {
        editor.trigger('keyboard', 'redo', null)
        return
      }
      const stack = this.getStackForUri(currentUri)
      if (stack.canRedo) {
        this.redo(currentUri, editor)
      } else {
        editor.trigger('keyboard', 'redo', null)
      }
    }

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, runUndo)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, runUndo)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ,
      runRedo
    )
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, runRedo)

    const disposeAll = () => {
      if (disposed) return
      disposed = true
      disposables.forEach((d) => d.dispose())
    }

    disposables.push(editor.onDidDispose(disposeAll))

    return { dispose: disposeAll }
  }

  public suspend(uri: string) {
    if (!uri) return
    const count = this.suppressedUris.get(uri) ?? 0
    this.suppressedUris.set(uri, count + 1)
  }

  public resume(uri: string) {
    if (!uri) return
    const count = this.suppressedUris.get(uri) ?? 0
    if (count <= 1) {
      this.suppressedUris.delete(uri)
      return
    }
    this.suppressedUris.set(uri, count - 1)
  }

  private isSuppressed(uri: string): boolean {
    return (this.suppressedUris.get(uri) ?? 0) > 0
  }

  public async undo(uri: string, editor: monaco.editor.IStandaloneCodeEditor) {
    const stack = this.getStack(uri)
    if (!stack.canUndo) return

    const item = stack.popUndo()
    if (!item) return

    if (item.type === 'monaco') {
      editor.trigger('keyboard', 'undo', null)
    } else if (item.type === 'ai_state') {
      this.suspend(uri)
      try {
        // 1. Restore Text
        const model = editor.getModel()
        if (model && item.snapshot.text !== model.getValue()) {
          // We use pushEditOperations to avoid destroying the undo stack? 
          // No, setValue wipes the stack usually. 
          // We should use executeEdits to replace the whole range.
          const fullRange = model.getFullModelRange()
          editor.pushUndoStop()
          editor.executeEdits('history-restore', [{
            range: fullRange,
            text: item.snapshot.text,
            forceMoveMarkers: true
          }])
          editor.pushUndoStop()
        }

        // 2. Emit event to restore UI (Diffs/Widgets)
        this.emit('restore', { uri, snapshot: item.snapshot })
      } finally {
        this.resume(uri)
      }
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
        this.suspend(uri)
        try {
          const model = editor.getModel()
          if (model && item.snapshot.text !== model.getValue()) {
            const fullRange = model.getFullModelRange()
            editor.pushUndoStop()
            editor.executeEdits('history-restore', [{
              range: fullRange,
              text: item.snapshot.text,
              forceMoveMarkers: true
            }])
            editor.pushUndoStop()
          }
          this.emit('restore', { uri, snapshot: item.snapshot })
        } finally {
          this.resume(uri)
        }
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
