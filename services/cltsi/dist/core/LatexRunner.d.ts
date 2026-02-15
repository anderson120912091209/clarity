import type { LatexOptions } from '../types/index.js';
import { DockerExecutor } from './DockerExecutor.js';
/**
 * LatexRunner - Builds and executes latexmk commands
 *
 * Uses latexmk for automatic:
 * - Multi-pass compilation (references, TOC)
 * - Bibliography generation (bibtex/biber)
 * - Index generation (makeindex)
 */
export declare class LatexRunner {
    private dockerExecutor;
    constructor(dockerExecutor: DockerExecutor);
    /**
     * Run LaTeX compilation
     */
    runLatex(projectId: string, options: LatexOptions): Promise<{
        stdout: string;
        stderr: string;
    }>;
    /**
     * Build latexmk command with appropriate compiler flags
     */
    private buildCommand;
    /**
     * Get compiler-specific flag for latexmk
     */
    private getCompilerFlag;
}
//# sourceMappingURL=LatexRunner.d.ts.map