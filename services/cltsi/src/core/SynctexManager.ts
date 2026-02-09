import fs from 'node:fs/promises';
import path from 'node:path';
import { DockerExecutor } from './DockerExecutor.js';
import { CacheManager } from './CacheManager.js';
import { ValidationError } from '../utils/errors.js';
import settings from '../config/settings.js';
import logger from '../utils/logger.js';

export interface SyncFromCodeRequest {
  buildId: string;
  file: string;
  line: number;
  column: number;
}

export interface SyncFromPdfRequest {
  buildId: string;
  page: number;
  h: number;
  v: number;
}

export interface SynctexPdfPosition {
  page: number;
  h: number;
  v: number;
  width: number;
  height: number;
}

export interface SynctexCodePosition {
  file: string;
  line: number;
  column: number;
}

export class SynctexNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SynctexNotFoundError';
  }
}

interface ParsedRecord {
  [key: string]: number | string | undefined;
}

export class SynctexManager {
  private dockerExecutor: DockerExecutor;
  private cacheManager: CacheManager;

  constructor(dockerExecutor: DockerExecutor, cacheManager: CacheManager) {
    this.dockerExecutor = dockerExecutor;
    this.cacheManager = cacheManager;
  }

  async syncFromCode(
    projectId: string,
    request: SyncFromCodeRequest
  ): Promise<{ pdf: SynctexPdfPosition[] }> {
    const file = normalizeSynctexPath(request.file);
    if (!file) {
      throw new ValidationError('Query parameter "file" is required');
    }

    const line = toPositiveInteger(request.line, 'line');
    const column = toNonNegativeInteger(request.column, 'column');

    const buildDir = await this.ensureSynctexArtifacts(projectId, request.buildId);
    const command = ['synctex', 'view', '-i', `${line}:${column}:${file}`, '-o', 'output.pdf'];
    const stdout = await this.runSynctex(projectId, buildDir, command);

    return {
      pdf: parseViewOutput(stdout),
    };
  }

  async syncFromPdf(
    projectId: string,
    request: SyncFromPdfRequest
  ): Promise<{ code: SynctexCodePosition[] }> {
    const page = toPositiveInteger(request.page, 'page');
    const h = toFiniteNumber(request.h, 'h');
    const v = toFiniteNumber(request.v, 'v');

    const buildDir = await this.ensureSynctexArtifacts(projectId, request.buildId);
    const command = ['synctex', 'edit', '-o', `${page}:${h}:${v}:output.pdf`];
    const stdout = await this.runSynctex(projectId, buildDir, command);

    return {
      code: parseEditOutput(stdout),
    };
  }

  private async ensureSynctexArtifacts(projectId: string, buildId: string): Promise<string> {
    if (!buildId || buildId.trim() === '') {
      throw new ValidationError('Query parameter "buildId" is required');
    }

    const buildDir = this.cacheManager.getBuildPath(projectId, buildId);
    await this.ensureFileExists(path.join(buildDir, 'output.pdf'), 'output.pdf');
    await this.ensureFileExists(path.join(buildDir, 'output.synctex.gz'), 'output.synctex.gz');
    return buildDir;
  }

  private async ensureFileExists(filePath: string, fileName: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new SynctexNotFoundError(`Expected file ${fileName} is not a file`);
      }
    } catch {
      throw new SynctexNotFoundError(`Missing ${fileName}`);
    }
  }

  private async runSynctex(
    projectId: string,
    buildDir: string,
    command: string[]
  ): Promise<string> {
    logger.debug({ projectId, buildDir, command }, 'Running SyncTeX command');

    const result = await this.dockerExecutor.run({
      projectId: `${projectId}-synctex`,
      command,
      directory: buildDir,
      image: settings.texliveImage,
      timeout: Math.min(settings.compileTimeout, 30000),
      environment: {},
      networkDisabled: true,
    });

    if (result.exitCode !== 0) {
      throw new ValidationError(
        `SyncTeX command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
      );
    }

    return result.stdout;
  }
}

function parseViewOutput(output: string): SynctexPdfPosition[] {
  const records = parseOutput(output);
  const parsed: SynctexPdfPosition[] = [];

  for (const record of records) {
    const page = getNumber(record, 'Page');
    const h = getNumber(record, 'h');
    const v = getNumber(record, 'v');
    const width = getNumber(record, 'W');
    const height = getNumber(record, 'H');

    if (page === null || h === null || v === null || width === null || height === null) {
      continue;
    }

    parsed.push({ page, h, v, width, height });
  }

  return parsed;
}

function parseEditOutput(output: string): SynctexCodePosition[] {
  const records = parseOutput(output);
  const parsed: SynctexCodePosition[] = [];

  for (const record of records) {
    const rawFile = getString(record, 'Input');
    const line = getNumber(record, 'Line');
    const column = getNumber(record, 'Column');
    if (!rawFile || line === null || column === null) {
      continue;
    }

    parsed.push({
      file: normalizeSynctexPath(rawFile),
      line,
      column,
    });
  }

  return parsed;
}

function parseOutput(output: string): ParsedRecord[] {
  const lines = output.split('\n');
  const records: ParsedRecord[] = [];
  let currentRecord: ParsedRecord | null = null;

  for (const line of lines) {
    const [label, value] = splitLine(line);
    if (!label || label === 'SyncTeX result begin' || label === 'SyncTeX result end') continue;

    // A new mapping record may start with either Output (view mode) or Input (edit mode).
    if (label === 'Output' || label === 'Input') {
      if (currentRecord) {
        records.push(currentRecord);
      }
      currentRecord = { [label]: value };
      continue;
    }

    if (!currentRecord) {
      currentRecord = {};
    }
    currentRecord[label] = value;
  }

  if (currentRecord) {
    records.push(currentRecord);
  }

  return records;
}

function splitLine(line: string): [string, string] {
  const splitIndex = line.indexOf(':');
  if (splitIndex === -1) return ['', line.trim()];
  return [line.slice(0, splitIndex).trim(), line.slice(splitIndex + 1).trim()];
}

function getNumber(record: ParsedRecord, key: string): number | null {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function getString(record: ParsedRecord, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.trim();
}

function toPositiveInteger(value: number, key: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`Query parameter "${key}" must be a positive integer`);
  }
  return value;
}

function toNonNegativeInteger(value: number, key: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`Query parameter "${key}" must be a non-negative integer`);
  }
  return value;
}

function toFiniteNumber(value: number, key: string): number {
  if (!Number.isFinite(value)) {
    throw new ValidationError(`Query parameter "${key}" must be a finite number`);
  }
  return value;
}

function normalizeSynctexPath(input: string): string {
  const normalizedSlashes = input.replace(/\\/g, '/');
  let normalized = normalizedSlashes;

  if (path.isAbsolute(normalizedSlashes)) {
    normalized = normalizedSlashes.replace(/^\/compile\/?/u, '');
  }

  normalized = normalized.replace(/^\.\/+/u, '');
  normalized = normalized.replace(/\/\.\//g, '/');
  normalized = normalized.replace(/\/{2,}/g, '/');

  return normalized;
}
