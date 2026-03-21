import pino from 'pino';
import IORedis from 'ioredis';

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

logger.info('Chat Worker started. Waiting for jobs...');

// Baileys connection + queue processors will be added in Fase 5

const gracefulShutdown = async () => {
  logger.info('Shutting down chat worker...');
  await connection.quit();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
