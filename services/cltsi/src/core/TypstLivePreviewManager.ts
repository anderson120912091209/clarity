import fs from 'node:fs/promises';
import path from 'node:path';
import Docker from 'dockerode';
import type { CompileResult, Resource } from '../types/index.js';
import { CompilationError, TimeoutError } from '../utils/errors.js';
import { CacheManager } from './CacheManager.js';
import { LockManager } from './LockManager.js';
import { ResourceManager } from './ResourceManager.js';
import settings from '../config/settings.js';
import logger from '../utils/logger.js';

interface TypstLivePreviewRequest {
  projectId: string;
  rootResourcePath: string;
  resources: Resource[];
  timeout?: number;
  allowNetwork?: boolean;
}

interface LogChunk {
  seq: number;
  text: string;
}

interface TypstLiveSession {
  projectId: string;
  rootResourcePath: string;
  allowNetwork: boolean;
  compileDir: string;
  container: Docker.Container;
  exited: boolean;
  exitCode: number | null;
  lastUsedAt: number;
  logSeq: number;
  logs: LogChunk[];
}

const DEFAULT_PREVIEW_TIMEOUT_MS = 8000;
const MIN_PREVIEW_TIMEOUT_MS = 500;
const MAX_LOG_CHUNKS = 300;
const SESSION_IDLE_TTL_MS = 10 * 60 * 1000;
const GC_INTERVAL_MS = 60 * 1000;
const POLL_INTERVAL_MS = 120;

export class TypstLivePreviewManager {
  private docker: Docker;
  private lockManager: LockManager;
  private resourceManager: ResourceManager;
  private cacheManager: CacheManager;
  private sessions = new Map<string, TypstLiveSession>();
  private gcTimer: NodeJS.Timeout;

  constructor(resourceManager: ResourceManager, cacheManager: CacheManager) {
    this.docker = new Docker();
    this.lockManager = new LockManager();
    this.resourceManager = resourceManager;
    this.cacheManager = cacheManager;
    this.gcTimer = setInterval(() => {
      this.cleanupIdleSessions().catch((error) => {
        logger.warn({ err: error }, 'Failed to cleanup idle Typst live sessions');
      });
    }, GC_INTERVAL_MS);
  }

  async preview(request: TypstLivePreviewRequest): Promise<CompileResult> {
    const lock = await this.lockManager.acquire(request.projectId);

    try {
      return await this.previewLocked(request);
    } finally {
      lock.release();
    }
  }

  async stopProject(projectId: string): Promise<void> {
    const lock = await this.lockManager.acquire(projectId);

    try {
      await this.stopSessionInternal(projectId, true);
    } finally {
      lock.release();
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.gcTimer);
    await Promise.all(
      Array.from(this.sessions.keys()).map((projectId) => this.stopSessionInternal(projectId, true))
    );
  }

  private async previewLocked(request: TypstLivePreviewRequest): Promise<CompileResult> {
    const compileDir = this.getCompileDir(request.projectId);
    const pdfPath = path.join(compileDir, 'output.pdf');
    const outputLogPath = path.join(compileDir, 'output.log');
    const previousSession = this.sessions.get(request.projectId) || null;
    const previousPdfMtime = await this.getFileMtimeMs(pdfPath);
    const previousLogSeq = previousSession?.logSeq ?? 0;
    const timeoutMs = this.normalizeTimeout(request.timeout);
    const allowNetwork = this.resolveNetworkEnabled(request.allowNetwork);

    const resourceList = await this.resourceManager.syncResourcesToDisk(
      {
        projectId: request.projectId,
        compiler: 'typst',
        rootResourcePath: request.rootResourcePath,
        resources: request.resources,
      },
      compileDir
    );

    const { session, created } = await this.ensureSession(
      request.projectId,
      request.rootResourcePath,
      allowNetwork
    );

    session.lastUsedAt = Date.now();
    const startLogSeq = created ? session.logSeq : previousLogSeq;

    try {
      await this.waitForPreviewUpdate(session, previousPdfMtime, startLogSeq, timeoutMs);
      const logs = this.collectLogsSince(session, startLogSeq);
      await this.writeOutputLog(outputLogPath, logs, 'Typst live preview compiled successfully.');

      const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(
        request.projectId,
        compileDir,
        resourceList
      );

      return {
        status: 'success',
        buildId,
        outputFiles,
      };
    } catch (error) {
      const logs = this.collectLogsSince(session, startLogSeq);
      await this.writeOutputLog(
        outputLogPath,
        logs,
        error instanceof Error ? error.message : 'Typst live preview failed.'
      );

      const { buildId, outputFiles } = await this.cacheManager.saveOutputFiles(
        request.projectId,
        compileDir,
        resourceList
      );

      throw new CompilationError(
        error instanceof Error ? error.message : 'Typst live preview failed',
        { buildId, outputFiles }
      );
    }
  }

  private async ensureSession(
    projectId: string,
    rootResourcePath: string,
    allowNetwork: boolean
  ): Promise<{ session: TypstLiveSession; created: boolean }> {
    const existing = this.sessions.get(projectId);

    if (
      existing &&
      !existing.exited &&
      existing.rootResourcePath === rootResourcePath &&
      existing.allowNetwork === allowNetwork
    ) {
      return { session: existing, created: false };
    }

    if (existing) {
      await this.stopSessionInternal(projectId, false);
    }

    const session = await this.startSession(projectId, rootResourcePath, allowNetwork);
    this.sessions.set(projectId, session);
    return { session, created: true };
  }

  private async startSession(
    projectId: string,
    rootResourcePath: string,
    allowNetwork: boolean
  ): Promise<TypstLiveSession> {
    const compileDir = this.getCompileDir(projectId);
    const containerName = this.buildContainerName(projectId);

    await fs.mkdir(compileDir, { recursive: true });
    await this.ensureTypstImageExists();

    const session = {} as TypstLiveSession;
    const seccompProfile = 'unconfined';
    const containerOptions: Docker.ContainerCreateOptions = {
      name: containerName,
      Image: settings.typstImage,
      Cmd: [
        'watch',
        '--root',
        '/compile',
        '--font-path',
        '/compile',
        rootResourcePath,
        '/compile/output.pdf',
      ],
      WorkingDir: '/compile',
      NetworkDisabled: !allowNetwork,
      HostConfig: {
        Binds: [`${compileDir}:/compile:rw`],
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges', `seccomp=${seccompProfile}`],
        Memory: 1024 * 1024 * 1024,
        Ulimits: [
          {
            Name: 'cpu',
            Soft: Math.floor(settings.compileTimeout / 1000) + 5,
            Hard: Math.floor(settings.compileTimeout / 1000) + 10,
          },
        ],
        LogConfig: { Type: 'none', Config: {} },
        AutoRemove: true,
      },
    };

    const container = await this.docker.createContainer(containerOptions);
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    Object.assign(session, {
      projectId,
      rootResourcePath,
      allowNetwork,
      compileDir,
      container,
      exited: false,
      exitCode: null,
      lastUsedAt: Date.now(),
      logSeq: 0,
      logs: [],
    });

    const stdoutStream = {
      write: (chunk: Buffer) => {
        this.pushLogChunk(session, chunk.toString());
      },
    };

    const stderrStream = {
      write: (chunk: Buffer) => {
        this.pushLogChunk(session, chunk.toString());
      },
    };

    container.modem.demuxStream(stream, stdoutStream, stderrStream);

    await container.start();
    logger.info({ projectId, containerName }, 'Started Typst live preview session');

    void container
      .wait()
      .then((result) => {
        session.exited = true;
        session.exitCode = result.StatusCode;
        this.pushLogChunk(
          session,
          `\n[Typst live preview container exited with code ${result.StatusCode}]\n`
        );
        this.sessions.delete(projectId);
        logger.warn(
          { projectId, exitCode: result.StatusCode },
          'Typst live preview session exited'
        );
      })
      .catch((error) => {
        session.exited = true;
        this.pushLogChunk(
          session,
          `\n[Typst live preview container wait failed: ${error instanceof Error ? error.message : String(error)}]\n`
        );
        this.sessions.delete(projectId);
        logger.warn({ projectId, err: error }, 'Failed waiting for Typst live preview session');
      });

    return session;
  }

  private resolveNetworkEnabled(requestedAllowNetwork?: boolean): boolean {
    if (typeof requestedAllowNetwork === 'boolean') {
      return requestedAllowNetwork;
    }
    return settings.typstAllowNetwork;
  }

  private async waitForPreviewUpdate(
    session: TypstLiveSession,
    previousPdfMtime: number,
    startLogSeq: number,
    timeoutMs: number
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const pdfPath = path.join(session.compileDir, 'output.pdf');

    while (Date.now() < deadline) {
      if (session.exited) {
        throw new CompilationError(
          `Typst live preview session exited${session.exitCode !== null ? ` (code ${session.exitCode})` : ''}.`,
          {}
        );
      }

      const currentPdfMtime = await this.getFileMtimeMs(pdfPath);
      const recentLogs = this.collectLogsSince(session, startLogSeq);

      if (/\berror:\b/i.test(recentLogs)) {
        throw new CompilationError('Typst live preview failed.', {});
      }

      if (currentPdfMtime > previousPdfMtime) {
        return;
      }

      if (currentPdfMtime > 0 && /\bcompiled\b/i.test(recentLogs)) {
        return;
      }

      await this.sleep(POLL_INTERVAL_MS);
    }

    throw new TimeoutError('Typst live preview timed out.');
  }

  private collectLogsSince(session: TypstLiveSession, startSeq: number): string {
    return session.logs
      .filter((entry) => entry.seq > startSeq)
      .map((entry) => entry.text)
      .join('');
  }

  private pushLogChunk(session: TypstLiveSession, text: string): void {
    if (!text) return;

    session.logSeq += 1;
    session.logs.push({
      seq: session.logSeq,
      text,
    });

    if (session.logs.length > MAX_LOG_CHUNKS) {
      session.logs.splice(0, session.logs.length - MAX_LOG_CHUNKS);
    }
  }

  private async stopSessionInternal(
    projectId: string,
    cleanupCompileDir: boolean
  ): Promise<void> {
    const session = this.sessions.get(projectId);
    if (!session) return;

    this.sessions.delete(projectId);

    if (!session.exited) {
      try {
        await session.container.kill();
      } catch (error) {
        logger.debug(
          { projectId, err: error },
          'Failed to kill Typst live preview container (it may have already exited)'
        );
      }
    }

    if (cleanupCompileDir) {
      await this.resourceManager.cleanupCompileDir(session.compileDir);
    }

    logger.info({ projectId }, 'Stopped Typst live preview session');
  }

  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    const idleProjects = Array.from(this.sessions.values())
      .filter((session) => now - session.lastUsedAt > SESSION_IDLE_TTL_MS)
      .map((session) => session.projectId);

    if (idleProjects.length === 0) return;

    await Promise.all(
      idleProjects.map((projectId) => this.stopProject(projectId))
    );
  }

  private async ensureTypstImageExists(): Promise<void> {
    try {
      await this.docker.getImage(settings.typstImage).inspect();
    } catch {
      throw new CompilationError(
        `Typst image not found: ${settings.typstImage}. Please run: docker pull ${settings.typstImage}`,
        {}
      );
    }
  }

  private getCompileDir(projectId: string): string {
    return path.join(settings.compileDir, 'typst-live', projectId);
  }

  private buildContainerName(projectId: string): string {
    const safeProjectId = projectId.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 40);
    return `clarity-typst-live-${safeProjectId}-${Date.now()}`;
  }

  private normalizeTimeout(timeout: number | undefined): number {
    const base = timeout ?? DEFAULT_PREVIEW_TIMEOUT_MS;
    return Math.max(MIN_PREVIEW_TIMEOUT_MS, Math.min(settings.compileTimeout, base));
  }

  private async getFileMtimeMs(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtimeMs;
    } catch {
      return 0;
    }
  }

  private async writeOutputLog(
    outputLogPath: string,
    logs: string,
    fallback: string
  ): Promise<void> {
    const content = logs.trim().length > 0 ? logs : `${fallback}\n`;
    await fs.writeFile(outputLogPath, content, 'utf-8');
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
