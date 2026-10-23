import { Queue } from 'bullmq';
import { IEmailQueueService, QueueJobData } from '../types';
import { createRedisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export class BullMQEmailQueueService implements IEmailQueueService {
  private queue: Queue<QueueJobData>;

  constructor(customQueue?: Queue<QueueJobData>) {
    if (customQueue) {
      this.queue = customQueue;
    } else {
      const connection = createRedisConnection();
      this.queue = new Queue<QueueJobData>(EMAIL_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: false, // Keep for dashboard visibility & audit
          removeOnFail: false,
        },
      });
    }
  }

  public getRawQueue(): Queue<QueueJobData> {
    return this.queue;
  }

  /**
   * Deterministic job ID ensures practical idempotency.
   * If a job with this ID is already in the queue, BullMQ ignores the duplicate.
   */
  public getDeterministicJobId(emailJobId: string): string {
    return `email-job-${emailJobId}`;
  }

  async addDelayedJob(emailJobId: string, delayMs: number, data: QueueJobData): Promise<void> {
    const jobId = this.getDeterministicJobId(emailJobId);
    await this.queue.add('send-email', data, {
      jobId,
      delay: Math.max(0, delayMs),
    });
  }

  async hasJob(emailJobId: string): Promise<boolean> {
    const jobId = this.getDeterministicJobId(emailJobId);
    const existing = await this.queue.getJob(jobId);
    return existing !== undefined && existing !== null;
  }

  async getQueueMetrics(): Promise<{
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, delayed, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getDelayedCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, delayed, active, completed, failed };
  }
}

// Singleton queue service
export const emailQueueService = new BullMQEmailQueueService();
