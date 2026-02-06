"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const settings_js_1 = __importDefault(require("../config/settings.js"));
/**
 * CacheManager - Manages output file caching with expiry
 *
 * Features:
 * - Unique buildId generation (timestamp + random)
 * - Age-based expiry (default 90 minutes)
 * - Count-based limits (default 2 builds per project)
 * - Async cleanup to avoid blocking
 */
class CacheManager {
    /**
     * Save output files and return buildId
     */
    async saveOutputFiles(projectId, compileDir, resourceList) {
        const buildId = this.generateBuildId();
        const cacheDir = node_path_1.default.join(settings_js_1.default.outputDir, projectId, 'builds', buildId);
        // Create cache directory
        await promises_1.default.mkdir(cacheDir, { recursive: true });
        // Files to cache
        const filesToCache = [
            { name: 'output.pdf', type: 'pdf' },
            { name: 'output.log', type: 'log' },
            { name: 'output.synctex.gz', type: 'synctex' },
        ];
        const outputFiles = [];
        for (const { name, type } of filesToCache) {
            const srcPath = node_path_1.default.join(compileDir, name);
            const dstPath = node_path_1.default.join(cacheDir, name);
            try {
                // Copy file to cache
                await promises_1.default.copyFile(srcPath, dstPath);
                const stats = await promises_1.default.stat(dstPath);
                outputFiles.push({
                    path: name,
                    type,
                    url: `/project/${projectId}/build/${buildId}/output/${name}`,
                    size: stats.size,
                });
            }
            catch (error) {
                // File doesn't exist (normal for failed compilations)
                logger_js_1.default.debug({ file: name, err: error }, 'Output file not found, skipping');
            }
        }
        logger_js_1.default.info({ projectId, buildId, fileCount: outputFiles.length }, 'Output files cached');
        // Trigger cleanup asynchronously (don't await)
        this.cleanupOldBuilds(projectId).catch(err => {
            logger_js_1.default.warn({ err, projectId }, 'Failed to cleanup old builds');
        });
        return { buildId, outputFiles };
    }
    /**
     * Generate unique buildId: timestamp-random
     */
    generateBuildId() {
        const timestamp = Date.now().toString(16);
        const random = node_crypto_1.default.randomBytes(8).toString('hex');
        return `${timestamp}-${random}`;
    }
    /**
     * Cleanup old builds based on age and count limits
     */
    async cleanupOldBuilds(projectId) {
        const buildsDir = node_path_1.default.join(settings_js_1.default.outputDir, projectId, 'builds');
        try {
            const builds = await promises_1.default.readdir(buildsDir);
            // Sort by buildId (timestamp embedded) - newest first
            builds.sort().reverse();
            const now = Date.now();
            const toDelete = [];
            for (let i = 0; i < builds.length; i++) {
                const buildId = builds[i];
                // Keep first N builds (cache limit)
                if (i >= settings_js_1.default.cacheLimit) {
                    toDelete.push(buildId);
                    continue;
                }
                // Delete builds older than cache age
                const timestamp = parseInt(buildId.split('-')[0], 16);
                const age = now - timestamp;
                if (age > settings_js_1.default.cacheAge) {
                    toDelete.push(buildId);
                }
            }
            // Delete in parallel
            if (toDelete.length > 0) {
                await Promise.all(toDelete.map(buildId => promises_1.default.rm(node_path_1.default.join(buildsDir, buildId), { recursive: true, force: true })));
                logger_js_1.default.info({ projectId, deletedCount: toDelete.length }, 'Cleaned up old builds');
            }
        }
        catch (error) {
            // Builds directory might not exist yet
            logger_js_1.default.debug({ err: error, projectId }, 'No builds to cleanup');
        }
    }
    /**
     * Get path to cached output file
     */
    getOutputPath(projectId, buildId, filename) {
        return node_path_1.default.join(settings_js_1.default.outputDir, projectId, 'builds', buildId, filename);
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheManager.js.map