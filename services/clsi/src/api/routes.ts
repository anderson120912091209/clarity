import express, { type Router, type Request, type Response } from 'express';
import { CompileManager } from '../core/CompileManager.js';
import { CacheManager } from '../core/CacheManager.js';
import { compileRequestSchema } from './schemas.js';
import logger from '../utils/logger.js';

export function createRoutes(
  compileManager: CompileManager,
  cacheManager: CacheManager
): Router {
  const router = express.Router();

  /**
   * POST /project/:projectId/compile
   * Compile a document project
   */
  router.post('/project/:projectId/compile', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;

      // Validate request body
      const body = compileRequestSchema.parse(req.body);

      // Execute compilation
      const result = await compileManager.compile({
        projectId,
        ...body,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

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
   * DELETE /project/:projectId
   * Clear all cached builds for a project
   */
  router.delete('/project/:projectId', async (req: Request, res: Response, next) => {
    try {
      const { projectId } = req.params;
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
   * GET /status
   * Health check
   */
  router.get('/status', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'CLSI',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
