import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../utils/errors.js';
import settings from '../config/settings.js';
import logger from '../utils/logger.js';
export class SynctexNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SynctexNotFoundError';
    }
}
export class SynctexManager {
    dockerExecutor;
    cacheManager;
    constructor(dockerExecutor, cacheManager) {
        this.dockerExecutor = dockerExecutor;
        this.cacheManager = cacheManager;
    }
    async syncFromCode(projectId, request) {
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
    async syncFromPdf(projectId, request) {
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
    async ensureSynctexArtifacts(projectId, buildId) {
        if (!buildId || buildId.trim() === '') {
            throw new ValidationError('Query parameter "buildId" is required');
        }
        const buildDir = this.cacheManager.getBuildPath(projectId, buildId);
        await this.ensureFileExists(path.join(buildDir, 'output.pdf'), 'output.pdf');
        await this.ensureFileExists(path.join(buildDir, 'output.synctex.gz'), 'output.synctex.gz');
        return buildDir;
    }
    async ensureFileExists(filePath, fileName) {
        try {
            const stats = await fs.stat(filePath);
            if (!stats.isFile()) {
                throw new SynctexNotFoundError(`Expected file ${fileName} is not a file`);
            }
        }
        catch {
            throw new SynctexNotFoundError(`Missing ${fileName}`);
        }
    }
    async runSynctex(projectId, buildDir, command) {
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
            throw new ValidationError(`SyncTeX command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
        }
        return result.stdout;
    }
}
function parseViewOutput(output) {
    const records = parseOutput(output);
    const parsed = [];
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
function parseEditOutput(output) {
    const records = parseOutput(output);
    const parsed = [];
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
function parseOutput(output) {
    const lines = output.split('\n');
    const records = [];
    let currentRecord = null;
    for (const line of lines) {
        const [label, value] = splitLine(line);
        if (!label || label === 'SyncTeX result begin' || label === 'SyncTeX result end')
            continue;
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
function splitLine(line) {
    const splitIndex = line.indexOf(':');
    if (splitIndex === -1)
        return ['', line.trim()];
    return [line.slice(0, splitIndex).trim(), line.slice(splitIndex + 1).trim()];
}
function getNumber(record, key) {
    const value = record[key];
    if (typeof value !== 'string')
        return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return null;
    return parsed;
}
function getString(record, key) {
    const value = record[key];
    if (typeof value !== 'string' || value.trim() === '')
        return null;
    return value.trim();
}
function toPositiveInteger(value, key) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new ValidationError(`Query parameter "${key}" must be a positive integer`);
    }
    return value;
}
function toNonNegativeInteger(value, key) {
    if (!Number.isInteger(value) || value < 0) {
        throw new ValidationError(`Query parameter "${key}" must be a non-negative integer`);
    }
    return value;
}
function toFiniteNumber(value, key) {
    if (!Number.isFinite(value)) {
        throw new ValidationError(`Query parameter "${key}" must be a finite number`);
    }
    return value;
}
function normalizeSynctexPath(input) {
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
//# sourceMappingURL=SynctexManager.js.map