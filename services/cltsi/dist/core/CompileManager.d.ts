import type { CompileRequest, CompileResult } from '../../src/types/index.js';
import { LockManager } from '../../src/core/LockManager.js';
import { ResourceManager } from '../../src/core/ResourceManager.js';
import { LatexRunner } from '../../src/core/LatexRunner.js';
import { TypstRunner } from '../../src/core/TypstRunner.js';
import { CacheManager } from '../../src/core/CacheManager.js';
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
export declare class CompileManager {
    private lockManager;
    private resourceManager;
    private latexRunner;
    private typstRunner;
    private cacheManager;
    constructor(lockManager: LockManager, resourceManager: ResourceManager, latexRunner: LatexRunner, typstRunner: TypstRunner, cacheManager: CacheManager);
    /**
     * Compile a LaTeX project
     */
    compile(request: CompileRequest): Promise<CompileResult>;
    /**
     * Stop a running compilation
     */
    stopCompile(projectId: string): Promise<void>;
    /**
     * Clear all cached builds for a project
     */
    clearCache(projectId: string): Promise<void>;
    private runCompilation;
}
//# sourceMappingURL=CompileManager.d.ts.map