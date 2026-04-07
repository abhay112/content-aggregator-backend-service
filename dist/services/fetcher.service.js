"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = exports.fetchMockNews = exports.fetchHackerNews = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../prisma"));
const fetchHackerNews = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Fetching new stories from Hacker News...');
        // get top 5 latest story ids
        const { data: storyIds } = yield axios_1.default.get('https://hacker-news.firebaseio.com/v0/newstories.json');
        if (!storyIds || storyIds.length === 0)
            return;
        const latestIds = storyIds.slice(0, 5);
        for (const id of latestIds) {
            const { data: story } = yield axios_1.default.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            if (story && story.url && story.title) {
                // Upsert to avoid duplicates
                yield prisma_1.default.article.upsert({
                    where: { url: story.url },
                    update: {},
                    create: {
                        title: story.title,
                        url: story.url,
                        author: story.by || 'Unknown',
                        source: 'Hacker News',
                        publishedAt: new Date(story.time * 1000), // HN time is in seconds
                    }
                });
            }
        }
        console.log('Hacker News fetch completed.');
    }
    catch (error) {
        console.error('Error fetching Hacker News:', error);
    }
});
exports.fetchHackerNews = fetchHackerNews;
const fetchMockNews = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Fetching mock news...');
        const uniqueId = Date.now().toString();
        yield prisma_1.default.article.upsert({
            where: { url: `https://mock.com/news-${uniqueId}` },
            update: {},
            create: {
                title: `Mock News Title ${Math.floor(Math.random() * 1000)}`,
                url: `https://mock.com/news-${uniqueId}`,
                author: 'Mock Author',
                source: 'Mock Source',
                publishedAt: new Date(),
            }
        });
        console.log('Mock News fetch completed.');
    }
    catch (error) {
        console.error('Error fetching mock news:', error);
    }
});
exports.fetchMockNews = fetchMockNews;
const startCronJobs = () => {
    const cron = require('node-cron');
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Running scheduled content aggregation...');
        yield (0, exports.fetchHackerNews)();
        yield (0, exports.fetchMockNews)();
    }));
    // Run once immediately on start
    (0, exports.fetchHackerNews)();
    (0, exports.fetchMockNews)();
};
exports.startCronJobs = startCronJobs;
