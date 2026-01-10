import * as monaco from 'monaco-editor'

export const calculateDiff = (
  oldText: string,
  newText: string,
  monacoInstance: typeof monaco,
  selection: monaco.Range
) => {
  const newLines = newText.split('\n')
  const decorations: monaco.editor.IModelDeltaDecoration[] = []
  
  const startLine = selection.startLineNumber
  const endLine = startLine + newLines.length - 1

  // For now, we just highlight the entire new range as "added"
  // In a more complex implementation, we'd do a line-by-line diff
  for (let i = startLine; i <= endLine; i++) {
    decorations.push({
      range: new monacoInstance.Range(i, 1, i, 1),
      options: { 
        isWholeLine: true, 
        className: 'diff-new-content',
        linesDecorationsClassName: 'diff-new-line-decoration'
      },
    })
  }

  return { 
    decorations, 
    currentLine: endLine + 1 
  }
}
