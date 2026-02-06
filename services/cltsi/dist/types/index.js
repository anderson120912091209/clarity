"use strict";
/**
 * Type definitions for CLSI service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.TimeoutError = exports.CompilationError = void 0;
class CompilationError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'CompilationError';
    }
}
exports.CompilationError = CompilationError;
class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=index.js.map