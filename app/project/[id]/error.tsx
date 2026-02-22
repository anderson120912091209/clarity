'use client'

import { useEffect } from 'react'

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Project Error Boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-xl font-semibold text-zinc-100">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-zinc-400">
          {error.message || 'An unexpected error occurred while loading this project.'}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
