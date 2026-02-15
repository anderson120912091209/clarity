import type { CompileRequest } from '../types/index.js';
/**
 * ResourceManager - Handles file synchronization to compile directory
 *
 * Security: Validates all paths to prevent directory traversal attacks
 */
export declare class ResourceManager {
    /**
     * Sync resources (files, URLs) to disk
     */
    syncResourcesToDisk(request: CompileRequest, baseDir: string): Promise<string[]>;
    /**
     * Validate path to prevent directory traversal attacks
     *
     * CRITICAL SECURITY FUNCTION
     */
    private validatePath;
    /**
     * Clean up compile directory
     */
    cleanupCompileDir(compileDir: string): Promise<void>;
}
//# sourceMappingURL=ResourceManager.d.ts.map