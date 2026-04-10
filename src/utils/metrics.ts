import client from 'prom-client';
import { Express } from 'express';

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'content-aggregator'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Cron Metrics
export const cronJobLastRunTimestamp = new client.Gauge({
  name: 'cron_job_last_run_timestamp',
  help: 'Last time the cron job finished (unix timestamp)'
});

export const cronJobRunsTotal = new client.Counter({
  name: 'cron_job_runs_total',
  help: 'Total number of cron job runs',
  labelNames: ['status']
});

export const articlesFetchedTotal = new client.Counter({
  name: 'articles_fetched_total',
  help: 'Total number of articles fetched',
  labelNames: ['source']
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(cronJobLastRunTimestamp);
register.registerMetric(cronJobRunsTotal);
register.registerMetric(articlesFetchedTotal);

export const setupMetrics = (app: Express) => {
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error instanceof Error ? error.message : 'Metrics error');
    }
  });
};
