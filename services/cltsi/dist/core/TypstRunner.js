"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypstRunner = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const errors_js_1 = require("../utils/errors.js");
const settings_js_1 = __importDefault(require("../config/settings.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * TypstRunner - Compiles Typst documents using the Typst CLI in Docker.
 */
class TypstRunner {
    dockerExecutor;
    constructor(dockerExecutor) {
        this.dockerExecutor = dockerExecutor;
    }
    async runTypst(projectId, options) {
        const command = this.buildCommand(options);
        logger_js_1.default.info({
            projectId,
            mainFile: options.mainFile,
            timeout: options.timeout,
        }, 'Running Typst compilation');
        const result = await this.dockerExecutor.run({
            projectId,
            command,
            directory: options.directory,
            image: settings_js_1.default.typstImage,
            timeout: options.timeout,
            environment: {},
            networkDisabled: !this.resolveNetworkEnabled(options.allowNetwork),
        });
        await this.writeOutputLog(options.directory, result);
        if (result.exitCode !== 0) {
            throw new errors_js_1.CompilationError('Typst compilation failed', {
                outputFiles: [],
            });
        }
        return {
            stdout: result.stdout,
            stderr: result.stderr,
        };
    }
    buildCommand(options) {
        // The official Typst Docker image uses `typst` as ENTRYPOINT.
        // So command args must start with the subcommand (e.g. `compile`),
        // not `typst compile`, otherwise it becomes `typst typst compile ...`.
        return [
            'compile',
            '--root',
            '/compile',
            options.mainFile,
            '/compile/output.pdf',
        ];
    }
    resolveNetworkEnabled(requestedAllowNetwork) {
        if (typeof requestedAllowNetwork === 'boolean') {
            return requestedAllowNetwork;
        }
        return settings_js_1.default.typstAllowNetwork;
    }
    async writeOutputLog(compileDirectory, result) {
        const logPath = node_path_1.default.join(compileDirectory, 'output.log');
        const merged = `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`;
        await promises_1.default.writeFile(logPath, merged || 'Typst compile completed with no logs.', 'utf-8');
    }
}
exports.TypstRunner = TypstRunner;
//# sourceMappingURL=TypstRunner.js.map