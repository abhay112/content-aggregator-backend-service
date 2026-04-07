import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/response';
import * as SourceService from '../services/source.service';

export const getSources = catchAsync(async (req: Request, res: Response) => {
    const sources = await SourceService.getSources();
    sendSuccess(res, sources);
});

export const createSource = catchAsync(async (req: Request, res: Response) => {
    const { name, slug, apiUrl } = req.body;
    const newSource = await SourceService.createSource(name, slug, apiUrl);
    sendSuccess(res, newSource, { message: 'Source created successfully' }, 201);
});

export const checkHealth = catchAsync(async (req: Request, res: Response) => {
    sendSuccess(res, { status: 'OK', message: 'Service is healthy' });
});
