'use client'

import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import * as monaco from 'monaco-editor'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Command, CornerDownLeft, X } from 'lucide-react'

export const promptModal = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  selection: monaco.Range
) => {
  return new Promise<string>((resolve, reject) => {
    const inputContainer = document.createElement('div')
    inputContainer.style.position = 'fixed'
    inputContainer.style.zIndex = '1000'
    inputContainer.className = 'ai-prompt-container'

    const PromptContent = () => {
      const [inputValue, setInputValue] = useState('')
      const textareaRef = useRef<HTMLTextAreaElement>(null)
      const [isVisible, setIsVisible] = useState(true)

      useEffect(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, [])

      const handleSubmit = () => {
        if (!inputValue.trim()) return
        setIsVisible(false)
        setTimeout(() => {
          resolve(inputValue)
          cleanup()
        }, 200)
      }

      const handleClose = () => {
        setIsVisible(false)
        setTimeout(() => {
          cleanup()
          reject(new Error('User cancelled input'))
        }, 200)
      }

      const cleanup = () => {
        if (document.body.contains(inputContainer)) {
          document.body.removeChild(inputContainer)
        }
      }

      const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          handleSubmit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          handleClose()
        }
      }

      return (
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex glass-morphism border border-border/50 rounded-xl p-3 gap-3 flex-col shadow-2xl w-[450px]"
            >
              <div className="flex items-center gap-2 px-1 text-muted-foreground">
                <Sparkles className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                <span className="text-xs font-medium uppercase tracking-wider">AI Edit</span>
              </div>
              
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask AI to edit or generate code..."
                  className="w-full bg-transparent border-none focus-visible:ring-0 text-sm min-h-[80px] p-1 resize-none placeholder:text-muted-foreground/50"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-border/10">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 px-1">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded border border-border/50 bg-muted/50 font-mono text-[9px]">Enter</kbd>
                    <span>Submit</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded border border-border/50 bg-muted/50 font-mono text-[9px]">Esc</kbd>
                    <span>Cancel</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleClose} 
                    className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-500/20 flex gap-2"
                  >
                    <span>Generate</span>
                    <CornerDownLeft className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )
    }

    const root = ReactDOM.createRoot(inputContainer)
    root.render(<PromptContent />)

    const editorDomNode = editor.getDomNode()
    if (editorDomNode) {
      const rect = editorDomNode.getBoundingClientRect()
      const lineHeight = editor.getOption(monacoInstance.editor.EditorOption.lineHeight)
      
      // Get the position of the cursor
      const position = editor.getPosition()
      if (position) {
        const coords = editor.getScrolledVisiblePosition(position)
        if (coords) {
          let top = rect.top + coords.top + lineHeight + 10
          let left = rect.left + coords.left

          const modalHeight = 180
          const modalWidth = 450

          if (window) {
            const viewportHeight = window.innerHeight
            const viewportWidth = window.innerWidth

            if (top + modalHeight > viewportHeight) {
              top = rect.top + coords.top - modalHeight - 10
            }

            if (left + modalWidth > viewportWidth) {
              left = viewportWidth - modalWidth - 20
            }

            top = Math.max(20, Math.min(top, viewportHeight - modalHeight - 20))
            left = Math.max(20, Math.min(left, viewportWidth - modalWidth - 20))
          }

          inputContainer.style.top = `${top}px`
          inputContainer.style.left = `${left}px`
        }
      }
    }

    document.body.appendChild(inputContainer)
  })
}
