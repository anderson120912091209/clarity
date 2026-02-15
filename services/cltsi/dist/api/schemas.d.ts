import { z } from 'zod';
export declare const compileRequestSchema: z.ZodObject<{
    compiler: z.ZodDefault<z.ZodEnum<["pdflatex", "xelatex", "lualatex", "typst"]>>;
    rootResourcePath: z.ZodString;
    timeout: z.ZodOptional<z.ZodNumber>;
    draft: z.ZodOptional<z.ZodBoolean>;
    stopOnFirstError: z.ZodOptional<z.ZodBoolean>;
    allowNetwork: z.ZodOptional<z.ZodBoolean>;
    resources: z.ZodArray<z.ZodEffects<z.ZodObject<{
        path: z.ZodString;
        content: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        modified: z.ZodOptional<z.ZodNumber>;
        encoding: z.ZodOptional<z.ZodEnum<["utf-8", "base64"]>>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }>, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    compiler: "pdflatex" | "xelatex" | "lualatex" | "typst";
    rootResourcePath: string;
    resources: {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }[];
    timeout?: number | undefined;
    allowNetwork?: boolean | undefined;
    draft?: boolean | undefined;
    stopOnFirstError?: boolean | undefined;
}, {
    rootResourcePath: string;
    resources: {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }[];
    timeout?: number | undefined;
    compiler?: "pdflatex" | "xelatex" | "lualatex" | "typst" | undefined;
    allowNetwork?: boolean | undefined;
    draft?: boolean | undefined;
    stopOnFirstError?: boolean | undefined;
}>;
export declare const typstLivePreviewRequestSchema: z.ZodObject<{
    rootResourcePath: z.ZodString;
    timeout: z.ZodOptional<z.ZodNumber>;
    allowNetwork: z.ZodOptional<z.ZodBoolean>;
    resources: z.ZodArray<z.ZodEffects<z.ZodObject<{
        path: z.ZodString;
        content: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        modified: z.ZodOptional<z.ZodNumber>;
        encoding: z.ZodOptional<z.ZodEnum<["utf-8", "base64"]>>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }>, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rootResourcePath: string;
    resources: {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }[];
    timeout?: number | undefined;
    allowNetwork?: boolean | undefined;
}, {
    rootResourcePath: string;
    resources: {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
        encoding?: "utf-8" | "base64" | undefined;
    }[];
    timeout?: number | undefined;
    allowNetwork?: boolean | undefined;
}>;
export type CompileRequestBody = z.infer<typeof compileRequestSchema>;
export type TypstLivePreviewRequestBody = z.infer<typeof typstLivePreviewRequestSchema>;
//# sourceMappingURL=schemas.d.ts.map