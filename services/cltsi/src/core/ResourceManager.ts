import fs from 'node:fs/promises';
import path from 'node:path';
import type { CompileRequest } from '../types/index.js';
import { ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * ResourceManager - Handles file synchronization to compile directory
 *
 * Security: Validates all paths to prevent directory traversal attacks
 */
export class ResourceManager {
  /**
   * Download a file from a URL with retries.
   * Runs server-side so there are no CORS restrictions.
   */
  private async downloadUrl(
    url: string,
    resourcePath: string,
    retries = 2
  ): Promise<Buffer> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Storage responded ${response.status} ${response.statusText} for "${resourcePath}"`
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          throw new Error(`Storage returned empty file for "${resourcePath}"`);
        }
        return Buffer.from(arrayBuffer);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
    }
    throw lastError!;
  }

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
            { path: resource.path, url: resource.url, err },
            'Failed to download URL resource'
          );
          throw new ValidationError(
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
