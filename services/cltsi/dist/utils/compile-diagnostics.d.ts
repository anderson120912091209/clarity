export interface CompileDiagnostics {
    summary: string;
    file?: string;
    line?: number;
}
interface DiagnosticOptions {
    compileDir: string;
    compiler: 'pdflatex' | 'xelatex' | 'lualatex' | 'typst';
    fallbackMessage: string;
}
export declare function buildCompileDiagnostics(options: DiagnosticOptions): Promise<CompileDiagnostics>;
export {};
//# sourceMappingURL=compile-diagnostics.d.ts.map