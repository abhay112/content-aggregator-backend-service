import { z } from 'zod';

const positiveInt = (fieldName: string, max = 1000) =>
    z
        .string()
        .optional()
        .transform((val, ctx) => {
            if (!val) return undefined;
            const parsed = parseInt(val, 10);
            if (isNaN(parsed)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${fieldName} must be a valid integer` });
                return z.NEVER;
            }
            if (parsed < 1) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${fieldName} must be >= 1` });
                return z.NEVER;
            }
            if (parsed > max) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${fieldName} must be <= ${max}` });
                return z.NEVER;
            }
            return parsed;
        });

export const articleQuerySchema = z.object({
    page: positiveInt('page', 10_000).transform(v => v ?? 1),
    limit: positiveInt('limit', 100).transform(v => v ?? 12),
    source: z.string().optional(),
    q: z.string().optional(),
    search: z.string().optional(),
    saved: z.string().optional().transform(val => (val ? val === 'true' : undefined)),
    isBookmarked: z.string().optional().transform(val => (val ? val === 'true' : undefined)),
    sortBy: z.string().optional(),
});
