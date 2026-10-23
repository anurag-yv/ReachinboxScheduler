import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { ENV } from './config/env';
import { emailQueueService } from './services/emailQueueService';
import { requireAuth } from './middleware/authMiddleware';

import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import senderRoutes from './routes/senderRoutes';
import slackRoutes from './routes/slackRoutes';
import healthRoutes from './routes/healthRoutes';

export const createApp = () => {
  const app = express();

  // Basic Middleware
  app.use(
    cors({
      origin: [ENV.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Bull Board Queue Dashboard setup
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueueService.getRawQueue() as any) as any],
    serverAdapter: serverAdapter,
  });

  // Protect Bull Board with session authentication
  app.use('/admin/queues', requireAuth, serverAdapter.getRouter());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/senders', senderRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/api/health', healthRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: ENV.NODE_ENV === 'development' ? err.message : 'An unexpected server error occurred',
    });
  });

  return app;
};
