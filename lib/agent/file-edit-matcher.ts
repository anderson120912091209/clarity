export type SearchReplaceMatchMode =
  | 'exact'
  | 'normalized_line_endings'
  | 'trimmed_outer_blank_lines'
  | 'fuzzy_line_whitespace'
  | 'fuzzy_line_substring'

export type SearchReplaceResult =
  | {
      ok: true
      nextContent: string
      matchMode: SearchReplaceMatchMode
    }
  | {
      ok: false
      reason: 'search_not_found' | 'ambiguous_match'
    }

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n')
}

function restoreLineEndings(value: string, template: string): string {
  if (!template.includes('\r\n')) return value
  return value.replace(/\n/g, '\r\n')
}

function trimOuterBlankLines(value: string): string {
  return value.replace(/^(?:[ \t]*\n)+/, '').replace(/(?:\n[ \t]*)+$/, '')
}

function replaceFirst(
  content: string,
  search: string,
  replace: string
): string | null {
  const index = content.indexOf(search)
  if (index < 0) return null
  return content.slice(0, index) + replace + content.slice(index + search.length)
}

function findAllOccurrences(
  content: string,
  search: string,
  maxMatches = 2
): number[] {
  if (!search) return []
  const indexes: number[] = []
  let start = 0

  while (indexes.length < maxMatches) {
    const index = content.indexOf(search, start)
    if (index < 0) break
    indexes.push(index)
    start = index + 1
  }

  return indexes
}

function normalizeLineForFuzzyCompare(line: string): string {
  return line.replace(/[ \t]+/g, ' ').trim()
}

function applyFuzzyLineWhitespaceReplace(
  normalizedContent: string,
  normalizedSearch: string,
  normalizedReplace: string
): SearchReplaceResult {
  const trimmedSearch = trimOuterBlankLines(normalizedSearch)
  if (!trimmedSearch) {
    return { ok: false, reason: 'search_not_found' }
  }

  const contentLines = normalizedContent.split('\n')
  const searchLines = trimmedSearch.split('\n')
  const comparableSearchLines = searchLines.map(normalizeLineForFuzzyCompare)
  if (comparableSearchLines.every((line) => line.length === 0)) {
    return { ok: false, reason: 'search_not_found' }
  }
  if (searchLines.length > contentLines.length) {
    return { ok: false, reason: 'search_not_found' }
  }

  const lineStarts: number[] = new Array(contentLines.length)
  let cursor = 0
  for (let index = 0; index < contentLines.length; index += 1) {
    lineStarts[index] = cursor
    cursor += contentLines[index].length
    if (index < contentLines.length - 1) cursor += 1
  }

  const candidateStarts: number[] = []
  const lastStart = contentLines.length - searchLines.length
  for (let startLine = 0; startLine <= lastStart; startLine += 1) {
    let matched = true
    for (let offset = 0; offset < searchLines.length; offset += 1) {
      const contentComparable = normalizeLineForFuzzyCompare(contentLines[startLine + offset])
      if (contentComparable !== comparableSearchLines[offset]) {
        matched = false
        break
      }
    }
    if (matched) {
      candidateStarts.push(startLine)
      if (candidateStarts.length > 1) {
        return { ok: false, reason: 'ambiguous_match' }
      }
    }
  }

  if (candidateStarts.length === 0) {
    return { ok: false, reason: 'search_not_found' }
  }

  const startLine = candidateStarts[0]
  const endLine = startLine + searchLines.length - 1
  const startIndex = lineStarts[startLine]
  const endIndexExclusive = lineStarts[endLine] + contentLines[endLine].length
  const nextContent =
    normalizedContent.slice(0, startIndex) +
    normalizedReplace +
    normalizedContent.slice(endIndexExclusive)

  return {
    ok: true,
    nextContent,
    matchMode: 'fuzzy_line_whitespace',
  }
}

function applyFuzzyLineSubstringReplace(
  normalizedContent: string,
  normalizedSearch: string,
  normalizedReplace: string
): SearchReplaceResult {
  const trimmedSearch = trimOuterBlankLines(normalizedSearch)
  if (!trimmedSearch) {
    return { ok: false, reason: 'search_not_found' }
  }

  const contentLines = normalizedContent.split('\n')
  const searchLines = trimmedSearch.split('\n')
  const comparableSearchLines = searchLines.map(normalizeLineForFuzzyCompare)
  const nonEmptyComparableLines = comparableSearchLines.filter((line) => line.length > 0)
  const nonEmptyCharCount = nonEmptyComparableLines.reduce(
    (sum, line) => sum + line.length,
    0
  )
  // Avoid broad fuzzy matches for tiny snippets.
  if (nonEmptyComparableLines.length < 2 || nonEmptyCharCount < 20) {
    return { ok: false, reason: 'search_not_found' }
  }
  if (searchLines.length > contentLines.length) {
    return { ok: false, reason: 'search_not_found' }
  }

  const lineStarts: number[] = new Array(contentLines.length)
  let cursor = 0
  for (let index = 0; index < contentLines.length; index += 1) {
    lineStarts[index] = cursor
    cursor += contentLines[index].length
    if (index < contentLines.length - 1) cursor += 1
  }

  const candidateStarts: number[] = []
  const lastStart = contentLines.length - searchLines.length
  for (let startLine = 0; startLine <= lastStart; startLine += 1) {
    let matched = true
    for (let offset = 0; offset < searchLines.length; offset += 1) {
      const contentComparable = normalizeLineForFuzzyCompare(contentLines[startLine + offset])
      const searchComparable = comparableSearchLines[offset]
      const lineMatches =
        searchComparable.length === 0
          ? contentComparable.length === 0
          : contentComparable.includes(searchComparable)
      if (!lineMatches) {
        matched = false
        break
      }
    }
    if (matched) {
      candidateStarts.push(startLine)
      if (candidateStarts.length > 1) {
        return { ok: false, reason: 'ambiguous_match' }
      }
    }
  }

  if (candidateStarts.length === 0) {
    return { ok: false, reason: 'search_not_found' }
  }

  const startLine = candidateStarts[0]
  const endLine = startLine + searchLines.length - 1
  const startIndex = lineStarts[startLine]
  const endIndexExclusive = lineStarts[endLine] + contentLines[endLine].length
  const nextContent =
    normalizedContent.slice(0, startIndex) +
    normalizedReplace +
    normalizedContent.slice(endIndexExclusive)

  return {
    ok: true,
    nextContent,
    matchMode: 'fuzzy_line_substring',
  }
}

export function applySearchReplaceWithFallback(
  content: string,
  search: string,
  replace: string
): SearchReplaceResult {
  const exactResult = replaceFirst(content, search, replace)
  if (exactResult !== null) {
    return {
      ok: true,
      nextContent: exactResult,
      matchMode: 'exact',
    }
  }

  const normalizedContent = normalizeLineEndings(content)
  const normalizedSearch = normalizeLineEndings(search)
  const normalizedReplace = normalizeLineEndings(replace)

  const normalizedExactResult = replaceFirst(
    normalizedContent,
    normalizedSearch,
    normalizedReplace
  )
  if (normalizedExactResult !== null) {
    return {
      ok: true,
      nextContent: restoreLineEndings(normalizedExactResult, content),
      matchMode: 'normalized_line_endings',
    }
  }

  const trimmedSearch = trimOuterBlankLines(normalizedSearch)
  if (trimmedSearch) {
    const trimmedReplace = trimOuterBlankLines(normalizedReplace)
    const trimmedMatches = findAllOccurrences(normalizedContent, trimmedSearch, 2)
    if (trimmedMatches.length === 1) {
      const trimmedApplied = replaceFirst(normalizedContent, trimmedSearch, trimmedReplace)
      if (trimmedApplied !== null) {
        return {
          ok: true,
          nextContent: restoreLineEndings(trimmedApplied, content),
          matchMode: 'trimmed_outer_blank_lines',
        }
      }
    } else if (trimmedMatches.length > 1) {
      return { ok: false, reason: 'ambiguous_match' }
    }
  }

  const fuzzyResult = applyFuzzyLineWhitespaceReplace(
    normalizedContent,
    normalizedSearch,
    normalizedReplace
  )
  if (fuzzyResult.ok) {
    return {
      ok: true,
      nextContent: restoreLineEndings(fuzzyResult.nextContent, content),
      matchMode: fuzzyResult.matchMode,
    }
  }

  if (fuzzyResult.reason === 'ambiguous_match') return fuzzyResult

  const fuzzySubstringResult = applyFuzzyLineSubstringReplace(
    normalizedContent,
    normalizedSearch,
    normalizedReplace
  )
  if (!fuzzySubstringResult.ok) return fuzzySubstringResult

  return {
    ok: true,
    nextContent: restoreLineEndings(fuzzySubstringResult.nextContent, content),
    matchMode: fuzzySubstringResult.matchMode,
  }
}
