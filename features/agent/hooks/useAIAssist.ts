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
import { historyService } from '../../../services/agent/browser/history/historyService'
import { QUICK_EDIT_GEMINI_MODEL_OPTIONS } from '@/lib/constants/gemini-models'

// CSS will be imported at app level
// import '../../../styles/agent/quick-edit.css'

const QUICK_EDIT_INPUT_VISIBILITY_EVENT = 'editor.quick-edit-input-visibility'

function emitQuickEditInputVisibility(open: boolean) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(QUICK_EDIT_INPUT_VISIBILITY_EVENT, {
      detail: { open },
    })
  )
}

export interface UseAIAssistReturn {
  isActive: boolean
  handleAIAssist: (
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    setIsStreaming: (val: boolean) => void,
    onChange: (value: string) => void
  ) => () => void
  triggerQuickEdit: () => void
}

/**
 * Hook that provides AI-powered code editing capabilities (Cmd+K).
 * Manages the lifecycle of the inline quick edit UI, including Monaco ViewZones, decorations, and widgets.
 */
export function useAIAssist(onChange?: (value: string) => void): UseAIAssistReturn {
  const activeZoneRef = useRef<{
    viewZoneId: string
    domNode: HTMLElement
    root: Root
    abortController: AbortController
    decorationIds: string[]
    widgets: { widget: editor.IContentWidget, root: Root }[]
    listeners?: monaco.IDisposable[]
  } | null>(null)
  const quickEditActionRef = useRef<QuickEditAction | null>(null)
  const quickEditHandlerRef = useRef<((selection: NormalizedSelection) => void | Promise<void>) | null>(null)

  const triggerQuickEdit = useCallback(() => {
    const quickEditAction = quickEditActionRef.current
    const quickEditHandler = quickEditHandlerRef.current
    if (!quickEditAction || !quickEditHandler) {
      console.warn('[useAIAssist] Quick edit action is not ready')
      return
    }

    void quickEditAction.execute(quickEditHandler).catch((error) => {
      console.error('[useAIAssist] Error triggering quick edit:', error)
    })
  }, [])

  const handleAIAssist = useCallback((
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    setIsStreaming: (val: boolean) => void,
    onChangeCallback: (value: string) => void
  ) => {
    // Create QuickEditAction for keybinding registration
    const quickEditAction = new QuickEditAction(editor, monacoInstance)
    quickEditActionRef.current = quickEditAction

    // Register Cmd+K with our custom inline flow
    const quickEditHandler = async (selection: NormalizedSelection) => {
      // Remove existing zone if any
      if (activeZoneRef.current) {
        cleanupActiveZone(editor, activeZoneRef.current)
        activeZoneRef.current = null
      }
      emitQuickEditInputVisibility(false)

      // Calculate indentation for alignment
      const model = editor.getModel()
      let indentPixels = 0
      if (model) {
        const startLine = selection.lineNumbers.start
        const column = model.getLineFirstNonWhitespaceColumn(startLine)
        const indentCol = column > 0 ? column - 1 : 0
        const fontInfo = editor.getOption(monacoInstance.editor.EditorOption.fontInfo)
        indentPixels = indentCol * fontInfo.spaceWidth
      }

      // Create the inline input UI in a ViewZone
      const zoneId = generateId('qe-zone')
      const domNode = document.createElement('div')
      domNode.className = 'qe-viewzone-container'
      
      const layoutInfo = editor.getLayoutInfo()
      // align with the code start (gutter width + indentation)
      domNode.style.paddingLeft = `${indentPixels}px`
      // allow some breathing room on the right
      domNode.style.paddingRight = '24px'
      
      let viewZoneId: string = ''
      const abortController = new AbortController()
      
      // Add selection highlight decoration
      const selectionDecoration: editor.IModelDeltaDecoration = {
        range: selection.range,
        options: {
          className: 'qe-selection-background',
          isWholeLine: true,
        }
      }
      const initialDecorations = editor.deltaDecorations([], [selectionDecoration])
      
      // Create React root for the input component
      const root = createRoot(domNode)
      
      // Store zone info for cleanup
      activeZoneRef.current = {
        viewZoneId: '', // Will be set after addZone
        domNode,
        root,
        abortController,
        decorationIds: initialDecorations, // Store initial decoration
        widgets: [],
        listeners: [],
      }
      emitQuickEditInputVisibility(true)
      
      // Handle submit - stream AI response
      const handleSubmit = async (instructions: string, modelId: string) => {
        setIsStreaming(true)

        let suspendUri: string | null = null

        try {
          const model = editor.getModel()
          if (!model) throw new Error('No editor model')
          suspendUri = model.uri.toString()
          historyService.suspend(suspendUri)
          
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
            model: modelId,
          })
          
          let fullResponse = ''
          let lastExtractedCode = ''
          let currentLine = selection.lineNumbers.start
          let currentCol = 1
          let isFirstWrite = true
          let decorationIds: string[] = activeZoneRef.current?.decorationIds || [] 
          
          
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
                
                if (isFirstWrite) {
                  // On first write, we REPLACE the entire original selection
                  // This ensures the old code doesn't stay "pushed down"
                  const endLine = selection.lineNumbers.end
                  const endCol = model.getLineMaxColumn(endLine)
                  const replaceRange = new monacoInstance.Range(
                    selection.lineNumbers.start,
                    1,
                    endLine,
                    endCol
                  )
                  
                  editor.executeEdits('ai-stream', [{
                    range: replaceRange,
                    text: newContent,
                    forceMoveMarkers: true,
                  }])
                  
                  isFirstWrite = false
                  
                  // Update cursor position from the START of the new block
                  currentLine = selection.lineNumbers.start
                  const newlines = newContent.split('\n').length - 1
                  currentLine += newlines
                  currentCol = newlines > 0 
                    ? newContent.length - newContent.lastIndexOf('\n')
                    : 1 + newContent.length
                    
                } else {
                  // Subsequent writes APPEND to the current position
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
                }
              
              // Update streaming decorations
              removeDecorations(editor, decorationIds)
              decorationIds = addStreamingDecorations(
                editor, 
                monacoInstance, 
                currentLine, 
                currentCol, 
                currentLine + 5
              )
              
              if (activeZoneRef.current) {
                activeZoneRef.current.decorationIds = decorationIds
              }
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
                  const uri = model.uri.toString()
                  historyService.suspend(uri)
                  try {
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
                  } finally {
                    historyService.resume(uri)
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
          
          // Push snapshot (AI Applied state)
          if (editor.getModel()) {
             historyService.push(editor.getModel()!.uri.toString(), {
                type: 'ai_state',
                label: 'AI Generation',
                snapshot: {
                    text: editor.getValue(),
                    versionId: editor.getModel()!.getVersionId(),
                    aiState: { diffs }
                }
             })
          }
          
          // Cleanup the input zone (keep diffs visible)
          cleanupInputZone(editor, viewZoneId, root)
          emitQuickEditInputVisibility(false)
          
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
          emitQuickEditInputVisibility(false)
        } finally {
          if (suspendUri) {
            historyService.resume(suspendUri)
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
        emitQuickEditInputVisibility(false)
      }
      
      // Store zone object for height updates
      let viewZone: editor.IViewZone | null = null;

      // ... (inside handleHeightChange) ...
      // Height change handler for ViewZone resizing
      const handleHeightChange = (height: number) => {
        if (!viewZone) return
        
        // Update the zone height logic
        // We add some buffer to prevent scrollbar flickering or tight fits
        const newHeight = Math.max(height, 80)
        
        if (viewZone.heightInPx !== newHeight) {
          viewZone.heightInPx = newHeight
          editor.changeViewZones(accessor => {
            if (viewZoneId) {
              accessor.layoutZone(viewZoneId)
            }
          })
        }
      }
      
      // Render React component
      root.render(
        React.createElement(QuickEditContainer, {
          diffZoneId: zoneId,
          onSubmit: handleSubmit,
          onCancel: handleCancel,
          onHeightChange: handleHeightChange,
          initialModelId: 'auto',
          modelOptions: QUICK_EDIT_GEMINI_MODEL_OPTIONS,
          placeholder: 'Describe the change you want...',
        })
      )
      
      // Auto-cancel on cursor change (user clicked away)
      const selectionListener = editor.onDidChangeCursorSelection((e) => {
          // If the change came from user interaction (mouse/keyboard), cancel the input
          if (e.source === 'mouse' || e.source === 'keyboard') {
             handleCancel()
          }
      })

      activeZoneRef.current?.listeners?.push(selectionListener)

      // Add ViewZone to editor
      editor.changeViewZones(accessor => {
        const zone: editor.IViewZone = {
          afterLineNumber: selection.lineNumbers.start - 1,
          heightInPx: 80, // Initial height, will be adjusted
          domNode,
          suppressMouseDown: false,
        }
        viewZoneId = accessor.addZone(zone)
        viewZone = zone // Capture ref
        
        if (activeZoneRef.current) {
          activeZoneRef.current.viewZoneId = viewZoneId
        }
      })
      
      // Focus the input
      setTimeout(() => {
        const input = domNode.querySelector('textarea')
        input?.focus()
      }, 100)
    }

    quickEditHandlerRef.current = quickEditHandler
    quickEditAction.registerKeybinding(quickEditHandler)
    
    // Listen for History Rewind events
    const restoreListener = ({ uri, snapshot }: { uri: string, snapshot: any }) => {
        // Verify this event is for the current editor
        const currentModel = editor.getModel()
        if (currentModel && currentModel.uri.toString() === uri) {
            // Restore Diffs and Widgets
            // 1. Clear existing
            cleanupActiveZone(editor, activeZoneRef.current!) 
            activeZoneRef.current = null

            // 2. Re-apply diffs if they exist
            if (snapshot.aiState && snapshot.aiState.diffs && snapshot.aiState.diffs.length > 0) {
                 const diffs = snapshot.aiState.diffs
                 const newDecorationIds: string[] = []
                 const newWidgets: { widget: editor.IContentWidget, root: Root }[] = []
                 
                  for (const diff of diffs) {
                    const ids = addDiffDecorations(editor, monacoInstance, diff)
                    newDecorationIds.push(...ids)
                    
                    let deletedViewZoneId: string | null = null
                    if (diff.type === 'deletion' || diff.type === 'edit') {
                       deletedViewZoneId = addDeletedLinesViewZone(editor, diff, diff.startLine - 1)
                    }

                    const { widget, root: widgetRoot } = createAcceptRejectWidget(
                        editor,
                        monacoInstance,
                        diff,
                        async () => {
                             // ON ACCEPT
                             // 1. Clear UI
                             editor.deltaDecorations(ids, [])
                             if (deletedViewZoneId) {
                                editor.changeViewZones(accessor => accessor.removeZone(deletedViewZoneId!))
                             }
                             widgetRoot.unmount()
                             editor.removeContentWidget(widget)
                             
                             // 2. Push new snapshot (Accepted state)
                             historyService.push(uri, {
                                type: 'ai_state',
                                label: 'Accept AI',
                                snapshot: {
                                    text: editor.getValue(),
                                    versionId: editor.getModel()!.getVersionId(),
                                    aiState: null // Clean
                                }
                             })
                        },
                        async () => {
                             // ON REJECT
                             // 1. Revert Text
                             const model = editor.getModel()
                             if (model) {
                               const uri = model.uri.toString()
                               historyService.suspend(uri)
                               try {
                                const range = new monacoInstance.Range(
                                    diff.startLine,
                                    1,
                                    diff.endLine,
                                    model.getLineMaxColumn(diff.endLine)
                                )
                                
                                // Logic from main handleAIAssist onReject
                                if (diff.type === 'deletion') {
                                     editor.executeEdits('ai-reject', [{
                                        range: new monacoInstance.Range(diff.startLine, 1, diff.startLine, 1),
                                        text: diff.originalCode + '\n',
                                        forceMoveMarkers: true
                                     }])
                                } else {
                                     editor.executeEdits('ai-reject', [{
                                        range,
                                        text: diff.type === 'insertion' ? '' : diff.originalCode,
                                        forceMoveMarkers: true
                                     }])
                                }
                               } finally {
                                 historyService.resume(uri)
                               }
                             }

                             // 2. Clear UI
                             editor.deltaDecorations(ids, [])
                             if (deletedViewZoneId) {
                                editor.changeViewZones(accessor => accessor.removeZone(deletedViewZoneId!))
                             }
                             widgetRoot.unmount()
                             editor.removeContentWidget(widget)
                             
                             // 3. Push new snapshot (Rejected state)
                             historyService.push(uri, {
                                type: 'ai_state',
                                label: 'Reject AI',
                                snapshot: {
                                    text: editor.getValue(), 
                                    versionId: editor.getModel()!.getVersionId(),
                                    aiState: null
                                }
                             })
                        }
                    )
                    newWidgets.push({ widget, root: widgetRoot })
                 }
                 
                 // Manually populate activeZoneRef so we can clean it up later
                 activeZoneRef.current = {
                    viewZoneId: '', // Dummy if no input zone
                    domNode: document.createElement('div'), // Dummy
                    root: { render: () => {}, unmount: () => {} } as any, // Dummy
                    abortController: new AbortController(),
                    decorationIds: newDecorationIds,
                    widgets: newWidgets
                 }
            }
        }
    }
    
    historyService.on('restore', restoreListener)

    // Return cleanup function
    return () => {
      if (quickEditActionRef.current === quickEditAction) {
        quickEditActionRef.current = null
      }
      if (quickEditHandlerRef.current === quickEditHandler) {
        quickEditHandlerRef.current = null
      }
      emitQuickEditInputVisibility(false)
      quickEditAction.dispose()
      historyService.off('restore', restoreListener)
    }
  }, [])
  
  return {
    isActive: activeZoneRef.current !== null,
    handleAIAssist,
    triggerQuickEdit,
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
    listeners?: monaco.IDisposable[]
  }
) {
  zone.abortController.abort()
  zone.root.unmount()
  removeDecorations(editor, zone.decorationIds)
  
  // Dispose listeners
  zone.listeners?.forEach(l => l.dispose())

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
