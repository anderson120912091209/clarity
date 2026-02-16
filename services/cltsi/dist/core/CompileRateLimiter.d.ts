import type { Request } from 'express';
type QuotaStore = 'upstash' | 'memory';
type QuotaScope = 'cooldown' | 'burst' | 'auto' | 'daily';
type CompileMode = 'manual' | 'auto';
export interface CompileRateLimitQuota {
    scope: QuotaScope;
    limit: number;
    used: number;
    remaining: number;
    retryAfterSec: number;
    store: QuotaStore;
}
export interface CompileRateLimitResult {
    allowed: boolean;
    reason: QuotaScope | null;
    quota: CompileRateLimitQuota;
}
export declare function checkCompileRateLimit(req: Request, projectId: string, compileMode: CompileMode): Promise<CompileRateLimitResult>;
export declare function getCompileMode(req: Request): CompileMode;
export declare function buildCompileRateLimitHeaders(result: CompileRateLimitResult): Record<string, string>;
export {};
//# sourceMappingURL=CompileRateLimiter.d.ts.map