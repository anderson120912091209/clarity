import logger from '../utils/logger.js';
/**
 * LockManager - Ensures only one compilation per project at a time
 *
 * Implements in-memory project-level locks with FIFO queuing.
 * For multi-instance deployment, consider upgrading to Redis-based locks.
 */
export class LockManager {
    locks = new Map();
    /**
     * Acquire lock for a project (waits if already locked)
     */
    async acquire(projectId) {
        logger.debug({ projectId }, 'Attempting to acquire lock');
        // Wait for existing lock if present
        const existingLock = this.locks.get(projectId);
        if (existingLock) {
            logger.debug({ projectId }, 'Waiting for existing lock');
            await existingLock;
        }
        // Create new lock
        let releaseFn;
        const lockPromise = new Promise(resolve => {
            releaseFn = resolve;
        });
        this.locks.set(projectId, lockPromise);
        logger.debug({ projectId }, 'Lock acquired');
        return {
            release: () => {
                logger.debug({ projectId }, 'Lock released');
                this.locks.delete(projectId);
                releaseFn();
            },
        };
    }
}
//# sourceMappingURL=LockManager.js.map