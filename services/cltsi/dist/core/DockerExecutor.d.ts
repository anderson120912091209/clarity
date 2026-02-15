import type { DockerRunOptions, DockerResult } from '../types/index.js';
/**
 * DockerExecutor - Manages sandboxed LaTeX compilation in Docker containers
 *
 * Security features:
 * - Network isolation (NetworkDisabled: true)
 * - No capabilities (CapDrop: ALL)
 * - Seccomp syscall filtering
 * - Resource limits (memory, CPU time)
 * - Non-root user execution
 * - Auto-cleanup after completion
 */
export declare class DockerExecutor {
    private docker;
    constructor();
    /**
     * Run a command in an isolated Docker container
     */
    run(options: DockerRunOptions): Promise<DockerResult>;
    /**
     * Wait for container to complete
     */
    private waitForContainer;
    /**
     * Kill container after timeout
     */
    private timeoutContainer;
    /**
     * Load seccomp profile for container security
     * Note: On Docker for Mac, we need to pass the JSON content inline, not a file path
     */
    private loadSeccompProfile;
    /**
     * Test Docker connection and pull TeX Live image if needed
     */
    initialize(): Promise<void>;
    /**
     * Pull Docker image
     */
    private pullImage;
}
//# sourceMappingURL=DockerExecutor.d.ts.map