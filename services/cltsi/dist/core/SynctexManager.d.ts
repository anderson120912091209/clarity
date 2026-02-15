import { DockerExecutor } from './DockerExecutor.js';
import { CacheManager } from './CacheManager.js';
export interface SyncFromCodeRequest {
    buildId: string;
    file: string;
    line: number;
    column: number;
}
export interface SyncFromPdfRequest {
    buildId: string;
    page: number;
    h: number;
    v: number;
}
export interface SynctexPdfPosition {
    page: number;
    h: number;
    v: number;
    width: number;
    height: number;
}
export interface SynctexCodePosition {
    file: string;
    line: number;
    column: number;
}
export declare class SynctexNotFoundError extends Error {
    constructor(message: string);
}
export declare class SynctexManager {
    private dockerExecutor;
    private cacheManager;
    constructor(dockerExecutor: DockerExecutor, cacheManager: CacheManager);
    syncFromCode(projectId: string, request: SyncFromCodeRequest): Promise<{
        pdf: SynctexPdfPosition[];
    }>;
    syncFromPdf(projectId: string, request: SyncFromPdfRequest): Promise<{
        code: SynctexCodePosition[];
    }>;
    private ensureSynctexArtifacts;
    private ensureFileExists;
    private runSynctex;
}
//# sourceMappingURL=SynctexManager.d.ts.map