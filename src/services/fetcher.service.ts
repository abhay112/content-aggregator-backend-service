import axios from 'axios';
import prisma from '../prisma';
import logger from '../utils/logger';
import { cronJobLastRunTimestamp, cronJobRunsTotal, articlesFetchedTotal } from '../utils/metrics';

export interface NormalizedArticle {
    title: string;
    url: string;
    author: string;
    source: string;
    summary?: string;
    tags?: string[];
    publishedAt: Date;
    fetchedAt: Date;
}

const saveArticles = async (articles: NormalizedArticle[]): Promise<void> => {
    for (const article of articles) {
        try {
            await prisma.article.upsert({
                where: { url_source: { url: article.url, source: article.source } },
                update: {
                    fetchedAt: article.fetchedAt,
                    summary: article.summary ?? null,
                    tags: { set: article.tags || [] },
                },
                create: {
                    ...article,
                    tags: article.tags || [],
                    summary: article.summary ?? null,
                },

            });
        } catch (err) {
            logger.warn({ err, articleTitle: article.title }, '[saveArticles] skipped article');
        }
    }
};

export const fetchHackerNewsLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
    const { data: storyIds } = await axios.get<number[]>(apiUrl, { timeout: 10_000 });
    if (!storyIds?.length) return [];

    const fetchedAt = new Date();
    const articles: NormalizedArticle[] = [];
    const itemBaseUrl = process.env.HN_ITEM_BASE_URL || 'https://hacker-news.firebaseio.com/v0/item';

    for (const id of storyIds.slice(0, 10)) {
        try {
            const { data: story } = await axios.get(`${itemBaseUrl}/${id}.json`, { timeout: 8_000 });
            if (story?.url && story?.title) {
                articles.push({
                    title: story.title,
                    url: story.url,
                    author: story.by || 'Unknown',
                    source: 'hacker-news',
                    publishedAt: new Date(story.time * 1000),
                    fetchedAt,
                    tags: story.type ? [story.type] : []
                });
            }
        } catch (e) { /* skip */ }
    }
    return articles;
};

export const fetchDevToLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
    const { data } = await axios.get<any[]>(apiUrl, { timeout: 10_000 });
    const fetchedAt = new Date();
    return (data || []).filter(a => a.url && a.title).map(a => ({
        title: a.title,
        url: a.url,
        author: a.user?.name || a.user?.username || 'Unknown',
        source: 'devto',
        summary: a.description || '',
        tags: a.tag_list || [],
        publishedAt: a.published_at ? new Date(a.published_at) : fetchedAt,
        fetchedAt,
    }));
};

export const fetchRedditLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
    const { data } = await axios.get(apiUrl, {
        timeout: 10_000,
        headers: { 'User-Agent': 'content-aggregator-bot/1.0' }
    });
    const posts: any[] = data?.data?.children || [];
    const fetchedAt = new Date();
    const redditBaseUrl = process.env.REDDIT_BASE_URL || 'https://reddit.com';

    return posts.map(p => p.data).filter(p => p.title).map(p => ({
        title: p.title,
        url: p.url?.startsWith('http') ? p.url : `${redditBaseUrl}${p.permalink}`,
        author: p.author || 'Unknown',
        source: 'reddit-programming',
        summary: p.selftext || '',
        tags: ['programming'],
        publishedAt: new Date(p.created_utc * 1000),
        fetchedAt,
    }));
};

export const fetchLobstersLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
    const { data } = await axios.get<any[]>(apiUrl, { timeout: 10_000 });
    const fetchedAt = new Date();
    return (data || []).slice(0, 10).filter(s => s.title).map(s => ({
        title: s.title,
        url: s.url || s.comments_url,
        author: s.submitter_user?.username || 'Unknown',
        source: 'lobsters',
        summary: s.description || '',
        tags: s.tags || [],
        publishedAt: s.created_at ? new Date(s.created_at) : fetchedAt,
        fetchedAt,
    }));
};

const fetcherLogicMap: Record<string, (apiUrl: string) => Promise<NormalizedArticle[]>> = {
    'hacker-news': fetchHackerNewsLogic,
    'devto': fetchDevToLogic,
    'reddit-programming': fetchRedditLogic,
    'lobsters': fetchLobstersLogic,
};

export const runAllFetchers = async (): Promise<void> => {
    try {
        logger.info('[Fetcher] Syncing from database sources...');
        const sources = await prisma.source.findMany({ where: { active: true } });

        for (const source of sources) {
            const logic = fetcherLogicMap[source.slug];
            if (!logic) {
                logger.warn({ sourceSlug: source.slug }, '[Fetcher] No logic implemented for source slug');
                continue;
            }

            try {
                logger.info({ sourceName: source.name, apiUrl: source.apiUrl }, '[Fetcher] Fetching');
                const articles = await logic(source.apiUrl);
                if (articles.length > 0) {
                    await saveArticles(articles);
                    articlesFetchedTotal.labels(source.slug).inc(articles.length);
                    logger.info({ count: articles.length, sourceName: source.name }, '[Fetcher] Saved articles');
                     await prisma.source.update({
                        where: { id: source.id },
                        data: { 
                            lastFetchedAt: new Date(),
                            lastError: null 
                        }
                    });
                }
            } catch (err: any) {
                let errorMessage = err.message || String(err);
                if (err.response && err.response.status === 429) {
                    errorMessage = 'Rate Limit Exceeded (429)';
                    logger.warn({ sourceName: source.name }, '[Fetcher] Rate limit exceeded (429). Will retry on next cycle.');
                } else {
                    logger.error({ err, sourceName: source.name }, '[Fetcher] Failed to refresh source');
                }

                await prisma.source.update({
                    where: { id: source.id },
                    data: { lastError: errorMessage }
                });
            }
        }
    } catch (err) {
        logger.error({ err }, '[Fetcher] Global refresh error');
    }
};

const cleanupOldArticles = async (): Promise<void> => {
    try {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const { count } = await prisma.article.deleteMany({
            where: {
                fetchedAt: {
                    lt: twoWeeksAgo,
                },
                isBookmarked: false,
            },
        });
        if (count > 0) {
            logger.info({ deletedCount: count }, '[Cleanup] Deleted old unbookmarked articles');
        }
    } catch (err) {
        logger.error({ err }, '[Cleanup] Failed to clean up old articles');
    }
};

export const startCronJobs = (): void => {
    const cron = require('node-cron');
    logger.info('[Cron] Scheduling dynamic content aggregation every 4 hours...');

    cron.schedule('0 */4 * * *', async () => {
        logger.info('[Cron] Running scheduled dynamic content aggregation...');
        try {
            await cleanupOldArticles();
            await runAllFetchers();
            cronJobRunsTotal.labels('success').inc();
        } catch (err) {
            cronJobRunsTotal.labels('failure').inc();
            logger.error({ err }, '[Cron] Scheduled run failed');
        } finally {
            cronJobLastRunTimestamp.set(Math.floor(Date.now() / 1000));
        }
    });

    // Startup run
    (async () => {
        try {
            await cleanupOldArticles();
            await runAllFetchers();
            cronJobRunsTotal.labels('success').inc();
        } catch (err) {
            cronJobRunsTotal.labels('failure').inc();
            logger.error({ err }, '[Cron] Startup sync failed');
        } finally {
            cronJobLastRunTimestamp.set(Math.floor(Date.now() / 1000));
        }
    })();
};
