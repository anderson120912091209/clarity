import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
/**
 * ResourceManager - Handles file synchronization to compile directory
 *
 * Security: Validates all paths to prevent directory traversal attacks
 */
export class ResourceManager {
    /**
     * Sync resources (files, URLs) to disk
     */
    async syncResourcesToDisk(request, baseDir) {
        // Create project directory
        await fs.mkdir(baseDir, { recursive: true });
        const resourceList = [];
        for (const resource of request.resources) {
            const safePath = this.validatePath(baseDir, resource.path);
            // Create parent directories
            await fs.mkdir(path.dirname(safePath), { recursive: true });
            // Write content (URL support can be added later)
            if (resource.content) {
                if (resource.encoding === 'base64') {
                    await fs.writeFile(safePath, Buffer.from(resource.content, 'base64'));
                }
                else {
                    await fs.writeFile(safePath, resource.content, 'utf-8');
                }
                resourceList.push(resource.path);
            }
            else if (resource.url) {
                // TODO: Implement URL downloading with caching
                logger.warn({ path: resource.path, url: resource.url }, 'URL resources not yet implemented, skipping');
            }
        }
        logger.info({ projectId: request.projectId, fileCount: resourceList.length }, 'Resources synced to disk');
        return resourceList;
    }
    /**
     * Validate path to prevent directory traversal attacks
     *
     * CRITICAL SECURITY FUNCTION
     */
    validatePath(baseDir, resourcePath) {
        // Normalize and join paths
        const safePath = path.normalize(path.join(baseDir, resourcePath));
        // Ensure result is within baseDir (prevents ../../../etc/passwd)
        if (!safePath.startsWith(baseDir + path.sep)) {
            throw new ValidationError(`Invalid path - directory traversal detected: ${resourcePath}`);
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
    async cleanupCompileDir(compileDir) {
        try {
            await fs.rm(compileDir, { recursive: true, force: true });
            logger.debug({ compileDir }, 'Compile directory cleaned up');
        }
        catch (error) {
            logger.warn({ err: error, compileDir }, 'Failed to cleanup compile directory');
        }
    }
}
//# sourceMappingURL=ResourceManager.js.map