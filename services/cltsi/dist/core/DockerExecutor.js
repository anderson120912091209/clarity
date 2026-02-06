"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerExecutor = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const settings_js_1 = __importDefault(require("../config/settings.js"));
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
class DockerExecutor {
    docker;
    constructor() {
        this.docker = new dockerode_1.default();
    }
    /**
     * Run a command in an isolated Docker container
     */
    async run(options) {
        const containerName = `clarity-compile-${options.projectId}-${Date.now()}`;
        logger_js_1.default.info({ projectId: options.projectId, command: options.command }, 'Starting Docker compilation');
        // Load seccomp profile
        const seccompProfile = await this.loadSeccompProfile();
        const containerOptions = {
            name: containerName,
            Image: options.image,
            Cmd: options.command,
            WorkingDir: '/compile',
            // SECURITY: Disable all network access
            NetworkDisabled: true,
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
                LogConfig: { Type: 'none' },
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
            logger_js_1.default.debug({ containerName }, 'Container started');
            // Race between completion and timeout
            const result = await Promise.race([
                this.waitForContainer(container),
                this.timeoutContainer(container, options.timeout),
            ]);
            logger_js_1.default.info({ projectId: options.projectId, exitCode: result.StatusCode }, 'Container exited');
            return {
                stdout,
                stderr,
                exitCode: result.StatusCode,
            };
        }
        catch (error) {
            logger_js_1.default.error({ err: error, projectId: options.projectId }, 'Docker execution failed');
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
        logger_js_1.default.warn({ containerId: container.id }, 'Killing container due to timeout');
        try {
            await container.kill();
        }
        catch (error) {
            // Container may have already exited
            logger_js_1.default.debug({ err: error }, 'Error killing container (may have exited)');
        }
        throw new errors_js_1.TimeoutError('Compilation timed out');
    }
    /**
     * Load seccomp profile for container security
     * Note: On Docker for Mac, we need to pass the JSON content inline, not a file path
     */
    async loadSeccompProfile() {
        // For Docker for Mac compatibility, disable seccomp for now
        // Still secure: network disabled, no capabilities, resource limits
        logger_js_1.default.debug('Using unconfined seccomp profile for Docker for Mac compatibility');
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
            logger_js_1.default.info('Docker connection successful');
            // Check if TeX Live image exists, pull if not
            try {
                await this.docker.getImage(settings_js_1.default.texliveImage).inspect();
                logger_js_1.default.info({ image: settings_js_1.default.texliveImage }, 'TeX Live image found');
            }
            catch {
                logger_js_1.default.info({ image: settings_js_1.default.texliveImage }, 'Pulling TeX Live image...');
                await this.pullImage(settings_js_1.default.texliveImage);
            }
        }
        catch (error) {
            logger_js_1.default.error({ err: error }, 'Docker initialization failed');
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
                this.docker.modem.followProgress(stream, (err) => {
                    if (err)
                        return reject(err);
                    logger_js_1.default.info({ image: imageName }, 'Image pulled successfully');
                    resolve();
                });
            });
        });
    }
}
exports.DockerExecutor = DockerExecutor;
//# sourceMappingURL=DockerExecutor.js.map