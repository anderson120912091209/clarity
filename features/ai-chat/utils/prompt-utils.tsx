'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import * as monaco from 'monaco-editor'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

export const promptModal = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco
) => {
  return new Promise<string>((resolve, reject) => {
    // Create container if it doesn't exist
    let inputContainer = document.getElementById('ai-prompt-modal-root')
    if (!inputContainer) {
      inputContainer = document.createElement('div')
      inputContainer.id = 'ai-prompt-modal-root'
      inputContainer.style.position = 'fixed'
      inputContainer.style.zIndex = '1000'
      inputContainer.style.pointerEvents = 'none' // Allow clicks through container wrapper
      inputContainer.className = 'ai-prompt-container inset-0 flex items-start justify-center'
      document.body.appendChild(inputContainer)
    }

    const PromptContent = () => {
      const [inputValue, setInputValue] = useState('')
      const textareaRef = useRef<HTMLTextAreaElement>(null)
      const [isVisible, setIsVisible] = useState(true)

      useEffect(() => {
        // slight delay to ensure render complete
        const timer = setTimeout(() => {
           if (textareaRef.current) {
            textareaRef.current.focus()
          }
        }, 10)
        return () => clearTimeout(timer)
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
        if (root && inputContainer) {
           root.unmount()
           if (document.body.contains(inputContainer)) {
             document.body.removeChild(inputContainer)
           }
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

      // Calculate position
      const getPositionStyle = () => {
        const editorDomNode = editor.getDomNode()
        if (!editorDomNode) return { top: '20%', left: '50%', transform: 'translateX(-50%)' }

        const rect = editorDomNode.getBoundingClientRect()
        const position = editor.getPosition()
        
        if (position) {
          const coords = editor.getScrolledVisiblePosition(position)
          if (coords) {
             // Position near cursor but ensure it fits
             let top = rect.top + coords.top + 20
             let left = rect.left + coords.left

             // Adjustments to keep in viewport
             const modalWidth = 500
             if (left + modalWidth > window.innerWidth) left = window.innerWidth - modalWidth - 20
             if (top + 100 > window.innerHeight) top = rect.top + coords.top - 120 // flip up if too low

             return { 
                top: Math.max(20, top), 
                left: Math.max(20, left) 
             }
          }
        }
        return { top: '20%', left: '50%', transform: 'translateX(-50%)' }
      }

      const style = getPositionStyle()

      return (
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }} // smooth easeOutQuint-ish
              style={{
                 position: 'fixed',
                 ...style,
                 pointerEvents: 'auto'
              }}
              className="flex flex-col w-[500px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 ring-1 ring-white/5"
            >
              {/* Magic Gradient Border Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 opacity-50 pointer-events-none" />
              
              <div className="relative z-10">
                 {/* Input Area */}
                <div className="flex flex-col p-1">
                   <Textarea
                    ref={textareaRef}
                    placeholder="Describe your edit..."
                    className="w-full min-h-[44px] max-h-[200px] bg-transparent border-none focus-visible:ring-0 text-sm px-3 py-2.5 resize-none placeholder:text-zinc-500 text-zinc-100 placeholder:font-normal leading-relaxed"
                    value={inputValue}
                    onChange={(e) => {
                       setInputValue(e.target.value)
                       // Auto resize
                       e.target.style.height = 'auto'
                       e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
                    }}
                    onKeyDown={handleKeyDown}
                  />
                  
                  {/* Footer / Actions */}
                  <div className="flex justify-between items-center px-2 pb-2 mt-1">
                    <div className="flex items-center gap-2">
                       <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-medium text-blue-400 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Edit</span>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {inputValue.trim() && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-white/5 text-[10px] text-zinc-400">
                             <span>generate</span>
                             <kbd className="font-sans px-1 py-0.5 bg-zinc-800 rounded text-zinc-300 min-w-[1.2em] text-center">⏎</kbd>
                          </div>
                       )}
                       <Button 
                         size="icon" 
                         variant="ghost"
                         onClick={handleClose} 
                         className="h-6 w-6 rounded-full hover:bg-white/10 text-zinc-500 transition-colors"
                       >
                         <X className="h-3.5 w-3.5" />
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )
    }

    const root = ReactDOM.createRoot(inputContainer)
    root.render(<PromptContent />)
  })
}
