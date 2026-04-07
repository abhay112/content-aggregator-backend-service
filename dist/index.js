"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const article_routes_1 = __importDefault(require("./routes/article.routes"));
const fetcher_service_1 = require("./services/fetcher.service");
const response_1 = require("./utils/response");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000; // using 4000 to avoid conflicting with original backend 3000/5001
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api', article_routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Content Aggregator Simple API is running' });
});
// Unknown routes handler
app.use((req, res) => {
    (0, response_1.sendError)(res, 'Route not found', 'NOT_FOUND', 404);
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    (0, response_1.sendError)(res, err.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR', err.status || 500);
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    (0, fetcher_service_1.startCronJobs)();
});
