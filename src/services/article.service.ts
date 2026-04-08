import * as ArticleRepository from '../repositories/article.repository';
import { runAllFetchers } from './fetcher.service';

export const getArticles = async (page: number, limit: number, source?: string, q?: string, isBookmarked?: boolean, sortBy?: string) => {
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    if (source) {
        whereClause.source = source;
    }

    if (isBookmarked !== undefined) {
        whereClause.isBookmarked = String(isBookmarked) === 'true' || isBookmarked === true;
    }


    if (q) {
        whereClause = {
            ...whereClause,
            OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { author: { contains: q, mode: 'insensitive' } },
                { source: { contains: q, mode: 'insensitive' } },
                { summary: { contains: q, mode: 'insensitive' } }
            ]
        };
    }

    const [articles, total] = await Promise.all([
        ArticleRepository.getArticles(skip, limit, whereClause, sortBy),
        ArticleRepository.countArticles(whereClause)
    ]);

    return { articles, total };
};

export const getArticleById = async (id: string) => {
    return ArticleRepository.getArticleById(id);
};

export const toggleBookmark = async (id: string) => {
    return ArticleRepository.toggleBookmark(id);
};

export const clearAllBookmarks = async () => {
    return ArticleRepository.clearAllBookmarks();
};

export const triggerRefresh = async () => {

    await runAllFetchers();
    return true;
};
