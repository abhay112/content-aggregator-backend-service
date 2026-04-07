import axios from 'axios';
import prisma from '../prisma';

interface NormalizedArticle {
    title: string;
    url: string;
    author: string;
    source: string;
    summary?: string;
    tags?: string;
    publishedAt: Date;
    fetchedAt: Date;
}

const saveArticles = async (articles: NormalizedArticle[]): Promise<void> => {
    for (const article of articles) {
        try {
            await prisma.article.upsert({
                where: { url: article.url },
                update: {
                    fetchedAt: article.fetchedAt,
                    summary: article.summary,
                    tags: article.tags,
                },
                create: article,
            });
        } catch (err) {
            console.warn(`[saveArticles] skipped article "${article.title}":`, (err as Error).message);
        }
    }
};

const fetchHackerNewsLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
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
                });
            }
        } catch (e) { /* skip individual failure */ }
    }
    return articles;
};

const fetchDevToLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
    const { data } = await axios.get<any[]>(apiUrl, { timeout: 10_000 });
    const fetchedAt = new Date();
    return (data || []).filter(a => a.url && a.title).map(a => ({
        title: a.title,
        url: a.url,
        author: a.user?.name || a.user?.username || 'Unknown',
        source: 'devto',
        summary: a.description || '',
        tags: (a.tag_list || []).join(','),
        publishedAt: a.published_at ? new Date(a.published_at) : fetchedAt,
        fetchedAt,
    }));
};

const fetchRedditLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
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
        publishedAt: new Date(p.created_utc * 1000),
        fetchedAt,
    }));
};

const fetchLobstersLogic = async (apiUrl: string): Promise<NormalizedArticle[]> => {
    const { data } = await axios.get<any[]>(apiUrl, { timeout: 10_000 });
    const fetchedAt = new Date();
    return (data || []).slice(0, 10).filter(s => s.title).map(s => ({
        title: s.title,
        url: s.url || s.comments_url,
        author: s.submitter_user?.username || 'Unknown',
        source: 'lobsters',
        summary: s.description || '',
        tags: (s.tags || []).join(','),
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
        console.log('[Fetcher] Syncing from database sources...');
        const sources = await prisma.source.findMany({ where: { active: true } });

        for (const source of sources) {
            const logic = fetcherLogicMap[source.slug];
            if (!logic) {
                console.warn(`[Fetcher] No logic implemented for source slug: ${source.slug}`);
                continue;
            }

            try {
                console.log(`[Fetcher] Fetching: ${source.name} (${source.apiUrl})`);
                const articles = await logic(source.apiUrl);
                if (articles.length > 0) {
                    await saveArticles(articles);
                    console.log(`[Fetcher] Saved ${articles.length} articles from ${source.name}`);
                    await prisma.source.update({
                        where: { id: source.id },
                        data: { lastFetchedAt: new Date() }
                    });
                }
            } catch (err) {
                console.error(`[Fetcher] Failed to refresh source ${source.name}:`, (err as Error).message);
            }
        }
    } catch (err) {
        console.error('[Fetcher] Global refresh error:', err);
    }
};

export const startCronJobs = (): void => {
    const cron = require('node-cron');
    console.log('[Cron] Scheduling dynamic content aggregation every 15 minutes...');

    cron.schedule('*/15 * * * *', async () => {
        console.log('[Cron] Running scheduled dynamic content aggregation...');
        await runAllFetchers();
    });

    runAllFetchers().catch(console.error);
};
