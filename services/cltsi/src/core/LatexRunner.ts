import type { LatexOptions, DockerResult } from '../types/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DockerExecutor } from './DockerExecutor.js';
import { CompilationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import settings from '../config/settings.js';

/**
 * LatexRunner - Builds and executes latexmk commands
 * 
 * Uses latexmk for automatic:
 * - Multi-pass compilation (references, TOC)
 * - Bibliography generation (bibtex/biber)
 * - Index generation (makeindex)
 */
export class LatexRunner {
  private dockerExecutor: DockerExecutor;

  constructor(dockerExecutor: DockerExecutor) {
    this.dockerExecutor = dockerExecutor;
  }

  /**
   * Run LaTeX compilation
   */
  async runLatex(
    projectId: string,
    options: LatexOptions
  ): Promise<{ stdout: string; stderr: string }> {
    const command = this.buildCommand(options);

    logger.info(
      {
        projectId,
        compiler: options.compiler,
        mainFile: options.mainFile,
        timeout: options.timeout,
      },
      'Running LaTeX compilation'
    );

    const result: DockerResult = await this.dockerExecutor.run({
      projectId,
      command,
      directory: options.directory,
      image: settings.texliveImage,
      timeout: options.timeout,
      environment: {
        // TeX environment
        TEXINPUTS: './/:',
        max_print_line: '10000',  // Longer log lines for debugging
        
        // Security: prevent shell escape
        openout_any: 'p',  // Paranoid mode - only current directory
      },
    });

    // Treat any non-zero exit as a compile failure.
    // We no longer force through errors because it often produces confusing states.
    if (result.exitCode !== 0) {
      await this.persistFallbackLog(options.directory, result);

      const stderrPreview = this.firstNonEmptyLine(result.stderr);
      const stdoutPreview = this.firstNonEmptyLine(result.stdout);
      const detail = stderrPreview || stdoutPreview;
      const message = detail
        ? `LaTeX compilation failed: ${detail}`
        : 'LaTeX compilation failed';

      throw new CompilationError(message, {
        outputFiles: [], // Will be populated by CompileManager
      });
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  /**
   * Build latexmk command with appropriate compiler flags
   */
  private buildCommand(options: LatexOptions): string[] {
    const command = [
      'latexmk',
      '-cd',                          // Change to document directory
      `-${this.getCompilerFlag(options.compiler)}`,
      '-jobname=output',              // Output files named 'output.*'
      '-outdir=/compile',             // Output directory
      '-auxdir=/compile',             // Auxiliary files directory
      '-interaction=nonstopmode',     // Don't pause on errors
      '-synctex=1',                   // Generate SyncTeX data for PDF sync
      '-file-line-error',             // Better error messages
    ];

    // Optional flags
    if (options.stopOnFirstError ?? true) {
      command.push('-halt-on-error');
    }

    // Main TeX file
    command.push(options.mainFile);

    return command;
  }

  /**
   * Get compiler-specific flag for latexmk
   */
  private getCompilerFlag(compiler: string): string {
    const mapping: Record<string, string> = {
      pdflatex: 'pdf',
      xelatex: 'xelatex',
      lualatex: 'lualatex',
    };

    return mapping[compiler] || 'pdf';
  }

  private firstNonEmptyLine(text: string): string | null {
    return (
      text
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? null
    );
  }

  private async persistFallbackLog(
    compileDir: string,
    result: DockerResult
  ): Promise<void> {
    const outputLogPath = path.join(compileDir, 'output.log');
    const fallbackLog = [result.stderr?.trim(), result.stdout?.trim()]
      .filter(Boolean)
      .join('\n\n');

    if (!fallbackLog) return;

    try {
      await fs.access(outputLogPath);
      // Real compiler log already exists.
      return;
    } catch {
      // No output.log created by compiler, write fallback diagnostics.
      await fs.writeFile(outputLogPath, fallbackLog, 'utf-8');
    }
  }
}
