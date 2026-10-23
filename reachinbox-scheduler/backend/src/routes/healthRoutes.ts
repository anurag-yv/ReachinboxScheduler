import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { redisClient } from '../config/redis';
import { emailQueueService } from '../services/emailQueueService';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';
  let queueMetrics = { waiting: 0, delayed: 0, active: 0, completed: 0, failed: 0 };

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'healthy';
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  try {
    const ping = await redisClient.ping();
    if (ping === 'PONG') redisStatus = 'healthy';
  } catch (err: any) {
    redisStatus = `error: ${err.message}`;
  }

  try {
    queueMetrics = await emailQueueService.getQueueMetrics();
  } catch {
    // Queue metrics optional if Redis not connected
  }

  const overallStatus = dbStatus === 'healthy' && redisStatus === 'healthy' ? 'healthy' : 'degraded';

  return res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
    queue: queueMetrics,
  });
});

export default router;
