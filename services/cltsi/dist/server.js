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
        const compileManager = new CompileManager_js_1.CompileManager(lockManager, resourceManager, latexRunner, typstRunner, cacheManager);
        // Create Express app
        const app = (0, express_1.default)();
        // CORS - Allow frontend to communicate with CLSI
        app.use((0, cors_1.default)({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }));
        // Middleware
        app.use(express_1.default.json({ limit: '50mb' }));
        app.use(middleware_js_1.requestLogger);
        // Routes
        app.use((0, routes_js_1.createRoutes)(compileManager, cacheManager));
        // Error handling (must be last)
        app.use(middleware_js_1.errorHandler);
        // Start server
        const server = app.listen(settings_js_1.default.port, () => {
            logger_js_1.default.info({
                port: settings_js_1.default.port,
                compileDir: settings_js_1.default.compileDir,
                outputDir: settings_js_1.default.outputDir,
            }, 'CLSI service ready');
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_js_1.default.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger_js_1.default.info('Server closed');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger_js_1.default.fatal({ err: error }, 'Failed to start CLSI service');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=server.js.map