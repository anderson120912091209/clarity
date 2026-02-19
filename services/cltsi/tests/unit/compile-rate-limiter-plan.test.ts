import { afterEach, describe, expect, it } from 'vitest';
import type { Request } from 'express';
import settings from '../../src/config/settings.js';
import { checkCompileRateLimit } from '../../src/core/CompileRateLimiter.js';

function createRequest(plan: string): Request {
  return {
    headers: {
      'user-agent': 'vitest-suite',
      'x-real-ip': '127.0.0.1',
      [settings.compileRateLimit.clientUserPlanHeader.toLowerCase()]: plan,
    },
    ip: '127.0.0.1',
    body: {
      compileMode: 'manual',
    },
  } as unknown as Request;
}

const originalEnabled = settings.compileRateLimit.enabled;

afterEach(() => {
  settings.compileRateLimit.enabled = originalEnabled;
});

describe('compile rate limiter plan entitlements', () => {
  it('bypasses compile limits for pro plan requests', async () => {
    settings.compileRateLimit.enabled = true;

    const req = createRequest('pro');
    const projectId = `pro-project-${Date.now()}`;

    const first = await checkCompileRateLimit(req, projectId, 'manual');
    const second = await checkCompileRateLimit(req, projectId, 'manual');

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(first.quota.limit).toBe(Number.MAX_SAFE_INTEGER);
    expect(second.quota.limit).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('keeps limits active for free plan requests', async () => {
    settings.compileRateLimit.enabled = true;

    const req = createRequest('free');
    const projectId = `free-project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const first = await checkCompileRateLimit(req, projectId, 'manual');
    const second = await checkCompileRateLimit(req, projectId, 'manual');

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe('cooldown');
  });
});
