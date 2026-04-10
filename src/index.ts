import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import articleRoutes from './routes/article.routes';
import { startCronJobs } from './services/fetcher.service';
import { sendError } from './utils/response';
import { setupMetrics, httpRequestDurationMicroseconds, httpRequestsTotal } from './utils/metrics';
import logger from './utils/logger';
import { setupSwagger } from './utils/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Swagger Documentation
setupSwagger(app);

// Metrics middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        const statusCode = res.statusCode.toString();

        httpRequestDurationMicroseconds
            .labels(req.method, route, statusCode)
            .observe(duration);

        httpRequestsTotal
            .labels(req.method, route, statusCode)
            .inc();
    });
    next();
});

// Setup Prometheus metrics endpoint
setupMetrics(app);

// Routes
app.use('/api/v1', articleRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Base health check
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 message: { type: string }
 */
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'Content Aggregator Simple API is running' });
});

// Unknown routes handler
app.use((req: Request, res: Response) => {
    sendError(res, 'Route not found', 'NOT_FOUND', 404);
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err }, 'Unhandled Error');
    sendError(res, err.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR', err.status || 500);
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(Number(PORT), '0.0.0.0', () => {
        logger.info(`Server is running on port ${PORT}`);
        startCronJobs();
    });
}

export default app;
