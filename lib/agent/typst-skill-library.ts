import { promises as fs } from 'node:fs'
import path from 'node:path'

const SKILLS_ROOT = path.join(process.cwd(), 'services', 'agent', 'skills', 'typst-skills')
const ALLOWED_EXTENSIONS = new Set(['.md', '.typ'])
const MAX_INDEXED_FILES = 320
const MAX_INDEXED_CHARS_PER_FILE = 18_000
const MAX_RESULTS = 20
const MAX_READ_LINES = 500

export interface TypstSkillDocSummary {
  id: string
  source: string
  relativePath: string
  title: string
  lineCount: number
  charCount: number
}

interface IndexedSkillDoc extends TypstSkillDocSummary {
  normalizedPath: string
  normalizedTitle: string
  normalizedContent: string
  content: string
}

interface TypstSkillLibrary {
  loadedAt: string
  docs: IndexedSkillDoc[]
}

let cachedLibraryPromise: Promise<TypstSkillLibrary> | null = null

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9@._/\-:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  )
}

function pickTitle(content: string, fallback: string): string {
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '').slice(0, 120)
    }
  }
  return fallback
}

function sourceFromPath(relativePath: string): string {
  const first = relativePath.split('/').filter(Boolean)[0]
  return first || 'typst-skills'
}

async function walkSkillFiles(dir: string, acc: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  entries.sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of entries) {
    if (acc.length >= MAX_INDEXED_FILES) return
    if (entry.name.startsWith('.')) continue

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkSkillFiles(fullPath, acc)
      continue
    }

    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) continue
    acc.push(fullPath)
  }
}

async function loadLibrary(): Promise<TypstSkillLibrary> {
  const files: string[] = []
  try {
    await walkSkillFiles(SKILLS_ROOT, files)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code !== 'ENOENT') throw error
    return {
      loadedAt: new Date().toISOString(),
      docs: [],
    }
  }

  const docs: IndexedSkillDoc[] = []

  for (const fullPath of files) {
    const relativePath = path.relative(SKILLS_ROOT, fullPath).replace(/\\/g, '/')
    const raw = await fs.readFile(fullPath, 'utf-8')
    const content = raw.length > MAX_INDEXED_CHARS_PER_FILE ? raw.slice(0, MAX_INDEXED_CHARS_PER_FILE) : raw
    const normalizedContent = normalizeText(content)
    const title = pickTitle(content, path.basename(relativePath))

    docs.push({
      id: relativePath,
      source: sourceFromPath(relativePath),
      relativePath,
      title,
      lineCount: content.split(/\r?\n/).length,
      charCount: content.length,
      normalizedPath: normalizeText(relativePath),
      normalizedTitle: normalizeText(title),
      normalizedContent,
      content,
    })
  }

  return {
    loadedAt: new Date().toISOString(),
    docs,
  }
}

async function getLibrary(): Promise<TypstSkillLibrary> {
  if (!cachedLibraryPromise) {
    cachedLibraryPromise = loadLibrary().catch((error) => {
      cachedLibraryPromise = null
      throw error
    })
  }
  return cachedLibraryPromise
}

function createSnippet(content: string, query: string): string {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return content.slice(0, 420)

  const lower = content.toLowerCase()
  const queryLower = query.toLowerCase()
  const directIndex = lower.indexOf(queryLower)
  const index = directIndex >= 0 ? directIndex : lower.indexOf(normalizedQuery)
  if (index < 0) return content.slice(0, 420)

  const start = Math.max(0, index - 140)
  const end = Math.min(content.length, index + 260)
  return content.slice(start, end)
}

export async function listTypstSkillDocs(limit = 120): Promise<{
  loadedAt: string
  totalDocs: number
  docs: TypstSkillDocSummary[]
}> {
  const library = await getLibrary()
  const safeLimit = Math.max(1, Math.min(MAX_RESULTS * 10, limit))

  return {
    loadedAt: library.loadedAt,
    totalDocs: library.docs.length,
    docs: library.docs.slice(0, safeLimit).map((doc) => ({
      id: doc.id,
      source: doc.source,
      relativePath: doc.relativePath,
      title: doc.title,
      lineCount: doc.lineCount,
      charCount: doc.charCount,
    })),
  }
}

export async function searchTypstSkillDocs(query: string, limit = 8): Promise<{
  query: string
  loadedAt: string
  totalMatches: number
  results: Array<TypstSkillDocSummary & { score: number; snippet: string }>
}> {
  const library = await getLibrary()
  const normalizedQuery = normalizeText(query)
  const tokens = tokenize(query)
  const safeLimit = Math.max(1, Math.min(MAX_RESULTS, limit))

  if (!normalizedQuery || tokens.length === 0) {
    return {
      query,
      loadedAt: library.loadedAt,
      totalMatches: 0,
      results: [],
    }
  }

  const ranked = library.docs
    .map((doc) => {
      let score = 0

      if (doc.normalizedPath.includes(normalizedQuery)) score += 26
      if (doc.normalizedTitle.includes(normalizedQuery)) score += 24
      if (doc.normalizedContent.includes(normalizedQuery)) score += 8

      for (const token of tokens) {
        if (doc.normalizedPath.includes(token)) score += 9
        if (doc.normalizedTitle.includes(token)) score += 8
        if (doc.normalizedContent.includes(token)) score += 2
      }

      return { doc, score }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)

  const results = ranked.slice(0, safeLimit).map(({ doc, score }) => ({
    id: doc.id,
    source: doc.source,
    relativePath: doc.relativePath,
    title: doc.title,
    lineCount: doc.lineCount,
    charCount: doc.charCount,
    score,
    snippet: createSnippet(doc.content, query),
  }))

  return {
    query,
    loadedAt: library.loadedAt,
    totalMatches: ranked.length,
    results,
  }
}

export async function readTypstSkillDoc(
  relativePath: string,
  startLine = 1,
  endLine = 220
): Promise<
  | {
      found: false
      message: string
    }
  | {
      found: true
      doc: TypstSkillDocSummary
      selectedRange: {
        startLine: number
        endLine: number
      }
      content: string
    }
> {
  const library = await getLibrary()
  const normalizedRequest = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const doc = library.docs.find((item) => item.relativePath === normalizedRequest)

  if (!doc) {
    return {
      found: false,
      message: `Skill document not found: ${relativePath}`,
    }
  }

  const lines = doc.content.split(/\r?\n/)
  const safeStartLine = Math.max(1, Math.min(lines.length, startLine))
  const maxEnd = Math.min(lines.length, safeStartLine + MAX_READ_LINES - 1)
  const safeEndLine = Math.max(safeStartLine, Math.min(maxEnd, endLine))
  const content = lines.slice(safeStartLine - 1, safeEndLine).join('\n')

  return {
    found: true,
    doc: {
      id: doc.id,
      source: doc.source,
      relativePath: doc.relativePath,
      title: doc.title,
      lineCount: doc.lineCount,
      charCount: doc.charCount,
    },
    selectedRange: {
      startLine: safeStartLine,
      endLine: safeEndLine,
    },
    content,
  }
}
