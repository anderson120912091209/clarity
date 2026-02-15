import express from 'express';
import cors from 'cors';
import { DockerExecutor } from './core/DockerExecutor.js';
import { LatexRunner } from './core/LatexRunner.js';
import { TypstRunner } from './core/TypstRunner.js';
import { LockManager } from './core/LockManager.js';
import { ResourceManager } from './core/ResourceManager.js';
import { CacheManager } from './core/CacheManager.js';
import { CompileManager } from './core/CompileManager.js';
import { TypstLivePreviewManager } from './core/TypstLivePreviewManager.js';
import { SynctexManager } from './core/SynctexManager.js';
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
        const typstRunner = new TypstRunner(dockerExecutor);
        const cacheManager = new CacheManager();
        const typstLivePreviewManager = new TypstLivePreviewManager(resourceManager, cacheManager);
        const synctexManager = new SynctexManager(dockerExecutor, cacheManager);
        const compileManager = new CompileManager(lockManager, resourceManager, latexRunner, typstRunner, cacheManager);
        // Create Express app
        const app = express();
        // CORS - Allow frontend to communicate with CLSI
        const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean);
        const isProduction = process.env.NODE_ENV === 'production';
        app.use(cors({
            origin: (origin, callback) => {
                // Allow requests without Origin (e.g. curl, server-to-server checks)
                if (!origin) {
                    callback(null, true);
                    return;
                }
                // In local development, avoid CORS breakage when frontend runs on a dynamic host/port.
                if (!isProduction) {
                    callback(null, true);
                    return;
                }
                if (configuredOrigins.includes(origin)) {
                    callback(null, true);
                    return;
                }
                callback(new Error(`CORS blocked for origin: ${origin}`));
            },
            credentials: true
        }));
        // Middleware
        app.use(express.json({ limit: '50mb' }));
        app.use(requestLogger);
        // Routes
        app.use(createRoutes(compileManager, cacheManager, typstLivePreviewManager, synctexManager));
        // Error handling (must be last)
        app.use(errorHandler);
        // Start server
        const server = app.listen(settings.port, settings.host, () => {
            logger.info({
                host: settings.host,
                port: settings.port,
                compileDir: settings.compileDir,
                outputDir: settings.outputDir,
            }, 'CLSI service ready');
        });
        // Graceful shutdown
        const handleShutdown = (signal) => {
            logger.info({ signal }, 'Shutdown signal received, shutting down gracefully');
            void typstLivePreviewManager.shutdown().catch((error) => {
                logger.warn({ err: error }, 'Failed to shutdown Typst live preview manager');
            });
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
        process.on('SIGINT', () => handleShutdown('SIGINT'));
    }
    catch (error) {
        logger.fatal({ err: error }, 'Failed to start CLSI service');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=server.js.map