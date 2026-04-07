import { z } from 'zod';

export const createSourceSchema = z.object({
    name: z.string().min(1, 'Source name is required'),
    slug: z.string().min(1, 'Slug is required'),
    apiUrl: z.string().url('Invalid API URL format')
});

