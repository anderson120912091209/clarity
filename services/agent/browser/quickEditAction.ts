/**
 * quickEditAction.ts
 * Pre-service handler for Cmd+K quick edit actions.
 * Responsible for:
 * 1. Registering keybindings
 * 2. Validating context (guard clauses)
 * 3. Capturing and normalizing user selection
 * 4. Normalizing selection payload for downstream quick-edit flow
 */

import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'

/**
 * Configuration for how to handle empty selections
 */
export type EmptySelectionBehavior = 'line' | 'block' | 'cancel'

export interface QuickEditConfig {
  emptySelectionBehavior: EmptySelectionBehavior
  normalizeToFullLines: boolean
}

export interface NormalizedSelection {
  range: monaco.Range
  text: string
  isEmpty: boolean
  lineNumbers: {
    start: number
    end: number
  }
}

/**
 * QuickEditAction - Handles the pre-processing for Cmd+K quick edits
 */
export class QuickEditAction {
  private editor: editor.IStandaloneCodeEditor
  private monacoInstance: typeof monaco
  private config: QuickEditConfig
  private disposables: monaco.IDisposable[] = []

  constructor(
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    config: Partial<QuickEditConfig> = {}
  ) {
    this.editor = editor
    this.monacoInstance = monacoInstance
    this.config = {
      emptySelectionBehavior: config.emptySelectionBehavior || 'line',
      normalizeToFullLines: config.normalizeToFullLines ?? true,
    }
  }

  /**
   * 1. Register the Keybinding/Command
   * Registers Cmd+K (or Ctrl+K on Windows/Linux) to trigger quick edit
   */
  public registerKeybinding(handler: (selection: NormalizedSelection) => void | Promise<void>): void {
    this.editor.addCommand(
      this.monacoInstance.KeyMod.CtrlCmd | this.monacoInstance.KeyCode.KeyK,
      async () => {
        try {
          await this.execute(handler)
        } catch (error) {
          console.error('[QuickEditAction] Error handling quick edit:', error)
        }
      }
    )
    // Note: addCommand returns string | null, not IDisposable
    // For now we don't track these disposables since Monaco doesn't provide a dispose method for commands
  }

  /**
   * Trigger quick edit flow programmatically using the current editor selection.
   */
  public async execute(
    handler: (selection: NormalizedSelection) => void | Promise<void>
  ): Promise<void> {
    const normalizedSelection = await this.captureAndNormalizeSelection()
    if (!normalizedSelection) return
    await handler(normalizedSelection)
  }

  /**
   * 2. Validate Context (Guard Clauses)
   * Ensures the editor is in a valid state for editing
   */
  private validateContext(): boolean {
    const model = this.editor.getModel()
    
    // Guard: No model available
    if (!model) {
      console.warn('[QuickEditAction] No editor model available')
      return false
    }

    // Guard: Editor is read-only
    if (this.editor.getOption(this.monacoInstance.editor.EditorOption.readOnly)) {
      console.warn('[QuickEditAction] Editor is read-only')
      return false
    }

    // Guard: Model is disposed
    if (model.isDisposed()) {
      console.warn('[QuickEditAction] Editor model is disposed')
      return false
    }

    return true
  }

  /**
   * 3. Capture User Selection
   * Handles both empty and non-empty selections based on configuration
   */
  private async captureAndNormalizeSelection(): Promise<NormalizedSelection | null> {
    // Validate context first
    if (!this.validateContext()) {
      return null
    }

    const model = this.editor.getModel()!
    const selection = this.editor.getSelection()

    if (!selection) {
      console.warn('[QuickEditAction] No selection available')
      return null
    }

    // Handle empty selection based on configuration
    if (selection.isEmpty()) {
      return this.handleEmptySelection(model, selection)
    }

    // Handle non-empty selection
    return this.normalizeSelection(model, selection)
  }

  /**
   * Handle empty selection based on EmptySelectionBehavior
   */
  private handleEmptySelection(
    model: editor.ITextModel,
    selection: monaco.Selection
  ): NormalizedSelection | null {
    const cursorPosition = selection.getPosition()

    switch (this.config.emptySelectionBehavior) {
      case 'line': {
        // Grab the entire line where the cursor is positioned
        const lineNumber = cursorPosition.lineNumber
        const lineContent = model.getLineContent(lineNumber)
        const lineMaxColumn = model.getLineMaxColumn(lineNumber)

        const range = new this.monacoInstance.Range(
          lineNumber,
          1,
          lineNumber,
          lineMaxColumn
        )

        return {
          range,
          text: lineContent,
          isEmpty: false, // We've expanded it to a line
          lineNumbers: {
            start: lineNumber,
            end: lineNumber,
          },
        }
      }

      case 'block': {
        // Grab the current block (e.g., function, class, etc.)
        // This is more complex and would require AST parsing
        // For now, we'll grab surrounding non-empty lines
        return this.expandToBlock(model, cursorPosition)
      }

      case 'cancel': {
        // Don't proceed if there's no selection
        console.log('[QuickEditAction] Empty selection - cancelling')
        return null
      }

      default:
        return null
    }
  }

  /**
   * Expand selection to surrounding block (simplified version)
   */
  private expandToBlock(
    model: editor.ITextModel,
    position: monaco.Position
  ): NormalizedSelection | null {
    const lineNumber = position.lineNumber
    const totalLines = model.getLineCount()

    // Find the start of the block (first non-empty line above)
    let startLine = lineNumber
    while (startLine > 1) {
      const lineContent = model.getLineContent(startLine - 1).trim()
      if (lineContent === '') break
      startLine--
    }

    // Find the end of the block (first non-empty line below)
    let endLine = lineNumber
    while (endLine < totalLines) {
      const lineContent = model.getLineContent(endLine + 1).trim()
      if (lineContent === '') break
      endLine++
    }

    const range = new this.monacoInstance.Range(
      startLine,
      1,
      endLine,
      model.getLineMaxColumn(endLine)
    )

    return {
      range,
      text: model.getValueInRange(range),
      isEmpty: false,
      lineNumbers: {
        start: startLine,
        end: endLine,
      },
    }
  }

  /**
   * 4. Normalize the Selection to Full Lines
   * Expands partial line selections to include full lines
   */
  private normalizeSelection(
    model: editor.ITextModel,
    selection: monaco.Selection
  ): NormalizedSelection {
    if (!this.config.normalizeToFullLines) {
      // Return as-is without normalization
      return {
        range: selection,
        text: model.getValueInRange(selection),
        isEmpty: selection.isEmpty(),
        lineNumbers: {
          start: selection.startLineNumber,
          end: selection.endLineNumber,
        },
      }
    }

    // Normalize to full lines
    const startLine = selection.startLineNumber
    const endLine = selection.endLineNumber
    const endLineMaxColumn = model.getLineMaxColumn(endLine)

    const normalizedRange = new this.monacoInstance.Range(
      startLine,
      1, // Start at column 1
      endLine,
      endLineMaxColumn // End at the last column of the line
    )

    return {
      range: normalizedRange,
      text: model.getValueInRange(normalizedRange),
      isEmpty: false,
      lineNumbers: {
        start: startLine,
        end: endLine,
      },
    }
  }

  /**
   * Get context around a specific line (for AI prompting)
   */
  /**
   * @deprecated Use useAIAssist hook instead - this method is kept for compatibility
   * Helper: Register Cmd+K with full quick edit flow
   */
  public registerQuickEditWithPrompt(onChange: (value: string) => void, setIsStreaming?: (val: boolean) => void): void {
    console.warn('[QuickEditAction] registerQuickEditWithPrompt is deprecated. Use useAIAssist hook instead.')
    // No-op - the useAIAssist hook now handles this with inline ViewZone UI
  }

  /**
   * Get Context Around Line (for prompts)
   */
  public getContextAroundLine(lineNumber: number, contextLines: number = 5): string {
    const model = this.editor.getModel()
    if (!model) return ''

    const startLine = Math.max(1, lineNumber - contextLines)
    const endLine = Math.min(model.getLineCount(), lineNumber + contextLines)

    const range = new this.monacoInstance.Range(
      startLine,
      1,
      endLine,
      model.getLineMaxColumn(endLine)
    )

    return model.getValueInRange(range)
  }

  /**
   * Cleanup disposables
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
  }
}
