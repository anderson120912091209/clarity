/**
 * Math Preview Extension for Monaco Editor
 * Shows rendered math preview when cursor is inside a math expression
 * Similar to Overleaf's math preview feature
 */

import * as monaco from 'monaco-editor'
import {
  getMathAtCursor,
  extractCommandDefinitions,
  extractEnvironmentDefinitions,
  MathExpression,
} from '../utils/math-detection'
import { renderMathToSVG } from '../utils/mathjax-loader'

const HIDE_TOOLTIP_EVENT = 'editor:hideMathTooltip'

interface MathPreviewState {
  widget: monaco.editor.IContentWidget | null
  currentMath: MathExpression | null
  hide: boolean
}

type MathPreviewLanguage = 'latex'

class MathPreviewWidget implements monaco.editor.IContentWidget {
  readonly id = 'math-preview-widget'
  readonly allowEditorOverflow = true
  private domNode: HTMLElement | null = null
  private mathContent: HTMLElement | null = null
  private currentMath: MathExpression | null = null
  private position: {
    position: monaco.Position | null
    preference: monaco.editor.ContentWidgetPositionPreference[]
  } | null = null

  getId(): string {
    return this.id
  }

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private monacoInstance: typeof monaco
  ) {}

  getDomNode(): HTMLElement {
    if (!this.domNode) {
      this.domNode = document.createElement('div')
      this.domNode.className = 'math-preview-container'
      this.domNode.style.cssText = `
        position: absolute;
        z-index: 1000;
        pointer-events: none;
      `
    }
    return this.domNode
  }

  getPosition(): {
    position: monaco.Position | null
    preference: monaco.editor.ContentWidgetPositionPreference[]
  } | null {
    return this.position
  }

  async updateMath(
    math: MathExpression | null,
    options: { language: MathPreviewLanguage; definitions?: string }
  ) {
    this.currentMath = math

    if (!math) {
      this.hide()
      return
    }

    if (!this.domNode) {
      this.getDomNode()
    }

    // Create or update math content container
    if (!this.mathContent) {
      this.mathContent = document.createElement('div')
      this.mathContent.className = 'math-preview-content'
      this.mathContent.style.cssText = `
        background: var(--math-preview-bg, hsl(var(--background)));
        border: 1px solid hsl(var(--border));
        border-radius: 4px;
        padding: 2px 5px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 12px;
        width: max-content;
        max-width: calc(100vw - 80px);
        max-height: calc(100vh - 120px);
        overflow: auto;
        opacity: 0;
        transition: opacity 0.2s;
      `
      if (this.domNode) {
        this.domNode.appendChild(this.mathContent)
      }
    }

    if (!this.mathContent) return

    // Show loading state
    this.mathContent.innerHTML = '<div style="color: hsl(var(--muted-foreground));">Rendering...</div>'
    this.mathContent.style.opacity = '1'

    try {
      const renderedElement = await renderMathToSVG(
        math.content,
        math.displayMode,
        options.definitions ?? ''
      )
      
      // Clear and append rendered math
      this.mathContent.innerHTML = ''
      this.mathContent.appendChild(renderedElement)
      const svgElement =
        renderedElement instanceof SVGElement
          ? renderedElement
          : renderedElement.querySelector('svg')

      if (svgElement instanceof SVGElement) {
        svgElement.style.display = 'block'
        svgElement.style.maxWidth = 'none'
        svgElement.style.width = 'auto'
        svgElement.style.height = 'auto'
      }
      
      // Update position
      this.updatePosition(math)
    } catch (error) {
      console.error('Failed to render math:', error)
      this.mathContent.innerHTML = '<div style="color: red;">Failed to render math</div>'
    }
  }

  private updatePosition(math: MathExpression) {
    const model = this.editor.getModel()
    if (!model || !this.domNode) return

    // Get position at the start of the math expression
    const position = new this.monacoInstance.Position(math.lineNumber, math.startColumn)
    
    // Convert to pixel coordinates
    const coords = this.editor.getScrolledVisiblePosition(position)
    if (!coords) return

    this.position = {
      position: position,
      preference: [
        this.monacoInstance.editor.ContentWidgetPositionPreference.ABOVE,
        this.monacoInstance.editor.ContentWidgetPositionPreference.BELOW,
      ],
    }

    if (this.domNode) {
      this.editor.layoutContentWidget(this)
    }
  }

  show() {
    if (this.domNode) {
      this.domNode.style.display = 'block'
    }
  }

  hide() {
    if (this.domNode) {
      this.domNode.style.display = 'none'
    }
    if (this.mathContent) {
      this.mathContent.style.opacity = '0'
    }
  }
}

export class MathPreviewExtension {
  private widget: MathPreviewWidget | null = null
  private state: MathPreviewState = {
    widget: null,
    currentMath: null,
    hide: false,
  }
  private disposables: monaco.IDisposable[] = []
  private hideListener: (() => void) | null = null

  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private monacoInstance: typeof monaco,
    private enabled: boolean = true
  ) {
    if (enabled) {
      this.initialize()
    }
  }

  private initialize() {
    // Create widget
    this.widget = new MathPreviewWidget(this.editor, this.monacoInstance)
    this.state.widget = this.widget
    this.editor.addContentWidget(this.widget)

    // Listen to cursor position changes
    const cursorChangeDisposable = this.editor.onDidChangeCursorPosition(() => {
      this.updateMathPreview()
    })

    // Listen to content changes
    const contentChangeDisposable = this.editor.onDidChangeModelContent(() => {
      this.updateMathPreview()
    })

    // Listen to hide tooltip events
    this.hideListener = () => {
      this.state.hide = true
      this.widget?.hide()
    }
    window.addEventListener(HIDE_TOOLTIP_EVENT, this.hideListener)

    this.disposables.push(cursorChangeDisposable, contentChangeDisposable)
  }

  private async updateMathPreview() {
    if (!this.enabled || this.state.hide) {
      return
    }

    const model = this.editor.getModel()
    if (!model || !this.widget) return

    const position = this.editor.getPosition()
    if (!position) return

    if (model.getLanguageId() !== 'latex') {
      this.widget.hide()
      this.state.currentMath = null
      return
    }
    const language: MathPreviewLanguage = 'latex'

    // Find math expression at cursor
    const math = getMathAtCursor(model, position, { languageId: language })

    if (math) {
      // Update widget with math
      const fullText = model.getValue()
      const commandDefs = extractCommandDefinitions(fullText)
      const envDefs = extractEnvironmentDefinitions(fullText)
      const definitions = [...commandDefs, ...envDefs].join('\n')
      await this.widget.updateMath(math, { language, definitions })

      this.widget.show()
      this.state.currentMath = math
      this.state.hide = false
    } else {
      // Hide widget if not in math
      this.widget.hide()
      this.state.currentMath = null
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (enabled && !this.widget) {
      this.initialize()
    } else if (!enabled && this.widget) {
      this.widget.hide()
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
    if (this.hideListener) {
      window.removeEventListener(HIDE_TOOLTIP_EVENT, this.hideListener)
    }
    if (this.widget) {
      this.editor.removeContentWidget(this.widget)
    }
  }
}

/**
 * Create and register math preview extension
 */
export function createMathPreview(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  enabled: boolean = true
): MathPreviewExtension {
  return new MathPreviewExtension(editor, monacoInstance, enabled)
}

/**
 * Hide math preview tooltip
 */
export function hideMathPreview() {
  window.dispatchEvent(new CustomEvent(HIDE_TOOLTIP_EVENT))
}
