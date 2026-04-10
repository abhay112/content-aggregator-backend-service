import request from 'supertest';
import app from '../index';

describe('App Health Check', () => {
    it('should return 200 and OK status', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'OK',
            message: 'Content Aggregator Simple API is running'
        });
    });

    it('should return 404 for unknown routes', async () => {
        const response = await request(app).get('/api/v1/unknown-route-xyz');
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
    });
});
