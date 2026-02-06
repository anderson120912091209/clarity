"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockManager = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * LockManager - Ensures only one compilation per project at a time
 *
 * Implements in-memory project-level locks with FIFO queuing.
 * For multi-instance deployment, consider upgrading to Redis-based locks.
 */
class LockManager {
    locks = new Map();
    /**
     * Acquire lock for a project (waits if already locked)
     */
    async acquire(projectId) {
        logger_js_1.default.debug({ projectId }, 'Attempting to acquire lock');
        // Wait for existing lock if present
        const existingLock = this.locks.get(projectId);
        if (existingLock) {
            logger_js_1.default.debug({ projectId }, 'Waiting for existing lock');
            await existingLock;
        }
        // Create new lock
        let releaseFn;
        const lockPromise = new Promise(resolve => {
            releaseFn = resolve;
        });
        this.locks.set(projectId, lockPromise);
        logger_js_1.default.debug({ projectId }, 'Lock acquired');
        return {
            release: () => {
                logger_js_1.default.debug({ projectId }, 'Lock released');
                this.locks.delete(projectId);
                releaseFn();
            },
        };
    }
}
exports.LockManager = LockManager;
//# sourceMappingURL=LockManager.js.map