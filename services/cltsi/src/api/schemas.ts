import { z } from 'zod';

/**
 * Zod schemas for request validation
 */

const resourceSchema = z.object({
  path: z.string().min(1),
  content: z.string().optional(),
  url: z.string().url().optional(),
  modified: z.number().optional(),
  encoding: z.enum(['utf-8', 'base64']).optional(),
}).refine(
  data => data.content !== undefined || data.url !== undefined,
  { message: 'Resource must have either content or url' }
);

export const compileRequestSchema = z.object({
  compiler: z.enum(['pdflatex', 'xelatex', 'lualatex', 'typst']).default('pdflatex'),
  rootResourcePath: z.string().min(1),
  timeout: z.number().min(1000).max(300000).optional(), // 1s to 5min
  draft: z.boolean().optional(),
  stopOnFirstError: z.boolean().default(true),
  allowNetwork: z.boolean().optional(),
  resources: z.array(resourceSchema).min(1),
});

export const typstLivePreviewRequestSchema = z.object({
  rootResourcePath: z.string().min(1),
  timeout: z.number().min(500).max(300000).optional(),
  allowNetwork: z.boolean().optional(),
  resources: z.array(resourceSchema).min(1),
});

export type CompileRequestBody = z.infer<typeof compileRequestSchema>;
export type TypstLivePreviewRequestBody = z.infer<typeof typstLivePreviewRequestSchema>;
