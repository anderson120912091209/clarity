import path from 'node:path';
import fs from 'node:fs/promises';
import type { CompileRequest, CompileResult } from '../types/index.js';
import { CompilationError } from '../utils/errors.js';
import { LockManager } from './LockManager.js';
import { ResourceManager } from './ResourceManager.js';
import { LatexRunner } from './LatexRunner.js';
import { TypstRunner } from './TypstRunner.js';
import { CacheManager } from './CacheManager.js';
import logger from '../utils/logger.js';
import settings from '../config/settings.js';

/**
 * CompileManager - Orchestrates the compilation workflow
 * 
 * Flow:
 * 1. Acquire project lock
 * 2. Sync resources to disk
 * 3. Run compiler (LaTeX/Typst) in Docker
 * 4. Save output files and generate buildId
 * 5. Release lock (even on error)
 */
export class CompileManager {
  private lockManager: LockManager;
  private resourceManager: ResourceManager;
  private latexRunner: LatexRunner;
  private typstRunner: TypstRunner;
  private cacheManager: CacheManager;

  constructor(
    lockManager: LockManager,
    resourceManager: ResourceManager,
    latexRunner: LatexRunner,
    typstRunner: TypstRunner,
    cacheManager: CacheManager
  ) {
    this.lockManager = lockManager;
    this.resourceManager = resourceManager;
    this.latexRunner = latexRunner;
    this.typstRunner = typstRunner;
    this.cacheManager = cacheManager;
  }

  /**
   * Compile a document project
   */
  async compile(request: CompileRequest): Promise<CompileResult> {
    const { projectId } = request;
    const compileDir = path.join(settings.compileDir, projectId);

    logger.info({ projectId, compiler: request.compiler }, 'Starting compilation');

    // Step 1: Acquire lock to prevent concurrent compilations
    const lock = await this.lockManager.acquire(projectId);

    try {
      // Step 2: Sync resources to disk
      const resourceList = await this.resourceManager.syncResourcesToDisk(
        request,
        compileDir
      );

      // Clear previous compiler outputs so stale artifacts don't leak into this build.
      await this.clearPreviousOutputs(compileDir);

      // Step 3: Run compilation
      try {
        await this.runCompilation(projectId, request, compileDir);

        // Step 4: Save output files (compilation succeeded)
        const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(
          projectId,
          compileDir,
          resourceList
        );

        logger.info({ projectId, buildId }, 'Compilation successful');

        return {
          status: 'success',
          buildId,
          outputFiles,
        };

      } catch (error) {
        // Compilation failed, but still save logs for debugging
        const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(
          projectId,
          compileDir,
          resourceList
        );

        logger.warn({ projectId, buildId, err: error }, 'Compilation failed');

        // Determine error type
        let status: 'error' | 'timeout' | 'terminated' = 'error';
        if (error instanceof Error) {
          if (error.name === 'TimeoutError') status = 'timeout';
          if (error.message.includes('terminated')) status = 'terminated';
        }

        throw new CompilationError(
          error instanceof Error ? error.message : 'Compilation failed',
          { buildId, outputFiles }
        );
      }

    } finally {
      // Step 5: Always release lock
      lock.release();
    }
  }

  /**
   * Stop a running compilation
   */
  async stopCompile(projectId: string): Promise<void> {
    // TODO: Implement container killing logic
    logger.info({ projectId }, 'Stop compilation requested');
    // For now, timeout will handle this
  }

  /**
   * Clear all cached builds for a project
   */
  async clearCache(projectId: string): Promise<void> {
    const projectOutputDir = path.join(settings.outputDir, projectId);
    await this.resourceManager.cleanupCompileDir(projectOutputDir);
    logger.info({ projectId }, 'Cache cleared');
  }

  private async runCompilation(
    projectId: string,
    request: CompileRequest,
    compileDir: string
  ): Promise<void> {
    const timeout = request.timeout || settings.compileTimeout;

    if (request.compiler === 'typst') {
      await this.typstRunner.runTypst(projectId, {
        directory: compileDir,
        mainFile: request.rootResourcePath,
        timeout,
      });
      return;
    }

    await this.latexRunner.runLatex(projectId, {
      directory: compileDir,
      mainFile: request.rootResourcePath,
      compiler: request.compiler,
      timeout,
      stopOnFirstError: request.stopOnFirstError,
    });
  }

  private async clearPreviousOutputs(compileDir: string): Promise<void> {
    const outputFiles = [
      'output.pdf',
      'output.log',
      'output.synctex.gz',
      'output.aux',
      'output.out',
      'output.fdb_latexmk',
      'output.fls',
      'output.bbl',
      'output.blg',
    ];

    await Promise.all(
      outputFiles.map((file) => fs.rm(path.join(compileDir, file), { force: true }))
    );
  }
}
