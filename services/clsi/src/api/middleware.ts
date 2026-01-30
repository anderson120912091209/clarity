import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError, CompilationError, TimeoutError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err, path: req.path, method: req.method }, 'Request error');

  // Validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: err.message,
    });
  }

  // Compilation errors (return 200 with error status)
  if (err instanceof CompilationError) {
    return res.status(200).json({
      status: 'error',
      buildId: err.details.buildId,
      outputFiles: err.details.outputFiles,
      message: err.message,
    });
  }

  if (err instanceof TimeoutError) {
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
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    }, 'Request completed');
  });

  next();
}
