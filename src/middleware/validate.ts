import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

export const validate = (schema: ZodSchema, property: 'body' | 'query' | 'params') =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validated = await schema.parseAsync(req[property]);
            if (property === 'query' || property === 'params') {
                for (const key in req[property]) {
                    delete req[property][key];
                }
                Object.assign(req[property], validated);
            } else {
                req[property] = validated;
            }
            next();


        } catch (error: any) {
            if (error instanceof ZodError || error.name === 'ZodError') {
                const errors = error.errors?.map((err: any) => ({
                    field: err.path.join('.'),
                    message: err.message
                })) || [];
                sendError(res, 'Validation Error', 'VALIDATION_ERROR', 400, errors);
                return;
            }
            next(error);
        }
    };
