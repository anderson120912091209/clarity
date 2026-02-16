'use client'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

function parseLatexError(error: string): { summary: string; details?: string } {
  const normalized = error.trim()
  if (!normalized) {
    return { summary: 'Compilation failed.' }
  }

  const knownMessages: { [key: string]: string } = {
    'Missing File: No main.tex file found':
      'No main.tex file found. Add a main.tex file to compile a LaTeX project.',
    'Missing File: No main.tex or main.typ file found':
      'No main.tex or main.typ file found. Add one of them to compile.',
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

export default function LatexError({ error }: { error: string }) {
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
        <p className="text-xs text-red-200/70">
          Open the logs panel to view full compiler diagnostics.
        </p>
      </AlertDescription>
    </Alert>
  )
}
