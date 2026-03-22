import 'reflect-metadata';
import pino from 'pino';
import IORedis from 'ioredis';
import { setupAuditArchiveProcessor } from './processors/audit-archive-processor.js';

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const auditArchive = setupAuditArchiveProcessor(connection);

logger.info('ERP Worker started. Active processors: audit-archive');

const gracefulShutdown = async () => {
  logger.info('Shutting down worker...');
  await auditArchive.worker.close();
  await auditArchive.queue.close();
  await connection.quit();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
