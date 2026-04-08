import { z } from 'zod';

export const articleQuerySchema = z.object({
    page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 12)),
    source: z.string().optional(),
    q: z.string().optional(),
    search: z.string().optional(),
    saved: z.string().optional().transform(val => (val ? val === 'true' : undefined)),
    isBookmarked: z.string().optional().transform(val => (val ? val === 'true' : undefined)),
    sortBy: z.string().optional()
});





