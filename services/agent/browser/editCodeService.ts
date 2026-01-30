/**
 * EditCodeService - Manages AI-generated code edits
 * 
 * Responsibilities:
 * - Stream LLM output to Monaco editor
 * - Track DiffZones (regions with AI changes)
 * - Compute and visualize diffs (green/red highlights)
 * - Handle accept/reject of changes
 */

import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'


// ============================================================================
// Types
// ============================================================================

export interface NormalizedSelection {
  text: string
  range: monaco.Range
  lineNumbers: {
    start: number
    end: number
  }
}

export interface QuickEditOptions {
  editor: editor.IStandaloneCodeEditor
  monacoInstance: typeof monaco
  selection: NormalizedSelection
  instructions: string
  onChange: (value: string) => void
  setIsStreaming?: (isStreaming: boolean) => void
}

interface DiffZone {
  id: string
  editor: editor.IStandaloneCodeEditor
  monacoInstance: typeof monaco
  startLine: number
  endLine: number
  originalText: string
  streamingText: string
  isStreaming: boolean
  decorationIds: string[]
  onChange: (value: string) => void
  // Smooth streaming state
  tokenQueue: PendingToken[]
  isProcessingQueue: boolean
  resolveQueuePromise?: () => void
}

/**
 * Tracks the streaming cursor position
 * Mutable object updated as we write each chunk
 */
interface StreamLocationMutable {
  line: number              // Current line in the file (1-indexed)
  col: number               // Current column in the line (1-indexed)
  addedSplitYet: boolean    // Have we added the separator newline?
  originalCodeStartLine: number  // Which line of original code we're at
}

// Queue item for smooth streaming
interface PendingToken {
  text: string
  // Optional: timestamp for jitter buffer
}

// ============================================================================
// EditCodeService Class
// ============================================================================

class EditCodeService {
  private diffZones: Map<string, DiffZone> = new Map()
  private currentStreaming: string | null = null

  /**
   * Start a quick edit session (Cmd+K flow)
   */
  async startQuickEdit(opts: QuickEditOptions): Promise<void> {
    const zoneId = `zone-${Date.now()}`
    
    // Create DiffZone
    const zone: DiffZone = {
      id: zoneId,
      editor: opts.editor,
      monacoInstance: opts.monacoInstance,
      startLine: opts.selection.lineNumbers.start,
      endLine: opts.selection.lineNumbers.end,
      originalText: opts.selection.text,
      streamingText: '',
      isStreaming: true,
      decorationIds: [],
      onChange: opts.onChange || (() => {}),
      tokenQueue: [],
      isProcessingQueue: false
    }
    
    this.diffZones.set(zoneId, zone)
    this.currentStreaming = zoneId
    
    // Build prompt
    const model = opts.editor.getModel()
    if (!model) {
      console.error('[EditCodeService] No model found')
      return
    }
    
    const fullFileText = model.getValue()
    const promptContext = opts.selection.text === '' 
      ? `Inserting code at line ${opts.selection.lineNumbers.start}. Context:\n${this.getAroundContext(model, opts.selection.lineNumbers.start)}`
      : `Replacing lines ${opts.selection.lineNumbers.start}-${opts.selection.lineNumbers.end}:\n${opts.selection.text}\n\nFile context:\n${fullFileText}`
    
    const prompt = `User Instruction: ${opts.instructions}\n\n${promptContext}`
    
    try {
      // Start streaming
      opts.setIsStreaming?.(true)
      const { output } = await chatService.generate(prompt)
      
      let fullNewText = ''
      
      // Initialize cursor tracker (VoidEditor pattern)
      const latestMutable: StreamLocationMutable = {
        line: zone.startLine,
        col: 1,
        addedSplitYet: false,
        originalCodeStartLine: 1
      }
      
      // Stream loop - delta-only writes (VoidEditor pattern)
      let chunkCount = 0
      const startTime = Date.now()
      console.log('[EditCodeService] Starting stream loop')

      for await (const _delta of chatService.readStream(output)) {
        chunkCount++
        const delta = _delta as any
        if (!delta) continue
        
        if (chunkCount === 1) {
             console.log(`[EditCodeService] First chunk received after ${Date.now() - startTime}ms`)
        }
        
        if (delta.error) {
          console.error('[EditCodeService] Stream error:', delta.error)
          opts.setIsStreaming?.(false)
          throw new Error(delta.error)
        }
        
        if (!delta.content) continue
        
        const deltaText = delta.content  // Just the new chunk
        
        // Push to buffer instead of writing immediately
        // Use zone.originalText since originalCode variable isn't available here
        this.queueDelta(zone, zone.originalText, deltaText, latestMutable, opts.monacoInstance)
      }
      
      // Wait for queue to drain
      await this.waitForQueueDrain(zone.id)
      
      console.log(`[EditCodeService] Stream complete. Total chunks: ${chunkCount}, Total time: ${Date.now() - startTime}ms`)
      
      // Streaming complete
      zone.isStreaming = false
      zone.streamingText = fullNewText
      this.currentStreaming = null
      opts.setIsStreaming?.(false)
      
      if (!fullNewText) {
        console.warn('[EditCodeService] Empty response from AI')
        this.cleanup(zoneId)
        return
      }
      
      // Calculate diff and show accept/reject UI
      const { decorations: diffDecorations, currentLine } = calculateDiff(
        zone.originalText,
        fullNewText,
        opts.monacoInstance,
        opts.selection.range
      )
      
      // Clear streaming decorations, show diff decorations
      zone.decorationIds = zone.editor.deltaDecorations(zone.decorationIds, diffDecorations)
      
      // Create accept/reject widget
      const widget = createContentWidget(
        zone.editor,
        opts.monacoInstance,
        opts.selection.range,
        zone.originalText,
        fullNewText,
        currentLine,
        zone.decorationIds,
        zone.onChange
      )
      
      zone.editor.addContentWidget(widget as any)
      
    } catch (error) {
      console.error('[EditCodeService] Error:', error)
      opts.setIsStreaming?.(false)
      this.cleanup(zoneId)
      throw error
    }
  }
  
  /**
   * Write streamed delta using VoidEditor's algorithm
   * This creates the smooth "typing" effect by writing only new characters
   */
  private writeStreamedDelta(
    zone: DiffZone,
    originalCode: string,
    llmTextSoFar: string,
    deltaText: string,
    latestMutable: StreamLocationMutable,
    monacoInstance: typeof monaco
  ): void {
    // Step 1: Add separator newline (first time only)
    if (!latestMutable.addedSplitYet) {
      zone.editor.executeEdits('ai-stream-separator', [{
        range: new monacoInstance.Range(
          latestMutable.line,
          latestMutable.col,
          latestMutable.line,
          latestMutable.col
        ),
        text: '\n',
        forceMoveMarkers: true
      }])
      latestMutable.addedSplitYet = true
      latestMutable.line += 1
    }
    
    // Step 2: Write the delta text at cursor position
    zone.editor.executeEdits('ai-stream-delta', [{
      range: new monacoInstance.Range(
        latestMutable.line,
        latestMutable.col,
        latestMutable.line,
        latestMutable.col
      ),
      text: deltaText,
      forceMoveMarkers: true
    }])
    
    // Step 3: Update cursor position based on what we just wrote
    const deltaNumNewLines = deltaText.split('\n').length - 1
    latestMutable.line += deltaNumNewLines
    
    const lastNewlineIdx = deltaText.lastIndexOf('\n')
    if (lastNewlineIdx === -1) {
      // No newline in delta, just move column forward
      latestMutable.col += deltaText.length
    } else {
      // Has newline, move to the column after last newline
      latestMutable.col = deltaText.length - lastNewlineIdx
    }
    
    // Step 4: Add sweep animation (VoidEditor pattern)
    // Current line (bright) + lines below (dimmed) creates a "wave" effect
    const model = zone.editor.getModel()
    if (!model) return
    
    const sweepDecorations: monaco.editor.IModelDeltaDecoration[] = [
      {
        // Current line being written (bright highlight - 'void-sweepIdxBG')
        range: new monacoInstance.Range(
          latestMutable.line,
          1,
          latestMutable.line,
          model.getLineMaxColumn(latestMutable.line)
        ),
        options: {
          className: 'ai-streaming-line',      // Bright blue
          isWholeLine: true,
        }
      },
      {
        // Animated cursor at write position
        range: new monacoInstance.Range(
          latestMutable.line,
          latestMutable.col,
          latestMutable.line,
          latestMutable.col
        ),
        options: {
          afterContentClassName: 'ai-cursor',   // Blinking cursor
        }
      }
    ]
    
    // Add dimmed "below" lines if there are lines remaining (VoidEditor's 'void-sweepBG')
    const estimatedEndLine = zone.startLine + Math.max(
      llmTextSoFar.split('\n').length,
      originalCode.split('\n').length
    )
    
    if (latestMutable.line + 1 <= estimatedEndLine) {
      sweepDecorations.push({
        range: new monacoInstance.Range(
          latestMutable.line + 1,
          1,
          estimatedEndLine,
          model.getLineMaxColumn(estimatedEndLine)
        ),
        options: {
          className: 'ai-streaming-below',    // Dimmed/faded
          isWholeLine: true,
        }
      })
    }
    
    zone.decorationIds = zone.editor.deltaDecorations(zone.decorationIds, sweepDecorations)
  }

  /**
   * Queue a delta for smooth streaming
   */
  private queueDelta(
    zone: DiffZone,
    originalCode: string,
    deltaText: string,
    latestMutable: StreamLocationMutable,
    monacoInstance: typeof monaco
  ): void {
    // Split into smaller chunks for smoother animation if it's a large blob
    // But usually char-by-char is best; let's trust the loop to handle speed
    const tokens: string[] = []
    
    // If delta is huge, split it. If it's small, keep it.
    if (deltaText.length > 5) {
      // Split by spaces or chars? Let's just push the whole thing and let consumer slice it?
      // Or split physically here.
      for (const char of deltaText) {
        tokens.push(char)
      }
    } else {
      tokens.push(deltaText)
    }

    for (const token of tokens) {
      zone.tokenQueue.push({ text: token })
    }

    if (!zone.isProcessingQueue) {
      this.processQueue(zone, originalCode, latestMutable, monacoInstance)
    }
  }

  /**
   * Process the token queue at a fixed "typing" speed
   */
  private async processQueue(
    zone: DiffZone,
    originalCode: string,
    latestMutable: StreamLocationMutable,
    monacoInstance: typeof monaco
  ): Promise<void> {
    zone.isProcessingQueue = true
    
    // Typing speed configuration
    const MIN_DELAY = 10  // ms (fast typing)
    const MAX_DELAY = 30  // ms (slower for thinking feel)
    
    while (zone.tokenQueue.length > 0) {
      const token = zone.tokenQueue.shift()
      if (!token) break

      // Track full text locally for this write (approximated)
      // Note: we don't strictly need accurate full text for writeStreamedDelta, 
      // primarily for the "below" dimming. We can approximate or separate it.
      zone.streamingText += token.text 

      this.writeStreamedDelta(
        zone, 
        originalCode, 
        zone.streamingText, 
        token.text, 
        latestMutable, 
        monacoInstance
      )

      // Artificial delay for smooth typing
      // If queue is backing up (>10 items), speed up
      const delay = zone.tokenQueue.length > 10 ? 2 : 15
      
      await new Promise(r => setTimeout(r, delay))
    }

    zone.isProcessingQueue = false
    
    // If queue is empty and we have a resolve promise (from waitForQueueDrain), call it
    if (zone.tokenQueue.length === 0 && zone.resolveQueuePromise) {
      zone.resolveQueuePromise()
      zone.resolveQueuePromise = undefined
    }
  }

  /**
   * Wait for queue to finish writing
   */
  private async waitForQueueDrain(zoneId: string): Promise<void> {
    const zone = this.diffZones.get(zoneId)
    if (!zone) return
    
    if (zone.tokenQueue.length === 0 && !zone.isProcessingQueue) return

    return new Promise(resolve => {
      zone.resolveQueuePromise = resolve
    })
  }

  /**
   * Accept diff - keep the AI changes
   */
  acceptDiff(zoneId: string): void {
    const zone = this.diffZones.get(zoneId)
    if (!zone) return
    
    // Text is already in editor, just clear decorations
    zone.editor.deltaDecorations(zone.decorationIds, [])
    
    // Sync to database
    zone.onChange(zone.editor.getValue())
    
    // Cleanup
    this.diffZones.delete(zoneId)
  }
  
  /**
   * Reject diff - revert to original text
   */
  rejectDiff(zoneId: string): void {
    const zone = this.diffZones.get(zoneId)
    if (!zone) return
    
    // Revert text
    const model = zone.editor.getModel()
    if (!model) return
    
    const endLine = zone.startLine + zone.streamingText.split('\n').length - 1
    
    zone.editor.executeEdits('ai-reject', [{
      range: new zone.monacoInstance.Range(
        zone.startLine,
        1,
        endLine,
        model.getLineMaxColumn(endLine)
      ),
      text: zone.originalText,
      forceMoveMarkers: true
    }])
    
    // Clear decorations
    zone.editor.deltaDecorations(zone.decorationIds, [])
    
    // Cleanup
    this.diffZones.delete(zoneId)
  }
  
  /**
   * Stop streaming for a specific zone
   */
  stopStreaming(zoneId: string): void {
    const zone = this.diffZones.get(zoneId)
    if (!zone) return
    
    zone.isStreaming = false
    if (this.currentStreaming === zoneId) {
      this.currentStreaming = null
    }
    
    // TODO: Abort the LLM request (need to add abort support to chatService)
  }
  
  /**
   * Check if any zone is currently streaming
   */
  isStreaming(): boolean {
    return this.currentStreaming !== null
  }
  
  /**
   * Get streaming zone ID (if any)
   */
  getStreamingZoneId(): string | null {
    return this.currentStreaming
  }
  
  /**
   * Cleanup a zone
   */
  private cleanup(zoneId: string): void {
    const zone = this.diffZones.get(zoneId)
    if (!zone) return
    
    zone.editor.deltaDecorations(zone.decorationIds, [])
    this.diffZones.delete(zoneId)
    
    if (this.currentStreaming === zoneId) {
      this.currentStreaming = null
    }
  }
  
  /**
   * Get context around a line (for empty selections)
   */
  private getAroundContext(model: editor.ITextModel, line: number): string {
    const startLine = Math.max(1, line - 5)
    const endLine = Math.min(model.getLineCount(), line + 5)
    return model.getValueInRange(
      new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine))
    )
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const editCodeService = new EditCodeService()