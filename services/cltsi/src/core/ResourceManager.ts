import fs from 'node:fs/promises';
import path from 'node:path';
import type { CompileRequest } from '../types/index.js';
import { ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

// ── SSRF protection constants ────────────────────────────────────────

/** Max download size per file (50 MB) */
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

/** Timeout per download attempt (30 s) */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * Optional allowlist of storage origins loaded from env.
 * When set, *only* URLs whose origin matches one of these are allowed.
 *   CLSI_ALLOWED_STORAGE_ORIGINS=https://storage.googleapis.com,https://cdn.example.com
 * When unset the general SSRF guards (private-IP / protocol) still apply.
 */
const ALLOWED_ORIGINS: string[] | null = (() => {
  const raw = process.env.CLSI_ALLOWED_STORAGE_ORIGINS?.trim();
  if (!raw) return null;
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);
})();

/**
 * Hostnames / IP patterns that must never be fetched.
 * Covers loopback, link-local, private RFC-1918, and cloud metadata endpoints.
 */
const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,                 // 127.0.0.0/8
  /^10\.\d+\.\d+\.\d+$/,                  // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,  // 172.16.0.0/12
  /^192\.168\.\d+\.\d+$/,                  // 192.168.0.0/16
  /^169\.254\.\d+\.\d+$/,                  // link-local / AWS metadata
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,                            // IPv6 loopback
  /^metadata\.google\.internal$/i,         // GCP metadata
];

// ── ResourceManager ──────────────────────────────────────────────────

/**
 * ResourceManager - Handles file synchronization to compile directory
 *
 * Security: Validates all paths to prevent directory traversal attacks
 *           Validates all URLs to prevent SSRF attacks
 */
export class ResourceManager {
  // ── URL security ───────────────────────────────────────────────────

  /**
   * Validate that a resource URL is safe to fetch server-side.
   *
   * CRITICAL SECURITY FUNCTION — prevents SSRF
   *
   * Checks:
   *  1. Protocol must be HTTPS (blocks http:// to internal services)
   *  2. Hostname must not resolve to a private/reserved IP range
   *  3. If CLSI_ALLOWED_STORAGE_ORIGINS is set, origin must match
   */
  private validateResourceUrl(url: string, resourcePath: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ValidationError(
        `Invalid URL for resource "${resourcePath}"`
      );
    }

    // 1. Protocol — only HTTPS
    if (parsed.protocol !== 'https:') {
      throw new ValidationError(
        `Blocked non-HTTPS URL for resource "${resourcePath}" (protocol: ${parsed.protocol})`
      );
    }

    // 2. Hostname — block private/internal networks
    const hostname = parsed.hostname.toLowerCase();
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new ValidationError(
          `Blocked request to private/internal host for resource "${resourcePath}"`
        );
      }
    }

    // 3. Origin allowlist (when configured)
    if (ALLOWED_ORIGINS !== null) {
      const origin = parsed.origin.toLowerCase();
      if (!ALLOWED_ORIGINS.includes(origin)) {
        throw new ValidationError(
          `URL origin not in allowlist for resource "${resourcePath}"`
        );
      }
    }

    return parsed;
  }

  // ── URL downloading ────────────────────────────────────────────────

  /**
   * Download a file from a validated URL with retries, timeout, and
   * size limits.  Runs server-side so there are no CORS restrictions.
   */
  private async downloadUrl(
    url: string,
    resourcePath: string,
    retries = 2
  ): Promise<Buffer> {
    // Validate before any network access
    this.validateResourceUrl(url, resourcePath);

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

        try {
          const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });

          if (!response.ok) {
            throw new Error(
              `Storage responded ${response.status} ${response.statusText} for "${resourcePath}"`
            );
          }

          // Check Content-Length header before downloading the body
          const contentLength = Number(response.headers.get('content-length'));
          if (contentLength > MAX_DOWNLOAD_BYTES) {
            throw new ValidationError(
              `File "${resourcePath}" is too large (${(contentLength / 1024 / 1024).toFixed(1)} MB, limit ${MAX_DOWNLOAD_BYTES / 1024 / 1024} MB)`
            );
          }

          const arrayBuffer = await response.arrayBuffer();

          if (arrayBuffer.byteLength === 0) {
            throw new Error(`Storage returned empty file for "${resourcePath}"`);
          }
          if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
            throw new ValidationError(
              `File "${resourcePath}" exceeds size limit (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB, limit ${MAX_DOWNLOAD_BYTES / 1024 / 1024} MB)`
            );
          }

          return Buffer.from(arrayBuffer);
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Don't retry validation errors — they'll never succeed
        if (err instanceof ValidationError) throw err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
    }
    throw lastError!;
  }

  // ── Resource sync ──────────────────────────────────────────────────

  /**
   * Sync resources (files, URLs) to disk
   */
  async syncResourcesToDisk(
    request: CompileRequest,
    baseDir: string
  ): Promise<string[]> {
    // Create project directory
    await fs.mkdir(baseDir, { recursive: true });

    const resourceList: string[] = [];

    for (const resource of request.resources) {
      const safePath = this.validatePath(baseDir, resource.path);

      // Create parent directories
      await fs.mkdir(path.dirname(safePath), { recursive: true });

      if (resource.content) {
        // Content-based: inline text or base64 binary
        if (resource.encoding === 'base64') {
          await fs.writeFile(safePath, Buffer.from(resource.content, 'base64'));
        } else {
          await fs.writeFile(safePath, resource.content, 'utf-8');
        }
        resourceList.push(resource.path);
      } else if (resource.url) {
        // URL-based: download from storage (server-side, no CORS)
        try {
          const buffer = await this.downloadUrl(resource.url, resource.path);
          await fs.writeFile(safePath, buffer);
          resourceList.push(resource.path);
          logger.info(
            { path: resource.path, bytes: buffer.byteLength },
            'Downloaded URL resource'
          );
        } catch (err) {
          logger.error(
            { path: resource.path, err },
            'Failed to download URL resource'
          );
          throw err instanceof ValidationError
            ? err
            : new ValidationError(
                `Failed to download file "${resource.path}" from storage: ${err instanceof Error ? err.message : String(err)}`
              );
        }
      }
    }

    logger.info(
      { projectId: request.projectId, fileCount: resourceList.length },
      'Resources synced to disk'
    );

    return resourceList;
  }

  // ── Path security ──────────────────────────────────────────────────

  /**
   * Validate path to prevent directory traversal attacks
   *
   * CRITICAL SECURITY FUNCTION
   */
  private validatePath(baseDir: string, resourcePath: string): string {
    // Normalize and join paths
    const safePath = path.normalize(path.join(baseDir, resourcePath));

    // Ensure result is within baseDir (prevents ../../../etc/passwd)
    if (!safePath.startsWith(baseDir + path.sep)) {
      throw new ValidationError(
        `Invalid path - directory traversal detected: ${resourcePath}`
      );
    }

    // Additional checks
    if (resourcePath.includes('\0')) {
      throw new ValidationError('Invalid path - null byte detected');
    }

    return safePath;
  }

  /**
   * Clean up compile directory
   */
  async cleanupCompileDir(compileDir: string): Promise<void> {
    try {
      await fs.rm(compileDir, { recursive: true, force: true });
      logger.debug({ compileDir }, 'Compile directory cleaned up');
    } catch (error) {
      logger.warn({ err: error, compileDir }, 'Failed to cleanup compile directory');
    }
  }
}
