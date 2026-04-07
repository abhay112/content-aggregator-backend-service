import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import articleRoutes from './routes/article.routes';
import { startCronJobs } from './services/fetcher.service';
import { sendError } from './utils/response';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', articleRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'Content Aggregator Simple API is running' });
});

// Unknown routes handler
app.use((req: Request, res: Response) => {
    sendError(res, 'Route not found', 'NOT_FOUND', 404);
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Error:', err);
    sendError(res, err.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR', err.status || 500);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startCronJobs();
});
