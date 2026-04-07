import prisma from '../prisma';

export const getArticles = async (skip: number, limit: number, whereClause: any) => {
    return prisma.article.findMany({
        where: whereClause,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
    });
};

export const countArticles = async (whereClause: any) => {
    return prisma.article.count({ where: whereClause });
};

export const getArticleById = async (id: string) => {
    return prisma.article.findUnique({
        where: { id }
    });
};

export const toggleBookmark = async (id: string) => {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return null;

    return prisma.article.update({
        where: { id },
        data: { isBookmarked: !article.isBookmarked }
    });
};

export const upsertArticle = async (url: string, data: any) => {
    return prisma.article.upsert({
        where: { url },
        update: {
            fetchedAt: data.fetchedAt || new Date(),
        },
        create: data
    });
};

