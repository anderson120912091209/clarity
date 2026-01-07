'use client'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Button } from '@/components/ui/button'
import * as monaco from 'monaco-editor'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Wand2 } from 'lucide-react'

export const createContentWidget = (
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  selection: monaco.Range,
  oldText: string,
  newText: string,
  currentLine: number,
  oldDecorations: string[]
) => {
  const widgetId = `diff-widget-${Date.now()}`
  
  return {
    getDomNode: function () {
      const container = document.createElement('div')
      const model = editor.getModel()
      if (!model) return container

      const handleReject = () => {
        editor.executeEdits('reject-changes', [
          {
            range: new monacoInstance.Range(
              selection.startLineNumber,
              1,
              currentLine - 1,
              model.getLineMaxColumn(currentLine - 1)
            ),
            text: oldText,
            forceMoveMarkers: true,
          },
        ])
        editor.deltaDecorations(oldDecorations, [])
        editor.removeContentWidget(this)
      }

      const handleApprove = () => {
        // Text is already in the editor, so we just clear everything
        editor.deltaDecorations(oldDecorations, [])
        editor.removeContentWidget(this)
      }

      const WidgetContent = () => (
        <motion.div 
          initial={{ opacity: 0, y: 5, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="flex items-center gap-2 p-1 bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-xl shadow-black/20 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-border/50">
            <Wand2 className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[11px] font-medium text-foreground/80 uppercase tracking-tight">AI Generated</span>
          </div>
          
          <div className="flex gap-1 p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleApprove}
              className="h-7 px-2.5 gap-1.5 text-[11px] font-semibold text-green-600 hover:text-green-700 hover:bg-green-500/10 dark:text-green-400 dark:hover:text-green-300"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReject}
              className="h-7 px-2.5 gap-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5" />
              Discard
            </Button>
          </div>

          <div className="flex items-center gap-2 px-3 text-[10px] text-muted-foreground/50 border-l border-border/50">
             <div className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-border/30 bg-muted/30 font-mono text-[9px]">⌘A</kbd>
                <span>Accept</span>
             </div>
          </div>
        </motion.div>
      )

      const root = ReactDOM.createRoot(container)
      root.render(<WidgetContent />)
      return container
    },
    getId: function () {
      return widgetId
    },
    getPosition: function () {
      return {
        position: {
          lineNumber: currentLine,
          column: 1,
        },
        preference: [monacoInstance.editor.ContentWidgetPositionPreference.BELOW],
      }
    },
  }
}
