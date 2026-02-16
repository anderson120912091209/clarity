import path from 'node:path';
import fs from 'node:fs/promises';
import { CompilationError } from '../utils/errors.js';
import { buildCompileDiagnostics } from '../utils/compile-diagnostics.js';
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
    lockManager;
    resourceManager;
    latexRunner;
    typstRunner;
    cacheManager;
    constructor(lockManager, resourceManager, latexRunner, typstRunner, cacheManager) {
        this.lockManager = lockManager;
        this.resourceManager = resourceManager;
        this.latexRunner = latexRunner;
        this.typstRunner = typstRunner;
        this.cacheManager = cacheManager;
    }
    /**
     * Compile a document project
     */
    async compile(request) {
        const { projectId } = request;
        const compileDir = path.join(settings.compileDir, projectId);
        logger.info({ projectId, compiler: request.compiler }, 'Starting compilation');
        // Step 1: Acquire lock to prevent concurrent compilations
        const lock = await this.lockManager.acquire(projectId);
        try {
            // Step 2: Sync resources to disk
            const resourceList = await this.resourceManager.syncResourcesToDisk(request, compileDir);
            // Clear previous compiler outputs so stale artifacts don't leak into this build.
            await this.clearPreviousOutputs(compileDir);
            // Step 3: Run compilation
            try {
                await this.runCompilation(projectId, request, compileDir);
                // Step 4: Save output files (compilation succeeded)
                const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(projectId, compileDir, resourceList);
                const hasPdf = outputFiles.some((file) => file.path === 'output.pdf');
                if (!hasPdf) {
                    const diagnostics = await buildCompileDiagnostics({
                        compileDir,
                        compiler: request.compiler,
                        fallbackMessage: `${request.compiler.toUpperCase()} compilation did not generate output.pdf.`,
                    });
                    throw new CompilationError(diagnostics.summary, {
                        buildId,
                        outputFiles,
                        diagnostics,
                    });
                }
                logger.info({ projectId, buildId }, 'Compilation successful');
                return {
                    status: 'success',
                    buildId,
                    outputFiles,
                };
            }
            catch (error) {
                // Compilation failed, but still save logs for debugging
                const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(projectId, compileDir, resourceList);
                const fallbackMessage = error instanceof Error ? error.message : 'Compilation failed';
                const diagnostics = await buildCompileDiagnostics({
                    compileDir,
                    compiler: request.compiler,
                    fallbackMessage,
                });
                logger.warn({ projectId, buildId, err: error }, 'Compilation failed');
                // Determine error type
                throw new CompilationError(diagnostics.summary, { buildId, outputFiles, diagnostics });
            }
        }
        finally {
            // Step 5: Always release lock
            lock.release();
        }
    }
    /**
     * Stop a running compilation
     */
    async stopCompile(projectId) {
        // TODO: Implement container killing logic
        logger.info({ projectId }, 'Stop compilation requested');
        // For now, timeout will handle this
    }
    /**
     * Clear all cached builds for a project
     */
    async clearCache(projectId) {
        const projectOutputDir = path.join(settings.outputDir, projectId);
        await this.resourceManager.cleanupCompileDir(projectOutputDir);
        logger.info({ projectId }, 'Cache cleared');
    }
    async runCompilation(projectId, request, compileDir) {
        const timeout = request.timeout || settings.compileTimeout;
        if (request.compiler === 'typst') {
            await this.typstRunner.runTypst(projectId, {
                directory: compileDir,
                mainFile: request.rootResourcePath,
                timeout,
                allowNetwork: request.allowNetwork,
            });
            return;
        }
        await this.latexRunner.runLatex(projectId, {
            directory: compileDir,
            mainFile: request.rootResourcePath,
            compiler: request.compiler,
            timeout,
            stopOnFirstError: request.stopOnFirstError !== false,
        });
    }
    async clearPreviousOutputs(compileDir) {
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
        await Promise.all(outputFiles.map((file) => fs.rm(path.join(compileDir, file), { force: true })));
    }
}
//# sourceMappingURL=CompileManager.js.map