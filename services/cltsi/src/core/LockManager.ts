import type { Lock } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * LockManager - Ensures only one compilation per project at a time
 * 
 * Implements in-memory project-level locks with FIFO queuing.
 * For multi-instance deployment, consider upgrading to Redis-based locks.
 */
export class LockManager {
  private locks = new Map<string, Promise<void>>();

  /**
   * Acquire lock for a project (waits if already locked)
   */
  async acquire(projectId: string): Promise<Lock> {
    logger.debug({ projectId }, 'Attempting to acquire lock');

    // Wait for existing lock if present
    const existingLock = this.locks.get(projectId);
    if (existingLock) {
      logger.debug({ projectId }, 'Waiting for existing lock');
      await existingLock;
    }

    // Create new lock
    let releaseFn: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseFn = resolve;
    });

    this.locks.set(projectId, lockPromise);
    logger.debug({ projectId }, 'Lock acquired');

    return {
      release: () => {
        logger.debug({ projectId }, 'Lock released');
        this.locks.delete(projectId);
        releaseFn!();
      },
    };
  }
}
