"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.requestLogger = requestLogger;
const zod_1 = require("zod");
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
    logger_js_1.default.error({ err, path: req.path, method: req.method }, 'Request error');
    // Validation errors
    if (err instanceof zod_1.z.ZodError) {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.errors,
        });
    }
    if (err instanceof errors_js_1.ValidationError) {
        return res.status(400).json({
            error: err.message,
        });
    }
    // Compilation errors (return 200 with error status)
    if (err instanceof errors_js_1.CompilationError) {
        return res.status(200).json({
            status: 'error',
            buildId: err.details.buildId,
            outputFiles: err.details.outputFiles,
            message: err.message,
        });
    }
    if (err instanceof errors_js_1.TimeoutError) {
        return res.status(200).json({
            status: 'timeout',
            message: err.message,
        });
    }
    // Generic server error
    return res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
}
/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_js_1.default.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
        }, 'Request completed');
    });
    next();
}
//# sourceMappingURL=middleware.js.map