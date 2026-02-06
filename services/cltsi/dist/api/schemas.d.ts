import { z } from 'zod';
export declare const compileRequestSchema: z.ZodObject<{
    compiler: z.ZodDefault<z.ZodEnum<["pdflatex", "xelatex", "lualatex", "typst"]>>;
    rootResourcePath: z.ZodString;
    timeout: z.ZodOptional<z.ZodNumber>;
    draft: z.ZodOptional<z.ZodBoolean>;
    stopOnFirstError: z.ZodOptional<z.ZodBoolean>;
    resources: z.ZodArray<z.ZodEffects<z.ZodObject<{
        path: z.ZodString;
        content: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        modified: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
    }, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
    }>, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
    }, {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    compiler: "pdflatex" | "xelatex" | "lualatex" | "typst";
    rootResourcePath: string;
    resources: {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
    }[];
    timeout?: number | undefined;
    draft?: boolean | undefined;
    stopOnFirstError?: boolean | undefined;
}, {
    rootResourcePath: string;
    resources: {
        path: string;
        url?: string | undefined;
        content?: string | undefined;
        modified?: number | undefined;
    }[];
    timeout?: number | undefined;
    compiler?: "pdflatex" | "xelatex" | "lualatex" | "typst" | undefined;
    draft?: boolean | undefined;
    stopOnFirstError?: boolean | undefined;
}>;
export type CompileRequestBody = z.infer<typeof compileRequestSchema>;
//# sourceMappingURL=schemas.d.ts.map