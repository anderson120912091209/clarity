"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceManager = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * ResourceManager - Handles file synchronization to compile directory
 *
 * Security: Validates all paths to prevent directory traversal attacks
 */
class ResourceManager {
    /**
     * Sync resources (files, URLs) to disk
     */
    async syncResourcesToDisk(request, baseDir) {
        // Create project directory
        await promises_1.default.mkdir(baseDir, { recursive: true });
        const resourceList = [];
        for (const resource of request.resources) {
            const safePath = this.validatePath(baseDir, resource.path);
            // Create parent directories
            await promises_1.default.mkdir(node_path_1.default.dirname(safePath), { recursive: true });
            // Write content (URL support can be added later)
            if (resource.content) {
                if (resource.encoding === 'base64') {
                    await promises_1.default.writeFile(safePath, Buffer.from(resource.content, 'base64'));
                }
                else {
                    await promises_1.default.writeFile(safePath, resource.content, 'utf-8');
                }
                resourceList.push(resource.path);
            }
            else if (resource.url) {
                // TODO: Implement URL downloading with caching
                logger_js_1.default.warn({ path: resource.path, url: resource.url }, 'URL resources not yet implemented, skipping');
            }
        }
        logger_js_1.default.info({ projectId: request.projectId, fileCount: resourceList.length }, 'Resources synced to disk');
        return resourceList;
    }
    /**
     * Validate path to prevent directory traversal attacks
     *
     * CRITICAL SECURITY FUNCTION
     */
    validatePath(baseDir, resourcePath) {
        // Normalize and join paths
        const safePath = node_path_1.default.normalize(node_path_1.default.join(baseDir, resourcePath));
        // Ensure result is within baseDir (prevents ../../../etc/passwd)
        if (!safePath.startsWith(baseDir + node_path_1.default.sep)) {
            throw new errors_js_1.ValidationError(`Invalid path - directory traversal detected: ${resourcePath}`);
        }
        // Additional checks
        if (resourcePath.includes('\0')) {
            throw new errors_js_1.ValidationError('Invalid path - null byte detected');
        }
        return safePath;
    }
    /**
     * Clean up compile directory
     */
    async cleanupCompileDir(compileDir) {
        try {
            await promises_1.default.rm(compileDir, { recursive: true, force: true });
            logger_js_1.default.debug({ compileDir }, 'Compile directory cleaned up');
        }
        catch (error) {
            logger_js_1.default.warn({ err: error, compileDir }, 'Failed to cleanup compile directory');
        }
    }
}
exports.ResourceManager = ResourceManager;
//# sourceMappingURL=ResourceManager.js.map