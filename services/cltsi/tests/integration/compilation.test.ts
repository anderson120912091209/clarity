import { describe, it, expect, beforeAll } from 'vitest';
import { DockerExecutor } from '../../src/core/DockerExecutor.js';
import { LatexRunner } from '../../src/core/LatexRunner.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('LaTeX Compilation Integration Tests', () => {
  let dockerExecutor: DockerExecutor;
  let latexRunner: LatexRunner;
  let testDir: string;

  beforeAll(async () => {
    dockerExecutor = new DockerExecutor();
    await dockerExecutor.initialize();
    latexRunner = new LatexRunner(dockerExecutor);
    
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clsi-test-'));
  });

  it('should compile a basic LaTeX document', async () => {
    // Create test LaTeX file
    const texContent = `\\documentclass{article}
\\begin{document}
Hello World from CLSI!
\\end{document}`;

    await fs.writeFile(path.join(testDir, 'main.tex'), texContent);

    // Compile
    const result = await latexRunner.runLatex('test-basic', {
      directory: testDir,
      mainFile: 'main.tex',
      compiler: 'pdflatex',
      timeout: 60000,
    });

    // Check output
    expect(result.stdout).toContain('Output written');
    
    // Check PDF exists
    const pdfPath = path.join(testDir, 'output.pdf');
    const pdfExists = await fs.access(pdfPath).then(() => true).catch(() => false);
    expect(pdfExists).toBe(true);

    // Check PDF size
    const stats = await fs.stat(pdfPath);
    expect(stats.size).toBeGreaterThan(1000); // PDF should be > 1KB
  }, 120000); // 2 minute timeout

  it('should handle compilation errors gracefully', async () => {
    // Create invalid LaTeX
    const texContent = `\\documentclass{article}
\\begin{document}
\\invalid_command
\\end{document}`;

    await fs.writeFile(path.join(testDir, 'error.tex'), texContent);

    // Should throw
    await expect(
      latexRunner.runLatex('test-error', {
        directory: testDir,
        mainFile: 'error.tex',
        compiler: 'pdflatex',
        timeout: 60000,
        stopOnFirstError: true,
      })
    ).rejects.toThrow();
  }, 120000);
});
