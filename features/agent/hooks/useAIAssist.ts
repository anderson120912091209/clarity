/**
 * useAIAssist Hook
 * 
 * Provides AI-powered code editing (Cmd+K quick edit).
 * Integrates with Monaco editor to show inline UI in ViewZones.
 */

import { useCallback, useRef } from 'react'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { QuickEditAction } from '../../../services/agent/browser/quickEditAction'
import type { NormalizedSelection } from '../../../services/agent/browser/quickEditAction'
import {
  chatService,
  ctrlKStream_systemMessage,
  ctrlKStream_userMessage,
  extractPrefixAndSuffix,
  extractCodeFromFIM,
  getLanguageFromFile,
  computeDiffs,
  addDiffDecorations,
  addDeletedLinesViewZone,
  addStreamingDecorations,
  removeDecorations,
  createAcceptRejectWidget,
  DEFAULT_FIM_TAGS,
  generateId,
} from '../../../services/agent/browser/quick-edit'

// Import React for rendering
import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import { QuickEditContainer } from '../../../services/agent/browser/react/quick-edit'

// CSS will be imported at app level
// import '../../../styles/agent/quick-edit.css'

export interface UseAIAssistReturn {
  isActive: boolean
  handleAIAssist: (
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    setIsStreaming: (val: boolean) => void,
    onChange: (value: string) => void
  ) => void
}

/**
 * Hook that provides AI-powered code editing capabilities
 */
export function useAIAssist(onChange?: (value: string) => void): UseAIAssistReturn {
  const activeZoneRef = useRef<{
    viewZoneId: string
    domNode: HTMLElement
    root: Root
    abortController: AbortController
    decorationIds: string[]
    widgets: { widget: editor.IContentWidget, root: Root }[]
  } | null>(null)

  const handleAIAssist = useCallback((
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    setIsStreaming: (val: boolean) => void,
    onChangeCallback: (value: string) => void
  ) => {
    // Create QuickEditAction for keybinding registration
    const quickEditAction = new QuickEditAction(editor, monacoInstance)

    // Register Cmd+K with our custom inline flow
    quickEditAction.registerKeybinding(async (selection: NormalizedSelection) => {
      // Remove existing zone if any
      if (activeZoneRef.current) {
        cleanupActiveZone(editor, activeZoneRef.current)
        activeZoneRef.current = null
      }

      // Create the inline input UI in a ViewZone
      const zoneId = generateId('qe-zone')
      const domNode = document.createElement('div')
      domNode.className = 'qe-viewzone-container'
      domNode.style.marginLeft = '60px' // Align with gutter
      
      let viewZoneId: string = ''
      const abortController = new AbortController()
      
      // Create React root for the input component
      const root = createRoot(domNode)
      
      // Store zone info for cleanup
      activeZoneRef.current = {
        viewZoneId: '', // Will be set after addZone
        domNode,
        root,
        abortController,
        decorationIds: [],
        widgets: [],
      }

      // Handle submit - stream AI response
      const handleSubmit = async (instructions: string) => {
        setIsStreaming(true)
        
        try {
          const model = editor.getModel()
          if (!model) throw new Error('No editor model')
          
          const fullFileText = model.getValue()
          const language = getLanguageFromFile(model.uri.path) || 'latex'
          
          // Get prefix and suffix for FIM
          const { prefix, suffix } = extractPrefixAndSuffix({
            fullFileStr: fullFileText,
            startLine: selection.lineNumbers.start,
            endLine: selection.lineNumbers.end,
          })
          
          // Build FIM messages
          const systemMessage = ctrlKStream_systemMessage(DEFAULT_FIM_TAGS)
          const userMessage = ctrlKStream_userMessage({
            selection: selection.text,
            prefix,
            suffix,
            instructions,
            fimTags: DEFAULT_FIM_TAGS,
            language,
          })
          
          // Start streaming
          const { output, requestId } = await chatService.generate({
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage },
            ],
            stream: true,
            abortSignal: abortController.signal,
          })
          
          let fullResponse = ''
          let lastExtractedCode = ''
          let currentLine = selection.lineNumbers.start
          let currentCol = 1
          let decorationIds: string[] = []
          
          // Stream loop
          for await (const delta of output) {
            if (abortController.signal.aborted) break
            if (delta.error) throw new Error(delta.error)
            if (!delta.content) continue
            
            fullResponse += delta.content
            
            // Extract code from FIM response
            const { code, isComplete } = extractCodeFromFIM({
              text: fullResponse,
              recentlyAddedTextLen: delta.content.length,
            })
            
            // Write new content to editor
            if (code && code !== lastExtractedCode) {
              const newContent = code.substring(lastExtractedCode.length)
              lastExtractedCode = code
              
              // Insert text at current position
              editor.executeEdits('ai-stream', [{
                range: new monacoInstance.Range(
                  currentLine,
                  currentCol,
                  currentLine,
                  currentCol
                ),
                text: newContent,
                forceMoveMarkers: true,
              }])
              
              // Update cursor position
              const newlines = newContent.split('\n').length - 1
              currentLine += newlines
              currentCol = newlines > 0 
                ? newContent.length - newContent.lastIndexOf('\n')
                : currentCol + newContent.length
              
              // Update streaming decorations
              removeDecorations(editor, decorationIds)
              decorationIds = addStreamingDecorations(
                editor, 
                monacoInstance, 
                currentLine, 
                currentCol, 
                currentLine + 5
              )
            }
            
            if (delta.done || isComplete) break
          }
          
          // Streaming complete - show diff
          removeDecorations(editor, decorationIds)
          setIsStreaming(false)
          
          // Compute and show diffs
          const diffs = computeDiffs(
            selection.text, 
            lastExtractedCode, 
            selection.lineNumbers.start
          )
          
          // Apply diff decorations
          const newDecorationIds: string[] = []
          const widgets: { widget: editor.IContentWidget, root: Root }[] = []
          
          for (const diff of diffs) {
            const ids = addDiffDecorations(editor, monacoInstance, diff)
            newDecorationIds.push(...ids)
            
            // Add viewzone for deleted lines
            let deletedViewZoneId: string | null = null
            if (diff.type === 'deletion' || diff.type === 'edit') {
              deletedViewZoneId = addDeletedLinesViewZone(editor, diff, diff.startLine - 1)
            }
            
            // Create accept/reject widget
            const { widget, root: widgetRoot } = createAcceptRejectWidget(
              editor,
              monacoInstance,
              diff,
              () => { // onAccept
                // Clear highlighting/red lines
                editor.deltaDecorations(ids, [])
                if (deletedViewZoneId) {
                  editor.changeViewZones(accessor => accessor.removeZone(deletedViewZoneId!))
                }
                
                // Cleanup widget
                widgetRoot.unmount()
                editor.removeContentWidget(widget)
                
                // Sync to DB/Finish
                onChangeCallback(editor.getValue())
                
                // If this is the last widget, full cleanup? 
                // For now, let's assume one main diff block or user accepts individually.
              },
              () => { // onReject
                // Revert changes
                const model = editor.getModel()
                if (model) {
                   editor.executeEdits('ai-reject', [{
                    range: new monacoInstance.Range(
                      diff.startLine,
                      1,
                      diff.endLine,
                      model.getLineMaxColumn(diff.endLine)
                    ),
                    text: diff.type === 'insertion' ? '' : (diff.type === 'edit' ? diff.originalCode : ''), // Insert->Empty, Edit->Original. Deletion is tricky logic here, simplification.
                    forceMoveMarkers: true,
                  }])
                  
                  // For deletion, we need to re-insert. computeDiffs logic:
                  // Deletion: startLine is where it WAS.
                  // Wait, if I deleted lines, the startLine in diff refers to the line currently there.
                  // If I 'rejected' a deletion, I insert originalCode at startLine.
                   if (diff.type === 'deletion') {
                        editor.executeEdits('ai-reject', [{
                        range: new monacoInstance.Range(diff.startLine, 1, diff.startLine, 1),
                        text: diff.originalCode + '\n',
                        forceMoveMarkers: true
                        }])
                   }
                }

                // Clear UI
                editor.deltaDecorations(ids, [])
                if (deletedViewZoneId) {
                  editor.changeViewZones(accessor => accessor.removeZone(deletedViewZoneId!))
                }
                widgetRoot.unmount()
                editor.removeContentWidget(widget)
              }
            )
            widgets.push({ widget, root: widgetRoot })
          }
          
          if (activeZoneRef.current) {
            activeZoneRef.current.decorationIds = newDecorationIds
            activeZoneRef.current.widgets = widgets
          }
          
          // Cleanup the input zone (keep diffs visible)
          cleanupInputZone(editor, viewZoneId, root)
          
          // Notify change
          onChangeCallback(editor.getValue())
          
        } catch (error) {
          console.error('[useAIAssist] Error:', error)
          setIsStreaming(false)
          
          // Cleanup on error
          if (activeZoneRef.current) {
            cleanupActiveZone(editor, activeZoneRef.current)
            activeZoneRef.current = null
          }
        }
      }
      
      // Handle cancel
      const handleCancel = () => {
        abortController.abort()
        if (activeZoneRef.current) {
          cleanupActiveZone(editor, activeZoneRef.current)
          activeZoneRef.current = null
        }
      }
      
      // Height change handler for ViewZone resizing
      const handleHeightChange = (height: number) => {
        editor.changeViewZones(accessor => {
          if (viewZoneId) {
            accessor.layoutZone(viewZoneId)
          }
        })
      }
      
      // Render React component
      root.render(
        React.createElement(QuickEditContainer, {
          diffZoneId: zoneId,
          onSubmit: handleSubmit,
          onCancel: handleCancel,
          onHeightChange: handleHeightChange,
          placeholder: 'Describe the change you want...',
        })
      )
      
      // Add ViewZone to editor
      editor.changeViewZones(accessor => {
        const zone: editor.IViewZone = {
          afterLineNumber: selection.lineNumbers.start - 1,
          heightInPx: 80, // Initial height, will be adjusted
          domNode,
          suppressMouseDown: false,
        }
        viewZoneId = accessor.addZone(zone)
        
        if (activeZoneRef.current) {
          activeZoneRef.current.viewZoneId = viewZoneId
        }
      })
      
      // Focus the input
      setTimeout(() => {
        const input = domNode.querySelector('textarea')
        input?.focus()
      }, 100)
    })
    
    // Return cleanup function - it's managed internally
    return () => {
      quickEditAction.dispose()
    }
  }, [])
  
  return {
    isActive: activeZoneRef.current !== null,
    handleAIAssist,
  }
}

// Cleanup helper for input zone only (keeps diffs)
function cleanupInputZone(
  editor: editor.IStandaloneCodeEditor,
  viewZoneId: string,
  root: Root
) {
  root.unmount()
  editor.changeViewZones(accessor => {
    accessor.removeZone(viewZoneId)
  })
}

// Full cleanup helper
function cleanupActiveZone(
  editor: editor.IStandaloneCodeEditor,
  zone: {
    viewZoneId: string
    domNode: HTMLElement
    root: Root
    abortController: AbortController
    decorationIds: string[]
    widgets: { widget: editor.IContentWidget, root: Root }[]
  }
) {
  zone.abortController.abort()
  zone.root.unmount()
  removeDecorations(editor, zone.decorationIds)
  // Cleanup widgets
  if (zone.widgets) {
    zone.widgets.forEach(w => {
      w.root.unmount()
      editor.removeContentWidget(w.widget)
    })
  }
  editor.changeViewZones(accessor => {
    if (zone.viewZoneId) accessor.removeZone(zone.viewZoneId)
  })
}

export default useAIAssist
