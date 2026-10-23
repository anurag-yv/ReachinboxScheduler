import Redis from 'ioredis';
import { ENV } from './env';

export const createRedisConnection = () => {
  const isTls = ENV.REDIS_URL.startsWith('rediss://');

  const connection = new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? {} : undefined,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
  });

  connection.on('error', (err) => {
    if ((err as any).code !== 'ECONNREFUSED') {
      console.error('[Redis Error]', err.message);
    }
  });

  return connection;
};

// Singleton instance for general caching/rate-limiting
export const redisClient = createRedisConnection();
