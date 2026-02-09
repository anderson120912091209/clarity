'use client'

import type { SynctexContext } from './pdf-utils'

export interface SynctexPdfPosition {
  page: number
  h: number
  v: number
  width: number
  height: number
}

export interface SynctexCodePosition {
  file: string
  line: number
  column: number
}

interface SyncFromCodeParams {
  file: string
  line: number
  column: number
}

interface SyncFromPdfParams {
  page: number
  h: number
  v: number
}

interface SyncOptions {
  signal?: AbortSignal
}

function createTraceId(prefix: 's2p' | 'p2s'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function syncSourceToPdf(
  context: SynctexContext,
  params: SyncFromCodeParams,
  options: SyncOptions = {}
): Promise<SynctexPdfPosition[]> {
  const traceId = createTraceId('s2p')
  const start = performance.now()

  console.log('[SyncTeX] syncSourceToPdf:start', {
    traceId,
    projectId: context.projectId,
    buildId: context.buildId,
    file: normalizeComparablePath(params.file),
    line: params.line,
    column: params.column,
  })

  const search = new URLSearchParams({
    buildId: context.buildId,
    file: normalizeComparablePath(params.file),
    line: String(params.line),
    column: String(params.column),
  });

  try {
    const response = await fetch(
      `${context.clsiBaseUrl}/project/${context.projectId}/sync/code?${search.toString()}`,
      {
        method: 'GET',
        signal: options.signal,
      }
    );

    if (!response.ok) {
      console.warn('[SyncTeX] syncSourceToPdf:http-error', {
        traceId,
        status: response.status,
        statusText: response.statusText,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
      })
      throw new Error(`SyncTeX source->pdf request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as { pdf?: unknown };
    const positions = parsePdfPositions(payload.pdf)
    console.log('[SyncTeX] syncSourceToPdf:success', {
      traceId,
      resultCount: positions.length,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    })
    return positions
  } catch (error) {
    const aborted = options.signal?.aborted || (error as { name?: string })?.name === 'AbortError'
    const log = aborted ? console.log : console.error
    log('[SyncTeX] syncSourceToPdf:failed', {
      traceId,
      aborted,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function syncPdfToSource(
  context: SynctexContext,
  params: SyncFromPdfParams,
  options: SyncOptions = {}
): Promise<SynctexCodePosition[]> {
  const traceId = createTraceId('p2s')
  const start = performance.now()

  console.log('[SyncTeX] syncPdfToSource:start', {
    traceId,
    projectId: context.projectId,
    buildId: context.buildId,
    page: params.page,
    h: params.h,
    v: params.v,
  })

  const search = new URLSearchParams({
    buildId: context.buildId,
    page: String(params.page),
    h: String(params.h),
    v: String(params.v),
  });

  try {
    const response = await fetch(
      `${context.clsiBaseUrl}/project/${context.projectId}/sync/pdf?${search.toString()}`,
      {
        method: 'GET',
        signal: options.signal,
      }
    );

    if (!response.ok) {
      console.warn('[SyncTeX] syncPdfToSource:http-error', {
        traceId,
        status: response.status,
        statusText: response.statusText,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
      })
      throw new Error(`SyncTeX pdf->source request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as { code?: unknown };
    const positions = parseCodePositions(payload.code)
    console.log('[SyncTeX] syncPdfToSource:success', {
      traceId,
      resultCount: positions.length,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    })
    return positions
  } catch (error) {
    const aborted = options.signal?.aborted || (error as { name?: string })?.name === 'AbortError'
    const log = aborted ? console.log : console.error
    log('[SyncTeX] syncPdfToSource:failed', {
      traceId,
      aborted,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export function normalizeComparablePath(input: string): string {
  return input
    .replace(/\\/g, '/')
    .replace(/\/\.\//g, '/')
    .replace(/^\.\/+/g, '')
    .replace(/\/{2,}/g, '/')
    .trim();
}

function parsePdfPositions(value: unknown): SynctexPdfPosition[] {
  if (!Array.isArray(value)) return [];

  const parsed: SynctexPdfPosition[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const page = numberField(item, 'page');
    const h = numberField(item, 'h');
    const v = numberField(item, 'v');
    const width = numberField(item, 'width');
    const height = numberField(item, 'height');
    if (page === null || h === null || v === null || width === null || height === null) continue;

    parsed.push({ page, h, v, width, height });
  }

  return parsed;
}

function parseCodePositions(value: unknown): SynctexCodePosition[] {
  if (!Array.isArray(value)) return [];

  const parsed: SynctexCodePosition[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const file = stringField(item, 'file');
    const line = numberField(item, 'line');
    const column = numberField(item, 'column');
    if (!file || line === null || column === null) continue;

    parsed.push({
      file: normalizeComparablePath(file),
      line,
      column,
    });
  }

  return parsed;
}

function numberField(record: object, key: string): number | null {
  const value = (record as Record<string, unknown>)[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function stringField(record: object, key: string): string | null {
  const value = (record as Record<string, unknown>)[key];
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value;
}
