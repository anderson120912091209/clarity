import { chatService } from '../services/chat-service'
import { calculateDiff } from '../utils/diff-utils'
import { createContentWidget } from '../utils/widget-utils'
import { promptModal } from '../utils/prompt-utils'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'

export const useAIAssist = (onChange: (value: string) => void) => {
  const handleAIAssist = (editor: editor.IStandaloneCodeEditor, monacoInstance: typeof monaco, setIsStreaming: (isStreaming: boolean) => void, onChangeCallback: (value: string) => void) => {
    
    // Global shortcut for Cmd+K
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyK, async () => {
      const selection = editor.getSelection()
      const model = editor.getModel()
      if (!model || !selection) return

      const initialText = model.getValue()
      const range = new monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      )

      const oldText = model.getValueInRange(range)
      
      let userInput: string
      try {
        userInput = await promptModal(editor, monacoInstance)
      } catch (e) {
        return // User cancelled
      }

      setIsStreaming(true)

      const promptContext = selection.isEmpty() 
        ? `Inserting code at line ${selection.startLineNumber}. Context around this line:\n${getAroundContext(model, selection.startLineNumber)}`
        : `Replacing the following code block (lines ${selection.startLineNumber}-${selection.endLineNumber}):\n${oldText}\n\nOverall file context:\n${initialText}`

      try {
        const { output } = await chatService.generate(
          `User Instruction: ${userInput}\n\n${promptContext}`
        )

        let fullNewText = ''
        let oldDecorations: string[] = []
        let currentSelectionRange = range

        // Track the range where we are inserting/replacing
        let streamingRange = range

        for await (const _delta of chatService.readStream(output)) {
          const delta = _delta as any
          if (!delta) continue
          
          if (delta.error) {
            console.error('AI Stream Error:', delta.error)
            setIsStreaming(false)
            alert(`AI Error: ${delta.error}`)
            return
          }

          if (!delta.content) continue
          
          const content = delta.content
          fullNewText += content

          // Apply the new text to the streaming range
          const edit = {
            range: streamingRange,
            text: fullNewText,
            forceMoveMarkers: true
          }

          editor.executeEdits('ai-assist', [edit])

          // Update the streaming range to cover the newly inserted text
          const lines = fullNewText.split('\n')
          const endLineNumber = streamingRange.startLineNumber + lines.length - 1
          const endColumn = lines.length > 1 
              ? lines[lines.length - 1].length + 1 
              : streamingRange.startColumn + lines[lines.length - 1].length

          streamingRange = new monaco.Range(
            streamingRange.startLineNumber,
            streamingRange.startColumn,
            endLineNumber,
            endColumn
          )

          // Add streaming decorations
          const decorations: monaco.editor.IModelDeltaDecoration[] = [
            {
              range: streamingRange,
              options: {
                className: 'ai-streaming-line',
                isWholeLine: true,
              }
            },
            {
              range: new monacoInstance.Range(endLineNumber, endColumn, endLineNumber, endColumn),
              options: {
                afterContentClassName: 'ai-cursor',
              }
            }
          ]
          oldDecorations = editor.deltaDecorations(oldDecorations, decorations)
        }

        setIsStreaming(false)
        
        if (!fullNewText) {
          alert('AI returned an empty response.')
          return
        }

        // Final pass: calculate real diff to show accept/reject UI
        const { decorations: diffDecorations, currentLine: updatedLine } = calculateDiff(
          oldText, 
          fullNewText, 
          monacoInstance, 
          selection
        )

        // Clear streaming decorations and show diff decorations
        const finalDecorationIds = editor.deltaDecorations(oldDecorations, diffDecorations)

        const contentWidget = createContentWidget(
          editor,
          monacoInstance,
          selection,
          oldText,
          fullNewText,
          updatedLine,
          finalDecorationIds,
          onChangeCallback
        )
        
        editor.addContentWidget(contentWidget as any)

      } catch (error) {
        console.error('AI implementation error:', error)
        setIsStreaming(false)
        alert('Failed to generate code')
      }
    })
  }

  return { handleAIAssist }
}

const getAroundContext = (model: editor.ITextModel, line: number) => {
    const startLine = Math.max(1, line - 5)
    const endLine = Math.min(model.getLineCount(), line + 5)
    return model.getValueInRange(new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine)))
}
