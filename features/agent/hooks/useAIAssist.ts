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
import type { ComputedDiff } from '../../../services/agent/browser/quick-edit/types'
import {
  chatService,
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
import { qeDebug } from '../../../services/agent/browser/quick-edit/debug'

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

type RestoreSnapshot = {
  aiState?: {
    diffs?: ComputedDiff[]
  } | null
}

type PendingDiffAction = {
  diffId: number
  startLine: number
  resolved: boolean
  accept: () => void | Promise<void>
  reject: () => void | Promise<void>
}

type ActiveZoneState = {
  viewZoneId: string
  domNode: HTMLElement
  root: Root
  abortController: AbortController
  decorationIds: string[]
  deletedViewZoneIds: string[]
  widgets: { widget: editor.IContentWidget, root: Root }[]
  pendingDiffActions: PendingDiffAction[]
  listeners?: monaco.IDisposable[]
}

/**
 * Hook that provides AI-powered code editing capabilities (Cmd+K).
 * Manages the lifecycle of the inline quick edit UI, including Monaco ViewZones, decorations, and widgets.
 */
export function useAIAssist(onChange?: (value: string) => void): UseAIAssistReturn {
  const activeZoneRef = useRef<ActiveZoneState | null>(null)
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
        deletedViewZoneIds: [],
        widgets: [],
        pendingDiffActions: [],
        listeners: [],
      }
      emitQuickEditInputVisibility(true)
      
      // Handle submit - stream AI response
      const handleSubmit = async (instructions: string, modelId: string) => {
        qeDebug.log('submit', { instructions, modelId, selection: { start: selection.lineNumbers.start, end: selection.lineNumbers.end, textLen: selection.text.length } })
        setIsStreaming(true)

        let suspendUri: string | null = null

        try {
          const model = editor.getModel()
          if (!model) throw new Error('No editor model')
          suspendUri = model.uri.toString()
          historyService.suspend(suspendUri)

          const fullFileText = model.getValue()
          const language = getLanguageFromFile(model.uri.path) || 'latex'
          qeDebug.log('context', { language, fileLen: fullFileText.length, filePath: model.uri.path })

          // Get prefix and suffix for FIM
          const { prefix, suffix, secondaryContext } = extractPrefixAndSuffix({
            fullFileStr: fullFileText,
            startLine: selection.lineNumbers.start,
            endLine: selection.lineNumbers.end,
            language,
          })

          // Build FIM messages
          const userMessage = ctrlKStream_userMessage({
            selection: selection.text,
            prefix,
            suffix,
            secondaryContext,
            instructions,
            fimTags: DEFAULT_FIM_TAGS,
            language,
          })
          qeDebug.log('userMessage (first 500 chars)', userMessage.slice(0, 500))

          // Start streaming
          const { output } = await chatService.generate({
            messages: [{ role: 'user', content: userMessage }],
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
          let deltaCount = 0
          for await (const delta of output) {
            if (abortController.signal.aborted) break
            if (delta.error) {
              qeDebug.error('stream delta error', delta.error)
              throw new Error(delta.error)
            }
            if (!delta.content) continue

            deltaCount++
            fullResponse += delta.content

            // Extract code from FIM response
            const { code, isComplete } = extractCodeFromFIM({
              text: fullResponse,
              recentlyAddedTextLen: delta.content.length,
            })
            if (deltaCount <= 3) {
              qeDebug.log(`FIM extract #${deltaCount}`, { codeLen: code.length, isComplete, fullResponseLen: fullResponse.length })
            }
            
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
          qeDebug.log('stream done', { deltaCount, fullResponseLen: fullResponse.length, extractedCodeLen: lastExtractedCode.length })
          qeDebug.log('fullResponse (first 800)', fullResponse.slice(0, 800))
          qeDebug.log('extractedCode (first 400)', lastExtractedCode.slice(0, 400))

          // Store for inspection via window.__QE_LAST_STREAM
          qeDebug.storeStreamData({
            fullResponse,
            extractedCode: lastExtractedCode,
            selection: { text: selection.text, start: selection.lineNumbers.start, end: selection.lineNumbers.end },
            instructions,
            timestamp: Date.now(),
          })

          if (!lastExtractedCode) {
            qeDebug.error('NO CODE EXTRACTED from response. Expected <SELECTION>...</SELECTION> tags.', { fullResponse: fullResponse.slice(0, 2000) })
          }

          removeDecorations(editor, decorationIds)
          setIsStreaming(false)
          
          // Compute and show diffs
          const diffs = computeDiffs(
            selection.text,
            lastExtractedCode,
            selection.lineNumbers.start
          )
          qeDebug.log('diffs computed', { count: diffs.length, types: diffs.map(d => d.type) })

          // Apply diff decorations
          const newDecorationIds: string[] = []
          const deletedViewZoneIds: string[] = []
          const widgets: { widget: editor.IContentWidget, root: Root }[] = []
          const pendingDiffActions: PendingDiffAction[] = []
          
          for (const diff of diffs) {
            const ids = addDiffDecorations(editor, monacoInstance, diff)
            newDecorationIds.push(...ids)
            
            // Add viewzone for deleted lines
            let deletedViewZoneId: string | null = null
            if (diff.type === 'deletion' || diff.type === 'edit') {
              deletedViewZoneId = addDeletedLinesViewZone(editor, diff, diff.startLine - 1)
              if (deletedViewZoneId) {
                deletedViewZoneIds.push(deletedViewZoneId)
              }
            }

            const clearDeletedZone = () => {
              if (!deletedViewZoneId) return
              const zoneId = deletedViewZoneId
              editor.changeViewZones((accessor) => accessor.removeZone(zoneId))
              if (activeZoneRef.current?.deletedViewZoneIds) {
                activeZoneRef.current.deletedViewZoneIds =
                  activeZoneRef.current.deletedViewZoneIds.filter((id) => id !== zoneId)
              }
              deletedViewZoneId = null
            }
            const pendingAction: PendingDiffAction = {
              diffId: diff.diffId,
              startLine: diff.startLine,
              resolved: false,
              accept: () => {},
              reject: () => {},
            }
            let widget: editor.IContentWidget | null = null
            let widgetRoot: Root | null = null

            const unregisterPendingAction = () => {
              if (activeZoneRef.current?.pendingDiffActions) {
                activeZoneRef.current.pendingDiffActions =
                  activeZoneRef.current.pendingDiffActions.filter((item) => item !== pendingAction)
              }
            }

            const clearWidget = () => {
              if (!widget || !widgetRoot) return
              widgetRoot.unmount()
              editor.removeContentWidget(widget)
              if (activeZoneRef.current?.widgets) {
                activeZoneRef.current.widgets =
                  activeZoneRef.current.widgets.filter((item) => item.widget !== widget)
              }
              widget = null
              widgetRoot = null
            }

            const markResolved = () => {
              if (pendingAction.resolved) return false
              pendingAction.resolved = true
              unregisterPendingAction()
              return true
            }

            const acceptDiff = () => {
              if (!markResolved()) return

              // Clear highlighting/red lines
              editor.deltaDecorations(ids, [])
              clearDeletedZone()
              clearWidget()

              // Sync to DB/Finish
              onChangeCallback(editor.getValue())
            }

            const rejectDiff = () => {
              if (!markResolved()) return

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
              clearDeletedZone()
              clearWidget()
            }

            const widgetResult = createAcceptRejectWidget(
              editor,
              monacoInstance,
              diff,
              acceptDiff,
              rejectDiff
            )
            widget = widgetResult.widget
            widgetRoot = widgetResult.root
            pendingAction.accept = acceptDiff
            pendingAction.reject = rejectDiff
            widgets.push({ widget, root: widgetRoot })
            pendingDiffActions.push(pendingAction)
          }
          
          if (activeZoneRef.current) {
            activeZoneRef.current.decorationIds = newDecorationIds
            activeZoneRef.current.deletedViewZoneIds = deletedViewZoneIds
            activeZoneRef.current.widgets = widgets
            activeZoneRef.current.pendingDiffActions = pendingDiffActions
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
          qeDebug.error('handleSubmit failed', error)
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
      
      // Add ViewZone to editor
      editor.changeViewZones(accessor => {
        const zone: editor.IViewZone = {
          afterLineNumber: selection.lineNumbers.start - 1,
          heightInPx: 80, // Initial height, will be adjusted
          domNode,
          // Must be true so clicks inside the textarea/buttons don't propagate
          // to Monaco's mouse handler (which would change cursor and auto-cancel).
          suppressMouseDown: true,
        }
        viewZoneId = accessor.addZone(zone)
        viewZone = zone // Capture ref

        if (activeZoneRef.current) {
          activeZoneRef.current.viewZoneId = viewZoneId
        }
      })

      // Auto-cancel when the user clicks outside the ViewZone in the editor.
      // We use onDidChangeCursorSelection, but only cancel for mouse events
      // that originate outside our ViewZone DOM node.
      const selectionListener = editor.onDidChangeCursorSelection((e) => {
          if (e.source !== 'mouse') return
          // If the click target was inside our ViewZone, don't cancel.
          const activeEl = document.activeElement
          if (activeEl && domNode.contains(activeEl)) return
          handleCancel()
      })

      activeZoneRef.current?.listeners?.push(selectionListener)
      
      // Focus the input
      setTimeout(() => {
        const input = domNode.querySelector('textarea')
        input?.focus()
      }, 100)
    }

    quickEditHandlerRef.current = quickEditHandler
    quickEditAction.registerKeybinding(quickEditHandler)

    const runPendingDiffShortcut = (action: 'accept' | 'reject'): boolean => {
      const pendingActions =
        activeZoneRef.current?.pendingDiffActions?.filter((item) => !item.resolved) ?? []
      if (pendingActions.length === 0) return false

      const orderedActions =
        action === 'reject'
          ? [...pendingActions].sort((a, b) => b.startLine - a.startLine)
          : [...pendingActions].sort((a, b) => a.startLine - b.startLine)

      orderedActions.forEach((pendingAction) => {
        if (pendingAction.resolved) return
        if (action === 'accept') {
          void pendingAction.accept()
          return
        }
        void pendingAction.reject()
      })

      return true
    }

    const handlePendingDiffShortcut = (event: KeyboardEvent) => {
      const isPrimaryModifier = event.metaKey || event.ctrlKey
      if (!isPrimaryModifier || event.altKey || event.shiftKey) return

      const key = event.key.toLowerCase()
      if (key !== 'n' && key !== 'y') return

      const editorDomNode = editor.getDomNode()
      const targetNode = event.target instanceof Node ? event.target : null
      const isTargetInsideEditor = !!(editorDomNode && targetNode && editorDomNode.contains(targetNode))
      if (!editor.hasTextFocus() && !isTargetInsideEditor) return

      const didHandle = key === 'n'
        ? runPendingDiffShortcut('reject')
        : runPendingDiffShortcut('accept')

      if (!didHandle) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handlePendingDiffShortcut, true)
    }
    
    // Listen for History Rewind events
    const restoreListener = ({ uri, snapshot }: { uri: string, snapshot: RestoreSnapshot }) => {
        // Verify this event is for the current editor
        const currentModel = editor.getModel()
        if (currentModel && currentModel.uri.toString() === uri) {
            // Restore Diffs and Widgets
            // 1. Clear existing
            cleanupActiveZone(editor, activeZoneRef.current)
            activeZoneRef.current = null

            // 2. Re-apply diffs if they exist
            if (snapshot.aiState && snapshot.aiState.diffs && snapshot.aiState.diffs.length > 0) {
                 const diffs = snapshot.aiState.diffs
                 const newDecorationIds: string[] = []
                 const restoredDeletedViewZoneIds: string[] = []
                 const newWidgets: { widget: editor.IContentWidget, root: Root }[] = []
                 const restoredPendingDiffActions: PendingDiffAction[] = []
                 
                  for (const diff of diffs) {
                    const ids = addDiffDecorations(editor, monacoInstance, diff)
                    newDecorationIds.push(...ids)
                    
                    let deletedViewZoneId: string | null = null
                    if (diff.type === 'deletion' || diff.type === 'edit') {
                       deletedViewZoneId = addDeletedLinesViewZone(editor, diff, diff.startLine - 1)
                       if (deletedViewZoneId) {
                         restoredDeletedViewZoneIds.push(deletedViewZoneId)
                       }
                    }

                    const clearDeletedZone = () => {
                      if (!deletedViewZoneId) return
                      const zoneId = deletedViewZoneId
                      editor.changeViewZones((accessor) => accessor.removeZone(zoneId))
                      if (activeZoneRef.current?.deletedViewZoneIds) {
                        activeZoneRef.current.deletedViewZoneIds =
                          activeZoneRef.current.deletedViewZoneIds.filter((id) => id !== zoneId)
                      }
                      deletedViewZoneId = null
                    }
                    const pendingAction: PendingDiffAction = {
                      diffId: diff.diffId,
                      startLine: diff.startLine,
                      resolved: false,
                      accept: () => {},
                      reject: () => {},
                    }
                    let widget: editor.IContentWidget | null = null
                    let widgetRoot: Root | null = null

                    const unregisterPendingAction = () => {
                      if (activeZoneRef.current?.pendingDiffActions) {
                        activeZoneRef.current.pendingDiffActions =
                          activeZoneRef.current.pendingDiffActions.filter((item) => item !== pendingAction)
                      }
                    }

                    const clearWidget = () => {
                      if (!widget || !widgetRoot) return
                      widgetRoot.unmount()
                      editor.removeContentWidget(widget)
                      if (activeZoneRef.current?.widgets) {
                        activeZoneRef.current.widgets =
                          activeZoneRef.current.widgets.filter((item) => item.widget !== widget)
                      }
                      widget = null
                      widgetRoot = null
                    }

                    const markResolved = () => {
                      if (pendingAction.resolved) return false
                      pendingAction.resolved = true
                      unregisterPendingAction()
                      return true
                    }

                    const acceptDiff = async () => {
                      if (!markResolved()) return

                      // ON ACCEPT
                      // 1. Clear UI
                      editor.deltaDecorations(ids, [])
                      clearDeletedZone()
                      clearWidget()

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
                    }

                    const rejectDiff = async () => {
                      if (!markResolved()) return

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
                      clearDeletedZone()
                      clearWidget()

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

                    const widgetResult = createAcceptRejectWidget(
                      editor,
                      monacoInstance,
                      diff,
                      acceptDiff,
                      rejectDiff
                    )
                    widget = widgetResult.widget
                    widgetRoot = widgetResult.root
                    pendingAction.accept = acceptDiff
                    pendingAction.reject = rejectDiff
                    newWidgets.push({ widget, root: widgetRoot })
                    restoredPendingDiffActions.push(pendingAction)
                 }
                 
                 // Manually populate activeZoneRef so we can clean it up later
                 const noopRoot: Root = {
                   render: (children: React.ReactNode) => {
                     void children
                   },
                   unmount: () => {},
                 }
                 activeZoneRef.current = {
                    viewZoneId: '', // Dummy if no input zone
                    domNode: document.createElement('div'), // Dummy
                    root: noopRoot,
                    abortController: new AbortController(),
                    decorationIds: newDecorationIds,
                    deletedViewZoneIds: restoredDeletedViewZoneIds,
                    widgets: newWidgets,
                    pendingDiffActions: restoredPendingDiffActions,
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handlePendingDiffShortcut, true)
      }
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
  zone: ActiveZoneState | null | undefined
) {
  if (!zone) return
  zone.abortController.abort()
  zone.root.unmount()
  removeDecorations(editor, zone.decorationIds)
  zone.pendingDiffActions.forEach((action) => {
    action.resolved = true
  })
  
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
    zone.deletedViewZoneIds?.forEach((id) => accessor.removeZone(id))
    if (zone.viewZoneId) accessor.removeZone(zone.viewZoneId)
  })
}

export default useAIAssist
