import axios from 'axios';
import { 
    fetchDevToLogic, 
    fetchRedditLogic, 
    fetchLobstersLogic 
} from '../services/fetcher.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Fetcher Normalization Logic', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly normalize Dev.to API responses', async () => {
        const mockDevToData = [
            {
                title: 'Test Article',
                url: 'https://dev.to/test',
                user: { name: 'Test Author' },
                description: 'Test Summary',
                tag_list: ['tag1', 'tag2'],
                published_at: '2025-01-21T14:30:00Z'
            }
        ];

        mockedAxios.get.mockResolvedValueOnce({ data: mockDevToData });

        const result = await fetchDevToLogic('https://dev.to/api/articles');
        
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            title: 'Test Article',
            url: 'https://dev.to/test',
            author: 'Test Author',
            source: 'devto',
            summary: 'Test Summary',
            tags: ['tag1', 'tag2']
        });
        expect(result[0].publishedAt).toBeInstanceOf(Date);
    });

    it('should correctly normalize Reddit API responses', async () => {
        const mockRedditData = {
            data: {
                children: [
                    {
                        data: {
                            title: 'Reddit Post',
                            url: 'https://reddit.com/r/test',
                            author: 'reddit_user',
                            selftext: 'Post content',
                            created_utc: 1737469800,
                            permalink: '/r/programming/test'
                        }
                    }
                ]
            }
        };

        mockedAxios.get.mockResolvedValueOnce({ data: mockRedditData });

        const result = await fetchRedditLogic('https://www.reddit.com/r/programming/new.json');
        
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Reddit Post');
        expect(result[0].source).toBe('reddit-programming');
        expect(result[0].author).toBe('reddit_user');
    });

    it('should gracefully handle empty or malformed responses', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: null });
        const result = await fetchDevToLogic('https://dev.to/api/articles');
        expect(result).toEqual([]);
    });
});
