import { DockerExecutor } from '../../src/core/DockerExecutor.js';
import type { TypstOptions } from '../../src/types/index.js';
/**
 * TypstRunner - Compiles Typst documents using the Typst CLI in Docker.
 */
export declare class TypstRunner {
    private dockerExecutor;
    constructor(dockerExecutor: DockerExecutor);
    runTypst(projectId: string, options: TypstOptions): Promise<{
        stdout: string;
        stderr: string;
    }>;
    private buildCommand;
    private writeOutputLog;
}
//# sourceMappingURL=TypstRunner.d.ts.map