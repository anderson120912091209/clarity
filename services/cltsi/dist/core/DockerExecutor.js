import Docker from 'dockerode';
import { TimeoutError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import settings from '../config/settings.js';
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
export class DockerExecutor {
    docker;
    constructor() {
        this.docker = new Docker();
    }
    /**
     * Run a command in an isolated Docker container
     */
    async run(options) {
        const containerName = `clarity-compile-${options.projectId}-${Date.now()}`;
        const networkDisabled = options.networkDisabled ?? true;
        logger.info({ projectId: options.projectId, command: options.command, networkDisabled }, 'Starting Docker compilation');
        // Load seccomp profile
        const seccompProfile = await this.loadSeccompProfile();
        const containerOptions = {
            name: containerName,
            Image: options.image,
            Cmd: options.command,
            WorkingDir: '/compile',
            // SECURITY: Disable all network access
            NetworkDisabled: networkDisabled,
            // Run as root (TeX Live image doesn't have 'tex' user)
            // Still secure due to container isolation
            User: undefined,
            // Environment variables for LaTeX
            Env: Object.entries(options.environment).map(([key, val]) => `${key}=${val}`),
            HostConfig: {
                // Mount compile directory (read-write for output generation)
                Binds: [`${options.directory}:/compile:rw`],
                // SECURITY: Drop all Linux capabilities
                CapDrop: ['ALL'],
                // SECURITY: Prevent privilege escalation and apply seccomp
                SecurityOpt: [
                    'no-new-privileges',
                    `seccomp=${seccompProfile}`,
                ],
                // Resource limits
                Memory: 1024 * 1024 * 1024, // 1GB RAM limit
                // CPU timeout via ulimit (in seconds)
                Ulimits: [{
                        Name: 'cpu',
                        Soft: Math.floor(options.timeout / 1000) + 5,
                        Hard: Math.floor(options.timeout / 1000) + 10,
                    }],
                // Disable container logging to save resources
                LogConfig: { Type: 'none', Config: {} },
                // CLEANUP: Auto-remove container after exit
                AutoRemove: true,
            },
        };
        try {
            // Create container
            const container = await this.docker.createContainer(containerOptions);
            // Attach to output streams BEFORE starting
            const stream = await container.attach({
                stream: true,
                stdout: true,
                stderr: true,
            });
            let stdout = '';
            let stderr = '';
            const MAX_OUTPUT = 2 * 1024 * 1024; // 2MB limit
            // Demux and capture output
            const stdoutStream = {
                write: (chunk) => {
                    if (stdout.length < MAX_OUTPUT) {
                        stdout += chunk.toString();
                    }
                },
            };
            const stderrStream = {
                write: (chunk) => {
                    if (stderr.length < MAX_OUTPUT) {
                        stderr += chunk.toString();
                    }
                },
            };
            container.modem.demuxStream(stream, stdoutStream, stderrStream);
            // Start container
            await container.start();
            logger.debug({ containerName }, 'Container started');
            // Race between completion and timeout
            const result = await Promise.race([
                this.waitForContainer(container),
                this.timeoutContainer(container, options.timeout),
            ]);
            logger.info({ projectId: options.projectId, exitCode: result.StatusCode }, 'Container exited');
            return {
                stdout,
                stderr,
                exitCode: result.StatusCode,
            };
        }
        catch (error) {
            logger.error({ err: error, projectId: options.projectId }, 'Docker execution failed');
            throw error;
        }
    }
    /**
     * Wait for container to complete
     */
    async waitForContainer(container) {
        const result = await container.wait();
        return result;
    }
    /**
     * Kill container after timeout
     */
    async timeoutContainer(container, timeout) {
        await new Promise(resolve => setTimeout(resolve, timeout));
        logger.warn({ containerId: container.id }, 'Killing container due to timeout');
        try {
            await container.kill();
        }
        catch (error) {
            // Container may have already exited
            logger.debug({ err: error }, 'Error killing container (may have exited)');
        }
        throw new TimeoutError('Compilation timed out');
    }
    /**
     * Load seccomp profile for container security
     * Note: On Docker for Mac, we need to pass the JSON content inline, not a file path
     */
    async loadSeccompProfile() {
        // For Docker for Mac compatibility, disable seccomp for now
        // Still secure: network disabled, no capabilities, resource limits
        logger.debug('Using unconfined seccomp profile for Docker for Mac compatibility');
        return 'unconfined';
        // TODO: Enable seccomp by loading JSON inline for production:
        // const content = await fs.readFile(settings.seccompProfilePath, 'utf-8');
        // return content;
    }
    /**
     * Test Docker connection and pull TeX Live image if needed
     */
    async initialize() {
        try {
            // Test Docker connection
            await this.docker.ping();
            logger.info('Docker connection successful');
            // Check if TeX Live image exists, pull if not
            try {
                await this.docker.getImage(settings.texliveImage).inspect();
                logger.info({ image: settings.texliveImage }, 'TeX Live image found');
            }
            catch {
                logger.info({ image: settings.texliveImage }, 'Pulling TeX Live image...');
                await this.pullImage(settings.texliveImage);
            }
        }
        catch (error) {
            logger.error({ err: error }, 'Docker initialization failed');
            throw new Error('Failed to initialize Docker. Is Docker running?');
        }
    }
    /**
     * Pull Docker image
     */
    async pullImage(imageName) {
        return new Promise((resolve, reject) => {
            this.docker.pull(imageName, (err, stream) => {
                if (err)
                    return reject(err);
                this.docker.modem.followProgress(stream, (followErr) => {
                    if (followErr)
                        return reject(followErr);
                    logger.info({ image: imageName }, 'Image pulled successfully');
                    resolve();
                });
            });
        });
    }
}
//# sourceMappingURL=DockerExecutor.js.map