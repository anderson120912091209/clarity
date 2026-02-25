'use client'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Bug, Loader2 } from 'lucide-react'

function parseLatexError(error: string): { summary: string; details?: string } {
  const normalized = error.trim()
  if (!normalized) {
    return { summary: 'Compilation failed.' }
  }

  const knownMessages: { [key: string]: string } = {
    'Missing File: No main.tex file found':
      'No compilable document found. Add a .tex file with \\documentclass{...} or a .typ file.',
    'Missing File: No main.tex or main.typ file found':
      'No compilable document found. Add a .tex file with \\documentclass{...} or a .typ file.',
    'No compilable document found.':
      'No compilable document found. Add a .tex file with \\documentclass{...} or a .typ file.',
  }

  const mapped = knownMessages[normalized]
  if (mapped) {
    return { summary: mapped }
  }

  const [firstLine, ...restLines] = normalized.split('\n')
  const details = restLines.join('\n').trim()
  return {
    summary: firstLine.trim() || 'Compilation failed.',
    details: details || undefined,
  }
}

interface LatexErrorProps {
  error: string
  onAiDebug?: () => void
  isAiDebugging?: boolean
  isAiDebugEnabled?: boolean
}

export default function LatexError({
  error,
  onAiDebug,
  isAiDebugging = false,
  isAiDebugEnabled = true,
}: LatexErrorProps) {
  const parsed = parseLatexError(error)

  return (
    <Alert variant="destructive" className="m-4 border-red-500/35 bg-red-500/5">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-red-500">Compilation Error</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-red-100/90">{parsed.summary}</p>
        {parsed.details ? (
          <pre className="max-h-[35vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-red-500/30 bg-black/40 p-3 font-mono text-xs text-red-100/80">
            {parsed.details}
          </pre>
        ) : null}
        {isAiDebugEnabled ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAiDebug}
              disabled={!onAiDebug || isAiDebugging}
              className="h-8 border-red-400/50 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAiDebugging ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bug className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isAiDebugging ? 'AI debugging...' : 'AI Debug & Fix'}
            </Button>
            <p className="text-xs text-red-200/70">
              Runs a one-click agent flow: inspect logs, diagnose root cause, and stage/apply edits.
            </p>
          </div>
        ) : (
          <p className="text-xs text-red-200/70">
            AI Debug is unavailable because AI Chat is disabled.
          </p>
        )}
        <p className="text-xs text-red-200/70">
          Open the logs panel to view full compiler diagnostics.
        </p>
      </AlertDescription>
    </Alert>
  )
}
