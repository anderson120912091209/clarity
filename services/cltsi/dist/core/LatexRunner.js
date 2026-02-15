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
    dockerExecutor;
    constructor(dockerExecutor) {
        this.dockerExecutor = dockerExecutor;
    }
    /**
     * Run LaTeX compilation
     */
    async runLatex(projectId, options) {
        const command = this.buildCommand(options);
        logger.info({
            projectId,
            compiler: options.compiler,
            mainFile: options.mainFile,
            timeout: options.timeout,
        }, 'Running LaTeX compilation');
        const result = await this.dockerExecutor.run({
            projectId,
            command,
            directory: options.directory,
            image: settings.texliveImage,
            timeout: options.timeout,
            environment: {
                // TeX environment
                TEXINPUTS: './/:',
                max_print_line: '10000', // Longer log lines for debugging
                // Security: prevent shell escape
                openout_any: 'p', // Paranoid mode - only current directory
            },
        });
        // latexmk returns 12 when LaTeX has errors but PDF was generated
        // We accept this as it allows users to see partial output
        if (result.exitCode !== 0 && result.exitCode !== 12) {
            throw new CompilationError('LaTeX compilation failed', {
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
    buildCommand(options) {
        const command = [
            'latexmk',
            '-cd', // Change to document directory
            `-${this.getCompilerFlag(options.compiler)}`,
            '-jobname=output', // Output files named 'output.*'
            '-outdir=/compile', // Output directory
            '-auxdir=/compile', // Auxiliary files directory
            '-interaction=nonstopmode', // Don't pause on errors
            '-synctex=1', // Generate SyncTeX data for PDF sync
            '-file-line-error', // Better error messages
        ];
        // Optional flags
        if (options.stopOnFirstError) {
            command.push('-halt-on-error');
        }
        else {
            command.push('-f'); // Force through errors
        }
        // Main TeX file
        command.push(options.mainFile);
        return command;
    }
    /**
     * Get compiler-specific flag for latexmk
     */
    getCompilerFlag(compiler) {
        const mapping = {
            pdflatex: 'pdf',
            xelatex: 'xelatex',
            lualatex: 'lualatex',
        };
        return mapping[compiler] || 'pdf';
    }
}
//# sourceMappingURL=LatexRunner.js.map