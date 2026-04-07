import { z } from 'zod';

export const articleQuerySchema = z.object({
    page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 10)),
    source: z.string().optional(),
    q: z.string().optional(),
    saved: z.enum(['true', 'false']).optional()
});

