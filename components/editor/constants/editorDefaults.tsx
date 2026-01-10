import { editor } from 'monaco-editor'

export const editorDefaultOptions: editor.IStandaloneEditorConstructionOptions = {
  wordWrap: 'on',
  folding: true,
  lineNumbersMinChars: 3,
  fontSize: 14,
  fontFamily: 'var(--font-mono), Menlo, Monaco, "Courier New", monospace',
  scrollBeyondLastLine: true,
  scrollBeyondLastColumn: 5,
  automaticLayout: true,
  minimap: { enabled: false },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: {
    vertical: 'visible',
    horizontal: 'visible',
    useShadows: false,
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
  overviewRulerBorder: false,
  cursorSmoothCaretAnimation: 'on',
  cursorBlinking: 'smooth',
  cursorStyle: 'line',
  renderLineHighlight: 'all',
  fontLigatures: true,
  smoothScrolling: true,
  mouseWheelZoom: false, // Disable trackpad zoom, only allow Cmd+/Cmd- shortcuts
  contextmenu: true,
  fixedOverflowWidgets: true,
  padding: { top: 20, bottom: 20 },
}
