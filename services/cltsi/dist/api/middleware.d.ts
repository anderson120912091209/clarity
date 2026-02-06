import type { Request, Response, NextFunction } from 'express';
/**
 * Error handling middleware
 */
export declare function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
/**
 * Request logger middleware
 */
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=middleware.d.ts.map