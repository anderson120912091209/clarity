import express, { type Router, type Request, type Response } from 'express';
import { CompileManager } from '../core/CompileManager.js';
import { CacheManager } from '../core/CacheManager.js';
import { TypstLivePreviewManager } from '../core/TypstLivePreviewManager.js';
import { SynctexManager, SynctexNotFoundError } from '../core/SynctexManager.js';
import {
  buildCompileRateLimitHeaders,
  checkCompileRateLimit,
  getCompileMode,
} from '../core/CompileRateLimiter.js';
import { compileRequestSchema, typstLivePreviewRequestSchema } from './schemas.js';

export function createRoutes(
  compileManager: CompileManager,
  cacheManager: CacheManager,
  typstLivePreviewManager: TypstLivePreviewManager,
  synctexManager: SynctexManager
): Router {
  const router = express.Router();

  /**
   * POST /project/:projectId/compile
   * Compile a document project
   */
  router.post('/project/:projectId/compile', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;
      const compileMode = getCompileMode(req);

      const rateLimitResult = await checkCompileRateLimit(req, projectId, compileMode);
      res.set(buildCompileRateLimitHeaders(rateLimitResult));
      if (!rateLimitResult.allowed) {
        res.set('Retry-After', String(rateLimitResult.quota.retryAfterSec));
        res.status(429).json({
          status: 'rate-limited',
          reason: rateLimitResult.reason,
          message:
            rateLimitResult.reason === 'daily'
              ? 'Daily compile quota reached for this client.'
              : 'Compile rate limit reached. Please retry shortly.',
          limit: rateLimitResult.quota.limit,
          used: rateLimitResult.quota.used,
          remaining: rateLimitResult.quota.remaining,
          retryAfterSec: rateLimitResult.quota.retryAfterSec,
        });
        return;
      }

      // Validate request body
      const body = compileRequestSchema.parse(req.body);
      const compileRequestBody = {
        compiler: body.compiler,
        rootResourcePath: body.rootResourcePath,
        timeout: body.timeout,
        draft: body.draft,
        stopOnFirstError: body.stopOnFirstError,
        allowNetwork: body.allowNetwork,
        resources: body.resources,
      };

      // Execute compilation
      const result = await compileManager.compile({
        projectId,
        ...compileRequestBody,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /project/:projectId/typst/live/preview
   * Compile Typst document using a warm live-preview session.
   */
  router.post(
    '/project/:projectId/typst/live/preview',
    async (req: Request, res: Response, next) => {
      try {
        const { projectId } = req.params;
        const compileMode = getCompileMode(req);

        const rateLimitResult = await checkCompileRateLimit(req, projectId, compileMode);
        res.set(buildCompileRateLimitHeaders(rateLimitResult));
        if (!rateLimitResult.allowed) {
          res.set('Retry-After', String(rateLimitResult.quota.retryAfterSec));
          res.status(429).json({
            status: 'rate-limited',
            reason: rateLimitResult.reason,
            message:
              rateLimitResult.reason === 'daily'
                ? 'Daily compile quota reached for this client.'
                : 'Compile rate limit reached. Please retry shortly.',
            limit: rateLimitResult.quota.limit,
            used: rateLimitResult.quota.used,
            remaining: rateLimitResult.quota.remaining,
            retryAfterSec: rateLimitResult.quota.retryAfterSec,
          });
          return;
        }

        const body = typstLivePreviewRequestSchema.parse(req.body);
        const typstPreviewRequestBody = {
          rootResourcePath: body.rootResourcePath,
          timeout: body.timeout,
          allowNetwork: body.allowNetwork,
          resources: body.resources,
        };

        const result = await typstLivePreviewManager.preview({
          projectId,
          ...typstPreviewRequestBody,
        });

        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /project/:projectId/compile/stop
   * Stop a running compilation
   */
  router.post('/project/:projectId/compile/stop', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;
      await compileManager.stopCompile(projectId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /project/:projectId/typst/live
   * Stop Typst live-preview session for a project.
   */
  router.delete('/project/:projectId/typst/live', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;
      await typstLivePreviewManager.stopProject(projectId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /project/:projectId
   * Clear all cached builds for a project
   */
  router.delete('/project/:projectId', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;
      await typstLivePreviewManager.stopProject(projectId);
      await compileManager.clearCache(projectId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /project/:projectId/build/:buildId/output/:filename
   * Serve a cached output file
   */
  router.get(
    '/project/:projectId/build/:buildId/output/:filename',
    async (req: Request, res: Response, next) => {
      try {
        const { projectId, buildId, filename } = req.params;

        const filePath = cacheManager.getOutputPath(projectId, buildId, filename);

        // Set content type based on file extension
        if (filename.endsWith('.pdf')) {
          res.type('application/pdf');
        } else if (filename.endsWith('.log')) {
          res.type('text/plain');
        }

        res.sendFile(filePath);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /project/:projectId/sync/code
   * Sync from source (file/line/column) to PDF coordinates.
   */
  router.get('/project/:projectId/sync/code', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;
      const file = String(req.query.file || '');
      const line = Number(req.query.line);
      const column = Number(req.query.column);
      const buildId = String(req.query.buildId || '');

      const result = await synctexManager.syncFromCode(projectId, {
        buildId,
        file,
        line,
        column,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof SynctexNotFoundError) {
        res.status(404).send('Not Found');
        return;
      }
      next(error);
    }
  });

  /**
   * GET /project/:projectId/sync/pdf
   * Sync from PDF coordinates to source (file/line/column).
   */
  router.get('/project/:projectId/sync/pdf', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;
      const page = Number(req.query.page);
      const h = Number(req.query.h);
      const v = Number(req.query.v);
      const buildId = String(req.query.buildId || '');

      const result = await synctexManager.syncFromPdf(projectId, {
        buildId,
        page,
        h,
        v,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof SynctexNotFoundError) {
        res.status(404).send('Not Found');
        return;
      }
      next(error);
    }
  });

  /**
   * GET /status
   * Health check
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'CLSI',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
