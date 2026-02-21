/**
 * Context Normalizer
 *
 * Normalizes raw chat context from the client into a clean, bounded representation
 * suitable for LLM consumption. Handles path normalization, file deduplication,
 * content truncation, and workspace budget enforcement.
 */

import type { AgentChatContext, AgentChatSettingsContext } from '@/features/agent/types/chat-context'

// ── Constants ──

export const MAX_ACTIVE_FILE_CHARS = 36_000
export const MAX_COMPILE_LOG_CHARS = 26_000
export const MAX_WORKSPACE_FILES = 300
export const MAX_WORKSPACE_FILE_CHARS = 90_000
export const MAX_WORKSPACE_TOTAL_CHARS = 900_000

// ── Types ──

export interface NormalizedWorkspaceFile {
  fileId: string
  path: string
  normalizedPath: string
  basename: string
  content: string
  lineCount: number
  charCount: number
}

export interface NormalizedChatContext {
  userId: string | null
  activeFileId: string | null
  activeFileName: string | null
  activeFilePath: string | null
  activeFileContent: string
  workspaceFiles: NormalizedWorkspaceFile[]
  compileLogs: string
  compileError: string | null
  settings: Required<AgentChatSettingsContext>
}

// ── Path Utilities ──

export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
    .trim()
    .toLowerCase()
}

export function normalizeBasename(path: string): string {
  const normalized = normalizePath(path)
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

// ── Text Utilities ──

export function lineCountOf(text: string): number {
  if (!text) return 1
  return text.split(/\r?\n/).length
}

export function trimWithNotice(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}\n\n[Truncated]`
}

export function tailWithNotice(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `[Truncated]\n\n${value.slice(value.length - maxChars)}`
}

export function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

// ── File Resolution ──

export function resolveWorkspaceFile(
  workspaceFiles: NormalizedWorkspaceFile[],
  requestedPath: string
): NormalizedWorkspaceFile | null {
  const normalizedRequest = normalizePath(requestedPath)
  if (!normalizedRequest) return null

  const exactMatch = workspaceFiles.find((file) => file.normalizedPath === normalizedRequest)
  if (exactMatch) return exactMatch

  const basename = normalizeBasename(normalizedRequest)
  const basenameMatches = workspaceFiles.filter((file) => file.basename === basename)
  if (basenameMatches.length === 1) {
    return basenameMatches[0]
  }

  return null
}

export function suggestWorkspacePaths(
  workspaceFiles: NormalizedWorkspaceFile[],
  requestedPath: string,
  limit = 5
): string[] {
  const normalizedRequest = normalizePath(requestedPath)
  const basename = normalizeBasename(requestedPath)

  const scored = workspaceFiles
    .map((file) => {
      let score = 0
      if (file.normalizedPath === normalizedRequest) score += 100
      if (file.basename === basename) score += 70
      if (file.normalizedPath.includes(normalizedRequest)) score += 35
      if (normalizedRequest.includes(file.basename)) score += 20
      if (file.path.toLowerCase().includes(requestedPath.toLowerCase())) score += 10
      return { path: file.path, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)

  return scored.slice(0, limit).map((entry) => entry.path)
}

// ── Detection Helpers ──

export function isLikelyLaTeXPath(path: string): boolean {
  return /\.(tex|sty|cls|bib|bst|typ)$/i.test(path)
}

export function getLineMatches(
  content: string,
  query: string,
  maxMatches: number
): Array<{ line: number; preview: string }> {
  const lines = content.split(/\r?\n/)
  const queryLower = query.toLowerCase()
  const matches: Array<{ line: number; preview: string }> = []

  for (let index = 0; index < lines.length; index += 1) {
    if (matches.length >= maxMatches) break
    const line = lines[index]
    if (!line.toLowerCase().includes(queryLower)) continue
    matches.push({
      line: index + 1,
      preview: line.trim().slice(0, 240),
    })
  }

  return matches
}

export function supportsTypstLibrary(
  context: NormalizedChatContext,
  latestUserMessage: string
): boolean {
  const activePath = context.activeFilePath?.toLowerCase() ?? ''
  const hasTypstActiveFile = activePath.endsWith('.typ')
  const hasTypstWorkspaceFile = context.workspaceFiles.some((file) =>
    file.path.toLowerCase().endsWith('.typ')
  )
  const mentionsTypst = /\btypst\b|\btouying\b|\.typ\b/i.test(latestUserMessage)

  return hasTypstActiveFile || hasTypstWorkspaceFile || mentionsTypst
}

export function shouldEnableTypstLibrary(
  context: NormalizedChatContext,
  latestUserMessage: string
): boolean {
  return context.settings.libraryEnabled || supportsTypstLibrary(context, latestUserMessage)
}

export function isLikelyEditIntent(latestUserMessage: string): boolean {
  const text = latestUserMessage.toLowerCase()
  if (!text.trim()) return false

  if (/@file\s*:|@insert\s*:|search\s*:|replace\s*:/i.test(latestUserMessage)) {
    return true
  }

  const editSignals = [
    /\bedit\b/,
    /\bfix\b/,
    /\bupdate\b/,
    /\brewrite\b/,
    /\brefactor\b/,
    /\bconvert\b/,
    /\bchange\b/,
    /\badjust\b/,
    /\bmodify\b/,
    /\bapply\b/,
    /\bremove\b/,
    /\badd\b/,
    /\bformat\b/,
  ]

  return editSignals.some((pattern) => pattern.test(text))
}

// ── Main Normalizer ──

export function normalizeContext(input: AgentChatContext | undefined): NormalizedChatContext {
  const userIdRaw = sanitizeText(input?.userId)
  const activeFilePathRaw = sanitizeText(input?.activeFilePath)
  const activeFileNameRaw = sanitizeText(input?.activeFileName)
  const activeFileContentRaw = sanitizeText(input?.activeFileContent)
  const compileLogsRaw = sanitizeText(input?.compile?.logs)
  const compileErrorRaw = sanitizeText(input?.compile?.error)

  let remainingWorkspaceBudget = MAX_WORKSPACE_TOTAL_CHARS
  const normalizedWorkspaceFiles: NormalizedWorkspaceFile[] = []
  const seenPaths = new Set<string>()

  for (const file of input?.workspaceFiles ?? []) {
    if (!file?.path || typeof file.content !== 'string') continue
    if (normalizedWorkspaceFiles.length >= MAX_WORKSPACE_FILES) break
    if (remainingWorkspaceBudget <= 0) break

    const np = normalizePath(file.path)
    if (!np || seenPaths.has(np)) continue

    const trimmedContent = trimWithNotice(
      file.content,
      Math.min(MAX_WORKSPACE_FILE_CHARS, remainingWorkspaceBudget)
    )
    remainingWorkspaceBudget -= trimmedContent.length
    seenPaths.add(np)

    normalizedWorkspaceFiles.push({
      fileId: file.fileId,
      path: file.path,
      normalizedPath: np,
      basename: normalizeBasename(file.path),
      content: trimmedContent,
      lineCount: lineCountOf(trimmedContent),
      charCount: trimmedContent.length,
    })
  }

  const activeFilePath = activeFilePathRaw || null
  const activeFileContent = trimWithNotice(activeFileContentRaw, MAX_ACTIVE_FILE_CHARS)

  if (activeFilePath && activeFileContent) {
    const normalizedActivePath = normalizePath(activeFilePath)
    if (!seenPaths.has(normalizedActivePath)) {
      normalizedWorkspaceFiles.unshift({
        fileId: input?.activeFileId ?? '__active__',
        path: activeFilePath,
        normalizedPath: normalizedActivePath,
        basename: normalizeBasename(activeFilePath),
        content: activeFileContent,
        lineCount: lineCountOf(activeFileContent),
        charCount: activeFileContent.length,
      })
    }
  }

  return {
    userId: userIdRaw || null,
    activeFileId: input?.activeFileId ?? null,
    activeFileName: activeFileNameRaw || null,
    activeFilePath,
    activeFileContent,
    workspaceFiles: normalizedWorkspaceFiles,
    compileLogs: tailWithNotice(compileLogsRaw, MAX_COMPILE_LOG_CHARS),
    compileError: compileErrorRaw || null,
    settings: {
      includeCurrentDocument: input?.settings?.includeCurrentDocument ?? true,
      webEnabled: input?.settings?.webEnabled ?? false,
      libraryEnabled: input?.settings?.libraryEnabled ?? false,
    },
  }
}
