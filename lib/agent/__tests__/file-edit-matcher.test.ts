import { describe, expect, it } from 'vitest'
import { applySearchReplaceWithFallback } from '../file-edit-matcher'

describe('applySearchReplaceWithFallback', () => {
  it('applies exact match replacements', () => {
    const source = ['alpha', 'beta', 'gamma'].join('\n')
    const result = applySearchReplaceWithFallback(source, 'beta', 'BETA')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matchMode).toBe('exact')
    expect(result.nextContent).toBe(['alpha', 'BETA', 'gamma'].join('\n'))
  })

  it('handles LF search content against CRLF file content', () => {
    const source = 'alpha\r\nbeta\r\ngamma\r\n'
    const search = 'alpha\nbeta\n'
    const replace = 'ALPHA\nBETA\n'

    const result = applySearchReplaceWithFallback(source, search, replace)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matchMode).toBe('normalized_line_endings')
    expect(result.nextContent).toBe('ALPHA\r\nBETA\r\ngamma\r\n')
  })

  it('handles search blocks wrapped with extra outer blank lines', () => {
    const source = ['title', 'section-one', 'section-two', 'tail'].join('\n')
    const search = '\nsection-one\nsection-two\n\n'
    const replace = '\nsection-ONE\nsection-TWO\n\n'

    const result = applySearchReplaceWithFallback(source, search, replace)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matchMode).toBe('trimmed_outer_blank_lines')
    expect(result.nextContent).toBe(['title', 'section-ONE', 'section-TWO', 'tail'].join('\n'))
  })

  it('falls back to fuzzy line whitespace matching for indentation-only differences', () => {
    const source = ['if (ready) {', '  runTask(1, 2);', '}', 'end();'].join('\n')
    const search = ['if (ready) {', '      runTask(1, 2);   ', '}'].join('\n')
    const replace = ['if (ready) {', '  runTask(1, 3);', '}'].join('\n')

    const result = applySearchReplaceWithFallback(source, search, replace)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matchMode).toBe('fuzzy_line_whitespace')
    expect(result.nextContent).toBe(['if (ready) {', '  runTask(1, 3);', '}', 'end();'].join('\n'))
  })

  it('falls back to fuzzy line substring matching for partial line snippets', () => {
    const source = [
      'const formatter = new Intl.DateTimeFormat("en-US", options)',
      'const summary = formatter.format(createdAt)',
      'return summary',
    ].join('\n')
    const search = [
      'const formatter = new Intl.DateTimeFormat',
      'const summary = formatter.format',
    ].join('\n')
    const replace = [
      'const formatter = new Intl.DateTimeFormat("en-GB", options)',
      'const summary = formatter.format(updatedAt)',
    ].join('\n')

    const result = applySearchReplaceWithFallback(source, search, replace)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.matchMode).toBe('fuzzy_line_substring')
    expect(result.nextContent).toBe([
      'const formatter = new Intl.DateTimeFormat("en-GB", options)',
      'const summary = formatter.format(updatedAt)',
      'return summary',
    ].join('\n'))
  })

  it('rejects ambiguous fuzzy matches', () => {
    const source = ['item {', '  value: 1', '}', '', 'item {', '  value: 1', '}'].join('\n')
    const search = ['item {', '    value: 1   ', '}'].join('\n')
    const replace = ['item {', '  value: 2', '}'].join('\n')

    const result = applySearchReplaceWithFallback(source, search, replace)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('ambiguous_match')
  })

  it('keeps rejecting stale snippets after prior edits', () => {
    const source = ['line-1', 'line-2', 'line-3'].join('\n')
    const first = applySearchReplaceWithFallback(source, 'line-2', 'line-two')

    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = applySearchReplaceWithFallback(first.nextContent, 'line-2', 'line-two-v2')

    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.reason).toBe('search_not_found')
  })

  it('rejects fuzzy substring matches for overly short snippets', () => {
    const source = ['alpha beta', 'gamma delta', 'epsilon zeta'].join('\n')
    const search = ['alpha', 'gamma'].join('\n')
    const replace = ['one', 'two'].join('\n')

    const result = applySearchReplaceWithFallback(source, search, replace)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('search_not_found')
  })
})
