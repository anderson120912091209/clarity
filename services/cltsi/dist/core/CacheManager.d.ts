import type { OutputFile } from '../../src/types/index.js';
/**
 * CacheManager - Manages output file caching with expiry
 *
 * Features:
 * - Unique buildId generation (timestamp + random)
 * - Age-based expiry (default 90 minutes)
 * - Count-based limits (default 2 builds per project)
 * - Async cleanup to avoid blocking
 */
export declare class CacheManager {
    /**
     * Save output files and return buildId
     */
    saveOutputFiles(projectId: string, compileDir: string, resourceList: string[]): Promise<{
        buildId: string;
        outputFiles: OutputFile[];
    }>;
    /**
     * Generate unique buildId: timestamp-random
     */
    private generateBuildId;
    /**
     * Cleanup old builds based on age and count limits
     */
    private cleanupOldBuilds;
    /**
     * Get path to cached output file
     */
    getOutputPath(projectId: string, buildId: string, filename: string): string;
}
//# sourceMappingURL=CacheManager.d.ts.map