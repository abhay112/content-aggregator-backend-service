import pino from 'pino';
import path from 'path';
import fs from 'fs';

// In production, LOG_DIR should be /var/log/content-aggregator (what Promtail watches).
// In development, fall back to <project>/logs/.
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: logFile, mkdir: true },
    },
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    },
  ],
});

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    // 'app' label MUST match the Promtail scrape label {app="content-aggregator"}
    base: {
      app: 'content-aggregator',
      service: 'content-aggregator',
      env: process.env.NODE_ENV || 'development',
    },
  },
  transport
);

export default logger;
