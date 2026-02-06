import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { OutputFile } from '../types/index.js';
import logger from '../utils/logger.js';
import settings from '../config/settings.js';

/**
 * CacheManager - Manages output file caching with expiry
 * 
 * Features:
 * - Unique buildId generation (timestamp + random)
 * - Age-based expiry (default 90 minutes)
 * - Count-based limits (default 2 builds per project)
 * - Async cleanup to avoid blocking
 */
export class CacheManager {
  /**
   * Save output files and return buildId
   */
  async saveOutputFiles(
    projectId: string,
    compileDir: string,
    _resourceList: string[]
  ): Promise<{ buildId: string; outputFiles: OutputFile[] }> {
    const buildId = this.generateBuildId();
    const cacheDir = path.join(settings.outputDir, projectId, 'builds', buildId);

    // Create cache directory
    await fs.mkdir(cacheDir, { recursive: true });

    // Files to cache
    const filesToCache = [
      { name: 'output.pdf', type: 'pdf' as const },
      { name: 'output.log', type: 'log' as const },
      { name: 'output.synctex.gz', type: 'synctex' as const },
    ];

    const outputFiles: OutputFile[] = [];

    for (const { name, type } of filesToCache) {
      const srcPath = path.join(compileDir, name);
      const dstPath = path.join(cacheDir, name);

      try {
        // Copy file to cache
        await fs.copyFile(srcPath, dstPath);
        const stats = await fs.stat(dstPath);

        outputFiles.push({
          path: name,
          type,
          url: `/project/${projectId}/build/${buildId}/output/${name}`,
          size: stats.size,
        });
      } catch (error) {
        // File doesn't exist (normal for failed compilations)
        logger.debug({ file: name, err: error }, 'Output file not found, skipping');
      }
    }

    logger.info(
      { projectId, buildId, fileCount: outputFiles.length },
      'Output files cached'
    );

    // Trigger cleanup asynchronously (don't await)
    this.cleanupOldBuilds(projectId).catch(err => {
      logger.warn({ err, projectId }, 'Failed to cleanup old builds');
    });

    return { buildId, outputFiles };
  }

  /**
   * Generate unique buildId: timestamp-random
   */
  private generateBuildId(): string {
    const timestamp = Date.now().toString(16);
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}`;
  }

  /**
   * Cleanup old builds based on age and count limits
   */
  private async cleanupOldBuilds(projectId: string): Promise<void> {
    const buildsDir = path.join(settings.outputDir, projectId, 'builds');

    try {
      const builds = await fs.readdir(buildsDir);

      // Sort by buildId (timestamp embedded) - newest first
      builds.sort().reverse();

      const now = Date.now();
      const toDelete: string[] = [];

      for (let i = 0; i < builds.length; i++) {
        const buildId = builds[i];

        // Keep first N builds (cache limit)
        if (i >= settings.cacheLimit) {
          toDelete.push(buildId);
          continue;
        }

        // Delete builds older than cache age
        const timestamp = parseInt(buildId.split('-')[0], 16);
        const age = now - timestamp;

        if (age > settings.cacheAge) {
          toDelete.push(buildId);
        }
      }

      // Delete in parallel
      if (toDelete.length > 0) {
        await Promise.all(
          toDelete.map(buildId =>
            fs.rm(path.join(buildsDir, buildId), { recursive: true, force: true })
          )
        );

        logger.info(
          { projectId, deletedCount: toDelete.length },
          'Cleaned up old builds'
        );
      }
    } catch (error) {
      // Builds directory might not exist yet
      logger.debug({ err: error, projectId }, 'No builds to cleanup');
    }
  }

  /**
   * Get path to cached output file
   */
  getOutputPath(projectId: string, buildId: string, filename: string): string {
    return path.join(settings.outputDir, projectId, 'builds', buildId, filename);
  }
}
