"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const DockerExecutor_js_1 = require("./core/DockerExecutor.js");
const LatexRunner_js_1 = require("./core/LatexRunner.js");
const TypstRunner_js_1 = require("./core/TypstRunner.js");
const LockManager_js_1 = require("./core/LockManager.js");
const ResourceManager_js_1 = require("./core/ResourceManager.js");
const CacheManager_js_1 = require("./core/CacheManager.js");
const CompileManager_js_1 = require("./core/CompileManager.js");
const TypstLivePreviewManager_js_1 = require("./core/TypstLivePreviewManager.js");
const SynctexManager_js_1 = require("./core/SynctexManager.js");
const routes_js_1 = require("./api/routes.js");
const middleware_js_1 = require("./api/middleware.js");
const settings_js_1 = __importDefault(require("./config/settings.js"));
const logger_js_1 = __importDefault(require("./utils/logger.js"));
async function main() {
    try {
        logger_js_1.default.info('Starting CLSI service...');
        // Initialize Docker executor
        const dockerExecutor = new DockerExecutor_js_1.DockerExecutor();
        await dockerExecutor.initialize();
        logger_js_1.default.info('Docker initialized');
        // Create core modules
        const lockManager = new LockManager_js_1.LockManager();
        const resourceManager = new ResourceManager_js_1.ResourceManager();
        const latexRunner = new LatexRunner_js_1.LatexRunner(dockerExecutor);
        const typstRunner = new TypstRunner_js_1.TypstRunner(dockerExecutor);
        const cacheManager = new CacheManager_js_1.CacheManager();
        const typstLivePreviewManager = new TypstLivePreviewManager_js_1.TypstLivePreviewManager(resourceManager, cacheManager);
        const synctexManager = new SynctexManager_js_1.SynctexManager(dockerExecutor, cacheManager);
        const compileManager = new CompileManager_js_1.CompileManager(lockManager, resourceManager, latexRunner, typstRunner, cacheManager);
        // Create Express app
        const app = (0, express_1.default)();
        // CORS - Allow frontend to communicate with CLSI
        const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean);
        const isProduction = process.env.NODE_ENV === 'production';
        app.use((0, cors_1.default)({
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
        app.use(express_1.default.json({ limit: '50mb' }));
        app.use(middleware_js_1.requestLogger);
        // Routes
        app.use((0, routes_js_1.createRoutes)(compileManager, cacheManager, typstLivePreviewManager, synctexManager));
        // Error handling (must be last)
        app.use(middleware_js_1.errorHandler);
        // Start server
        const server = app.listen(settings_js_1.default.port, settings_js_1.default.host, () => {
            logger_js_1.default.info({
                host: settings_js_1.default.host,
                port: settings_js_1.default.port,
                compileDir: settings_js_1.default.compileDir,
                outputDir: settings_js_1.default.outputDir,
            }, 'CLSI service ready');
        });
        // Graceful shutdown
        const handleShutdown = (signal) => {
            logger_js_1.default.info({ signal }, 'Shutdown signal received, shutting down gracefully');
            void typstLivePreviewManager.shutdown().catch((error) => {
                logger_js_1.default.warn({ err: error }, 'Failed to shutdown Typst live preview manager');
            });
            server.close(() => {
                logger_js_1.default.info('Server closed');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
        process.on('SIGINT', () => handleShutdown('SIGINT'));
    }
    catch (error) {
        logger_js_1.default.fatal({ err: error }, 'Failed to start CLSI service');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=server.js.map