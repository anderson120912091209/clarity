import crypto from 'node:crypto';
import type { Request } from 'express';
import settings from '../config/settings.js';

type QuotaStore = 'upstash' | 'memory';
type QuotaScope = 'cooldown' | 'burst' | 'auto' | 'daily';
type CompileMode = 'manual' | 'auto';

interface WindowCounterResult {
  used: number;
  retryAfterSec: number;
  store: QuotaStore;
}

interface RateLimitRule {
  scope: QuotaScope;
  key: string;
  limit: number;
  windowSec: number;
}

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

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const MEMORY_BUCKETS_KEY = '__clsi_compile_rate_limit_memory_buckets__';

interface MemoryBucket {
  windowStartSec: number;
  used: number;
}

function getMemoryBuckets(): Map<string, MemoryBucket> {
  const store = globalThis as typeof globalThis & {
    [MEMORY_BUCKETS_KEY]?: Map<string, MemoryBucket>;
  };

  if (!store[MEMORY_BUCKETS_KEY]) {
    store[MEMORY_BUCKETS_KEY] = new Map<string, MemoryBucket>();
  }

  return store[MEMORY_BUCKETS_KEY]!;
}

function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  const xRealIp = req.headers['x-real-ip'];
  const xForwardedFor = req.headers['x-forwarded-for'];

  const headerValue =
    (typeof cfConnectingIp === 'string' && cfConnectingIp) ||
    (typeof xRealIp === 'string' && xRealIp) ||
    (typeof xForwardedFor === 'string' && xForwardedFor) ||
    '';

  if (headerValue) {
    return headerValue.split(',')[0]?.trim() || req.ip || 'unknown-ip';
  }

  return req.ip || 'unknown-ip';
}

function getHeaderValue(req: Request, headerName: string): string | null {
  const value = req.headers[headerName.toLowerCase()];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function getClientIdentity(req: Request): string {
  const userId = getHeaderValue(req, settings.compileRateLimit.clientUserIdHeader);
  const userAgent = req.headers['user-agent'] || 'unknown-agent';
  const ip = getClientIp(req);
  return userId ? `user:${userId}|ip:${ip}|ua:${userAgent}` : `ip:${ip}|ua:${userAgent}`;
}

function hashIdentity(identity: string): string {
  return crypto.createHash('sha256').update(identity).digest('hex');
}

function normalizePlan(value: string | null): 'free' | 'pro' {
  if (!value) return 'free';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'pro' || normalized === 'supporter' || normalized === 'premium') {
    return 'pro';
  }
  return 'free';
}

function hasUnlimitedCompileAccess(req: Request): boolean {
  const rawPlan = getHeaderValue(req, settings.compileRateLimit.clientUserPlanHeader);
  return normalizePlan(rawPlan) === 'pro';
}

function buildUnlimitedCompileResult(): CompileRateLimitResult {
  return {
    allowed: true,
    reason: null,
    quota: {
      scope: 'daily',
      limit: Number.MAX_SAFE_INTEGER,
      used: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      retryAfterSec: settings.compileRateLimit.dailyWindowSec,
      store: 'memory',
    },
  };
}

async function callUpstash(command: string, method: 'GET' | 'POST'): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null;
  }

  const endpoint = `${UPSTASH_URL.replace(/\/+$/, '')}/${command}`;

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => ({}))) as { result?: number | string | null };
    if (payload.result === null || payload.result === undefined) return null;
    if (typeof payload.result === 'number') return payload.result;
    if (typeof payload.result === 'string') {
      const parsed = Number(payload.result);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function incrementWindowCounter(key: string, windowSec: number): Promise<WindowCounterResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const bucketStartSec = Math.floor(nowSec / windowSec) * windowSec;
  const retryAfterSec = Math.max(bucketStartSec + windowSec - nowSec, 1);
  const bucketKey = `${key}:${bucketStartSec}`;

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const upstashUsed = await callUpstash(`incr/${encodeURIComponent(bucketKey)}`, 'POST');
    if (upstashUsed !== null) {
      void callUpstash(
        `expire/${encodeURIComponent(bucketKey)}/${Math.max(windowSec + 10, 30)}`,
        'POST'
      );
      return {
        used: Math.max(upstashUsed, 0),
        retryAfterSec,
        store: 'upstash',
      };
    }
  }

  const buckets = getMemoryBuckets();
  const existing = buckets.get(bucketKey);
  if (existing && existing.windowStartSec === bucketStartSec) {
    existing.used += 1;
    buckets.set(bucketKey, existing);
    return {
      used: existing.used,
      retryAfterSec,
      store: 'memory',
    };
  }

  buckets.set(bucketKey, {
    windowStartSec: bucketStartSec,
    used: 1,
  });

  return {
    used: 1,
    retryAfterSec,
    store: 'memory',
  };
}

async function consumeRule(rule: RateLimitRule): Promise<CompileRateLimitResult> {
  const counter = await incrementWindowCounter(rule.key, rule.windowSec);
  const remaining = Math.max(rule.limit - counter.used, 0);
  const allowed = counter.used <= rule.limit;

  return {
    allowed,
    reason: allowed ? null : rule.scope,
    quota: {
      scope: rule.scope,
      limit: rule.limit,
      used: counter.used,
      remaining,
      retryAfterSec: counter.retryAfterSec,
      store: counter.store,
    },
  };
}

function buildRules(req: Request, projectId: string, compileMode: CompileMode): RateLimitRule[] {
  const identityHash = hashIdentity(getClientIdentity(req));
  const projectKey = `${identityHash}:${projectId}`;
  const baseKeyPrefix = 'clsi:compile-rate:v1';

  const rules: RateLimitRule[] = [
    {
      scope: 'cooldown',
      key: `${baseKeyPrefix}:cooldown:${projectKey}`,
      limit: settings.compileRateLimit.cooldownLimit,
      windowSec: settings.compileRateLimit.cooldownWindowSec,
    },
    {
      scope: 'burst',
      key: `${baseKeyPrefix}:burst:${projectKey}`,
      limit: settings.compileRateLimit.burstLimit,
      windowSec: settings.compileRateLimit.burstWindowSec,
    },
  ];

  if (compileMode === 'auto') {
    rules.push({
      scope: 'auto',
      key: `${baseKeyPrefix}:auto:${projectKey}`,
      limit: settings.compileRateLimit.autoLimit,
      windowSec: settings.compileRateLimit.autoWindowSec,
    });
  }

  rules.push({
    scope: 'daily',
    key: `${baseKeyPrefix}:daily:${identityHash}`,
    limit: settings.compileRateLimit.dailyLimit,
    windowSec: settings.compileRateLimit.dailyWindowSec,
  });

  return rules;
}

export async function checkCompileRateLimit(
  req: Request,
  projectId: string,
  compileMode: CompileMode
): Promise<CompileRateLimitResult> {
  if (hasUnlimitedCompileAccess(req)) {
    return buildUnlimitedCompileResult();
  }

  if (!settings.compileRateLimit.enabled) {
    return {
      allowed: true,
      reason: null,
      quota: {
        scope: 'daily',
        limit: settings.compileRateLimit.dailyLimit,
        used: 0,
        remaining: settings.compileRateLimit.dailyLimit,
        retryAfterSec: settings.compileRateLimit.dailyWindowSec,
        store: 'memory',
      },
    };
  }

  const rules = buildRules(req, projectId, compileMode);
  let latestAllowed: CompileRateLimitResult | null = null;

  for (const rule of rules) {
    const result = await consumeRule(rule);
    if (!result.allowed) {
      return result;
    }
    latestAllowed = result;
  }

  return latestAllowed!;
}

export function getCompileMode(req: Request): CompileMode {
  const bodyMode =
    req.body && typeof req.body === 'object' && req.body.compileMode === 'auto'
      ? 'auto'
      : 'manual';
  return bodyMode;
}

export function buildCompileRateLimitHeaders(result: CompileRateLimitResult): Record<string, string> {
  return {
    'X-Compile-Quota-Scope': result.quota.scope,
    'X-Compile-Quota-Limit': String(result.quota.limit),
    'X-Compile-Quota-Used': String(result.quota.used),
    'X-Compile-Quota-Remaining': String(result.quota.remaining),
    'X-Compile-Quota-Store': result.quota.store,
  };
}
