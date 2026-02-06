import fs from 'node:fs/promises';
import path from 'node:path';
import { DockerExecutor } from './DockerExecutor.js';
import { CompilationError } from '../utils/errors.js';
import type { DockerResult, TypstOptions } from '../types/index.js';
import settings from '../config/settings.js';
import logger from '../utils/logger.js';

/**
 * TypstRunner - Compiles Typst documents using the Typst CLI in Docker.
 */
export class TypstRunner {
  private dockerExecutor: DockerExecutor;

  constructor(dockerExecutor: DockerExecutor) {
    this.dockerExecutor = dockerExecutor;
  }

  async runTypst(
    projectId: string,
    options: TypstOptions
  ): Promise<{ stdout: string; stderr: string }> {
    const command = this.buildCommand(options);

    logger.info(
      {
        projectId,
        mainFile: options.mainFile,
        timeout: options.timeout,
      },
      'Running Typst compilation'
    );

    const result: DockerResult = await this.dockerExecutor.run({
      projectId,
      command,
      directory: options.directory,
      image: settings.typstImage,
      timeout: options.timeout,
      environment: {},
      networkDisabled: !this.resolveNetworkEnabled(options.allowNetwork),
    });

    await this.writeOutputLog(options.directory, result);

    if (result.exitCode !== 0) {
      throw new CompilationError('Typst compilation failed', {
        outputFiles: [],
      });
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  private buildCommand(options: TypstOptions): string[] {
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

  private resolveNetworkEnabled(requestedAllowNetwork?: boolean): boolean {
    if (typeof requestedAllowNetwork === 'boolean') {
      return requestedAllowNetwork;
    }
    return settings.typstAllowNetwork;
  }

  private async writeOutputLog(
    compileDirectory: string,
    result: DockerResult
  ): Promise<void> {
    const logPath = path.join(compileDirectory, 'output.log');
    const merged = `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`;
    await fs.writeFile(logPath, merged || 'Typst compile completed with no logs.', 'utf-8');
  }
}
