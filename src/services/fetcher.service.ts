import axios from 'axios';
import prisma from '../prisma';
import logger from '../utils/logger';
import {
    cronJobLastRunTimestamp,
    cronJobRunsTotal,
    articlesFetchedTotal,
    articlesFetchErrorsTotal,
    cronJobDurationSeconds,
    sourceFetchDurationSeconds,
    rateLimitHitsTotal,
} from '../utils/metrics';
import { retryRequest } from '../utils/retry';

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

// ──────────────────────────────────────────────
// Persistence
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Data Retention Policy (2 weeks)
// ──────────────────────────────────────────────

const cleanupOldArticles = async (): Promise<void> => {
    try {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        logger.info(
            { retentionDays: 14, olderThan: twoWeeksAgo.toISOString() },
            '[Cleanup] Running data retention cleanup (2-week policy)...'
        );

        const { count } = await prisma.article.deleteMany({
            where: {
                fetchedAt: { lt: twoWeeksAgo },
                isBookmarked: false,
            },
        });

        if (count > 0) {
            logger.info({ deletedCount: count }, '[Cleanup] Deleted old unbookmarked articles (older than 14 days)');
        } else {
            logger.info('[Cleanup] No articles older than 14 days found, nothing to clean up.');
        }
    } catch (err) {
        logger.error({ err }, '[Cleanup] Failed to run data retention cleanup');
    }
};

export const fetchHackerNewsLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
    const { data: storyIds } = await axios.get<number[]>(apiUrl, { timeout: 10_000 });
    if (!storyIds?.length) return [];

    const fetchedAt = new Date();
    const articles: NormalizedArticle[] = [];
    const itemBaseUrl = apiUrl.replace(/\/[^\/]+\.json$/, '/item');

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
                    tags: story.type ? [story.type] : [],
                });
            }
        } catch (e) { /* skip individual story */ }
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
        headers: { 'User-Agent': 'content-aggregator-bot/1.0' },
    });
    const posts: any[] = data?.data?.children || [];
    const fetchedAt = new Date();
    const redditBaseUrl = new URL(apiUrl).origin;

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
        const runStartedAt = new Date().toISOString();
        const sources = await prisma.source.findMany({ where: { active: true } });

        logger.info(
            { sourceCount: sources.length, runStartedAt },
            '[Fetcher] Starting aggregation run across all active sources'
        );

        const results: { source: string; status: string; count?: number; error?: string; durationMs: number }[] = [];

        for (const source of sources) {
            const logic = fetcherLogicMap[source.slug];
            if (!logic) {
                logger.warn({ sourceSlug: source.slug }, '[Fetcher] No logic implemented for source, skipping');
                continue;
            }

            const sourceStart = Date.now();

            try {
                logger.info(
                    { source: source.slug, sourceName: source.name, apiUrl: source.apiUrl },
                    '[Fetcher] Fetching from source...'
                );

                const articles = await retryRequest(
                    () => logic(source.apiUrl).then(data => ({ data } as any)),
                    3,
                    1000,
                    source.slug
                ).then(res => res.data as NormalizedArticle[]);

                const durationMs = Date.now() - sourceStart;

                if (articles.length > 0) {
                    await saveArticles(articles);
                    articlesFetchedTotal.labels(source.slug).inc(articles.length);
                    await prisma.source.update({
                        where: { id: source.id },
                        data: { lastFetchedAt: new Date(), lastError: null },
                    });
                }

                sourceFetchDurationSeconds.labels(source.slug, 'success').observe(durationMs / 1000);

                logger.info(
                    {
                        source: source.slug,
                        sourceName: source.name,
                        articlesCount: articles.length,
                        durationMs,
                        status: 'success',
                    },
                    '[Fetcher] Source fetch completed'
                );

                results.push({ source: source.slug, status: 'success', count: articles.length, durationMs });

            } catch (err: any) {
                const durationMs = Date.now() - sourceStart;
                const isRateLimit = err.response?.status === 429;
                const errorCode = isRateLimit ? 'RATE_LIMIT_429' : (err.code || `HTTP_${err.response?.status || 'UNKNOWN'}`);
                const errorMessage = isRateLimit ? 'Rate Limit Exceeded (429)' : (err.message || String(err));

                // Metrics
                articlesFetchErrorsTotal.labels(source.slug, errorCode).inc();
                sourceFetchDurationSeconds.labels(source.slug, 'failure').observe(durationMs / 1000);

                if (isRateLimit) {
                    rateLimitHitsTotal.labels(source.slug).inc();
                    logger.warn(
                        {
                            source: source.slug,
                            sourceName: source.name,
                            errorCode,
                            durationMs,
                            status: 'rate_limited',
                            retryAt: '4 hours (next scheduled run)',
                        },
                        '[Fetcher] Rate limit hit (429) — will retry on next scheduled run'
                    );
                } else {
                    logger.error(
                        {
                            err,
                            source: source.slug,
                            sourceName: source.name,
                            errorCode,
                            durationMs,
                            status: 'failure',
                        },
                        '[Fetcher] Source fetch failed'
                    );
                }

                await prisma.source.update({
                    where: { id: source.id },
                    data: { lastError: errorMessage },
                }).catch(() => { /* don't let DB write fail the loop */ });

                results.push({ source: source.slug, status: isRateLimit ? 'rate_limited' : 'failure', error: errorMessage, durationMs });
            }
        }

        // Summary log at the end of the run
        const totalFetched = results.filter(r => r.status === 'success').reduce((sum, r) => sum + (r.count || 0), 0);
        const successCount = results.filter(r => r.status === 'success').length;
        const rateLimitedCount = results.filter(r => r.status === 'rate_limited').length;
        const failureCount = results.filter(r => r.status === 'failure').length;

        logger.info(
            {
                runStartedAt,
                sourcesTotal: sources.length,
                successCount,
                rateLimitedCount,
                failureCount,
                totalArticlesFetched: totalFetched,
                perSource: results,
            },
            '[Fetcher] Aggregation run complete — summary'
        );

    } catch (err) {
        logger.error({ err }, '[Fetcher] Global aggregation run error');
    }
};

// ──────────────────────────────────────────────
// Cron Scheduler
// ──────────────────────────────────────────────

const runCronCycle = async (type: 'scheduled' | 'startup'): Promise<void> => {
    const start = Date.now();
    const triggeredAt = new Date().toISOString();

    logger.info({ type, triggeredAt }, `[Cron] ===== Cron job triggered (${type.toUpperCase()}) =====`);

    try {
        await cleanupOldArticles();
        await runAllFetchers();

        const duration = (Date.now() - start) / 1000;
        cronJobRunsTotal.labels('success', type).inc();
        cronJobDurationSeconds.labels('success', type).observe(duration);

        logger.info(
            { type, triggeredAt, duration, status: 'success' },
            `[Cron] ===== Cron job FINISHED (${type.toUpperCase()}) ===== [${duration.toFixed(2)}s]`
        );
    } catch (err) {
        const duration = (Date.now() - start) / 1000;
        cronJobRunsTotal.labels('failure', type).inc();
        cronJobDurationSeconds.labels('failure', type).observe(duration);

        logger.error(
            { err, type, triggeredAt, duration, status: 'failure' },
            `[Cron] ===== Cron job FAILED (${type.toUpperCase()}) ===== [${duration.toFixed(2)}s]`
        );
    } finally {
        cronJobLastRunTimestamp.set(Math.floor(Date.now() / 1000));
    }
};

export const startCronJobs = (): void => {
    const cron = require('node-cron');

    // Refresh frequency: every 4 hours
    logger.info('[Cron] Registering schedule: every 4 hours (0 */4 * * *)');

    cron.schedule('0 */4 * * *', () => runCronCycle('scheduled'));

    // Immediate startup run to populate data when server first starts
    runCronCycle('startup');
};
