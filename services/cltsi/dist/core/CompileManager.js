"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompileManager = void 0;
const node_path_1 = __importDefault(require("node:path"));
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const settings_js_1 = __importDefault(require("../config/settings.js"));
/**
 * CompileManager - Orchestrates the compilation workflow
 *
 * Flow:
 * 1. Acquire project lock
 * 2. Sync resources to disk
 * 3. Run LaTeX compilation in Docker
 * 4. Save output files and generate buildId
 * 5. Release lock (even on error)
 */
class CompileManager {
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
     * Compile a LaTeX project
     */
    async compile(request) {
        const { projectId } = request;
        const compileDir = node_path_1.default.join(settings_js_1.default.compileDir, projectId);
        logger_js_1.default.info({ projectId, compiler: request.compiler }, 'Starting compilation');
        // Step 1: Acquire lock to prevent concurrent compilations
        const lock = await this.lockManager.acquire(projectId);
        try {
            // Step 2: Sync resources to disk
            const resourceList = await this.resourceManager.syncResourcesToDisk(request, compileDir);
            // Step 3: Run compilation
            try {
                await this.runCompilation(projectId, request, compileDir);
                // Step 4: Save output files (compilation succeeded)
                const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(projectId, compileDir, resourceList);
                logger_js_1.default.info({ projectId, buildId }, 'Compilation successful');
                return {
                    status: 'success',
                    buildId,
                    outputFiles,
                };
            }
            catch (error) {
                // Compilation failed, but still save logs for debugging
                const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(projectId, compileDir, resourceList);
                logger_js_1.default.warn({ projectId, buildId, err: error }, 'Compilation failed');
                // Determine error type
                let status = 'error';
                if (error instanceof Error) {
                    if (error.name === 'TimeoutError')
                        status = 'timeout';
                    if (error.message.includes('terminated'))
                        status = 'terminated';
                }
                throw new errors_js_1.CompilationError(error instanceof Error ? error.message : 'Compilation failed', { buildId, outputFiles });
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
        logger_js_1.default.info({ projectId }, 'Stop compilation requested');
        // For now, timeout will handle this
    }
    /**
     * Clear all cached builds for a project
     */
    async clearCache(projectId) {
        const projectOutputDir = node_path_1.default.join(settings_js_1.default.outputDir, projectId);
        await this.resourceManager.cleanupCompileDir(projectOutputDir);
        logger_js_1.default.info({ projectId }, 'Cache cleared');
    }
    async runCompilation(projectId, request, compileDir) {
        const timeout = request.timeout || settings_js_1.default.compileTimeout;
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
}
exports.CompileManager = CompileManager;
//# sourceMappingURL=CompileManager.js.map