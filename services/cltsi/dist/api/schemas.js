"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileRequestSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod schemas for request validation
 */
const resourceSchema = zod_1.z.object({
    path: zod_1.z.string().min(1),
    content: zod_1.z.string().optional(),
    url: zod_1.z.string().url().optional(),
    modified: zod_1.z.number().optional(),
}).refine(data => data.content !== undefined || data.url !== undefined, { message: 'Resource must have either content or url' });
exports.compileRequestSchema = zod_1.z.object({
    compiler: zod_1.z.enum(['pdflatex', 'xelatex', 'lualatex', 'typst']).default('pdflatex'),
    rootResourcePath: zod_1.z.string().min(1),
    timeout: zod_1.z.number().min(1000).max(300000).optional(), // 1s to 5min
    draft: zod_1.z.boolean().optional(),
    stopOnFirstError: zod_1.z.boolean().optional(),
    resources: zod_1.z.array(resourceSchema).min(1),
});
//# sourceMappingURL=schemas.js.map