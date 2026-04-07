import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess, sendError } from '../utils/response';
import * as ArticleService from '../services/article.service';

export const getArticles = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, source, q, saved } = req.query;

    const { articles, total } = await ArticleService.getArticles(
        Number(page),
        Number(limit),
        source as string,
        q as string,
        saved === 'true' ? true : undefined
    );

    sendSuccess(res, articles, {
        page: Number(page),
        limit: Number(limit),
        total
    });
});

export const getArticleById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const article = await ArticleService.getArticleById(id as string);

    if (!article) {
        sendError(res, 'Article not found', 'NOT_FOUND', 404);
        return;
    }

    sendSuccess(res, article);
});

export const toggleBookmark = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const article = await ArticleService.toggleBookmark(id as string);

    if (!article) {
        sendError(res, 'Article not found', 'NOT_FOUND', 404);
        return;
    }

    const status = article.isBookmarked ? 'saved' : 'unsaved';
    sendSuccess(res, article, { message: `Article ${status} successfully` });
});

export const refreshArticles = catchAsync(async (req: Request, res: Response) => {
    await ArticleService.triggerRefresh();
    sendSuccess(res, { message: 'Articles refreshed successfully' });
});
