import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PDF_SCALE,
  MAX_PDF_SCALE,
  MIN_PDF_SCALE,
  getPdfScaleStorageKey,
  normalizePdfScale,
} from '../pdf-scale-preferences'

describe('pdf scale preferences', () => {
  it('builds user-scoped storage keys', () => {
    expect(getPdfScaleStorageKey('project-1', 'user-1')).toBe(
      'clarity:pdf-scale:user-1:project-1'
    )
    expect(getPdfScaleStorageKey('project-1', '')).toBe(
      'clarity:pdf-scale:anonymous:project-1'
    )
  })

  it('normalizes invalid values to fallback', () => {
    expect(normalizePdfScale(undefined)).toBe(DEFAULT_PDF_SCALE)
    expect(normalizePdfScale('bad', 1.2)).toBe(1.2)
  })

  it('clamps values into supported range', () => {
    expect(normalizePdfScale(-2)).toBe(MIN_PDF_SCALE)
    expect(normalizePdfScale(99)).toBe(MAX_PDF_SCALE)
    expect(normalizePdfScale(1.37)).toBe(1.37)
  })
})
