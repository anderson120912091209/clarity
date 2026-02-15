import type { CompileResult, Resource } from '../types/index.js';
import { CacheManager } from './CacheManager.js';
import { ResourceManager } from './ResourceManager.js';
interface TypstLivePreviewRequest {
    projectId: string;
    rootResourcePath: string;
    resources: Resource[];
    timeout?: number;
    allowNetwork?: boolean;
}
export declare class TypstLivePreviewManager {
    private docker;
    private lockManager;
    private resourceManager;
    private cacheManager;
    private sessions;
    private gcTimer;
    constructor(resourceManager: ResourceManager, cacheManager: CacheManager);
    preview(request: TypstLivePreviewRequest): Promise<CompileResult>;
    stopProject(projectId: string): Promise<void>;
    shutdown(): Promise<void>;
    private previewLocked;
    private ensureSession;
    private startSession;
    private resolveNetworkEnabled;
    private waitForPreviewUpdate;
    private collectLogsSince;
    private pushLogChunk;
    private stopSessionInternal;
    private cleanupIdleSessions;
    private ensureTypstImageExists;
    private getCompileDir;
    private buildContainerName;
    private normalizeTimeout;
    private getFileMtimeMs;
    private writeOutputLog;
    private sleep;
}
export {};
//# sourceMappingURL=TypstLivePreviewManager.d.ts.map