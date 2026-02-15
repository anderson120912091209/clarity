/**
 * Type definitions for CLSI service
 */
export class CompilationError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'CompilationError';
    }
}
export class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
//# sourceMappingURL=index.js.map