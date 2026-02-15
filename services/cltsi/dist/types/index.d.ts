/**
 * Type definitions for CLSI service
 */
export interface CompileRequest {
    projectId: string;
    compiler: 'pdflatex' | 'xelatex' | 'lualatex' | 'typst';
    rootResourcePath: string;
    timeout?: number;
    draft?: boolean;
    stopOnFirstError?: boolean;
    allowNetwork?: boolean;
    resources: Resource[];
}
export interface Resource {
    path: string;
    content?: string;
    url?: string;
    modified?: number;
    encoding?: 'utf-8' | 'base64';
}
export interface CompileResult {
    status: 'success' | 'error' | 'timeout' | 'terminated';
    buildId: string;
    outputFiles: OutputFile[];
    message?: string;
}
export interface OutputFile {
    path: string;
    type: 'pdf' | 'log' | 'synctex' | 'aux';
    url: string;
    size: number;
}
export interface LatexOptions {
    directory: string;
    mainFile: string;
    compiler: 'pdflatex' | 'xelatex' | 'lualatex';
    timeout: number;
    stopOnFirstError?: boolean;
}
export interface TypstOptions {
    directory: string;
    mainFile: string;
    timeout: number;
    allowNetwork?: boolean;
}
export interface DockerRunOptions {
    projectId: string;
    command: string[];
    directory: string;
    image: string;
    timeout: number;
    environment: Record<string, string>;
    networkDisabled?: boolean;
}
export interface DockerResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export interface Lock {
    release: () => void;
}
export declare class CompilationError extends Error {
    details: {
        buildId?: string;
        outputFiles?: OutputFile[];
    };
    constructor(message: string, details: {
        buildId?: string;
        outputFiles?: OutputFile[];
    });
}
export declare class TimeoutError extends Error {
    constructor(message: string);
}
export declare class ValidationError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=index.d.ts.map