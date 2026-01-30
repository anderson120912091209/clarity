import express from 'express';
import cors from 'cors';
import { DockerExecutor } from './core/DockerExecutor.js';
import { LatexRunner } from './core/LatexRunner.js';
import { LockManager } from './core/LockManager.js';
import { ResourceManager } from './core/ResourceManager.js';
import { CacheManager } from './core/CacheManager.js';
import { CompileManager } from './core/CompileManager.js';
import { createRoutes } from './api/routes.js';
import { errorHandler, requestLogger } from './api/middleware.js';
import settings from './config/settings.js';
import logger from './utils/logger.js';

async function main() {
  try {
    logger.info('Starting CLSI service...');

    // Initialize Docker executor
    const dockerExecutor = new DockerExecutor();
    await dockerExecutor.initialize();
    logger.info('Docker initialized');

    // Create core modules
    const lockManager = new LockManager();
    const resourceManager = new ResourceManager();
    const latexRunner = new LatexRunner(dockerExecutor);
    const cacheManager = new CacheManager();
    const compileManager = new CompileManager(
      lockManager,
      resourceManager,
      latexRunner,
      cacheManager
    );

    // Create Express app
    const app = express();

    // CORS - Allow frontend to communicate with CLSI
    app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(requestLogger);

    // Routes
    app.use(createRoutes(compileManager, cacheManager));

    // Error handling (must be last)
    app.use(errorHandler);

    // Start server
    const server = app.listen(settings.port, () => {
      logger.info(
        {
          port: settings.port,
          compileDir: settings.compileDir,
          outputDir: settings.outputDir,
        },
        'CLSI service ready'
      );
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start CLSI service');
    process.exit(1);
  }
}

main();
