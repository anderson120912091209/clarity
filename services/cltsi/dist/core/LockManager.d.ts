import type { Lock } from '../../src/types/index.js';
/**
 * LockManager - Ensures only one compilation per project at a time
 *
 * Implements in-memory project-level locks with FIFO queuing.
 * For multi-instance deployment, consider upgrading to Redis-based locks.
 */
export declare class LockManager {
    private locks;
    /**
     * Acquire lock for a project (waits if already locked)
     */
    acquire(projectId: string): Promise<Lock>;
}
//# sourceMappingURL=LockManager.d.ts.map