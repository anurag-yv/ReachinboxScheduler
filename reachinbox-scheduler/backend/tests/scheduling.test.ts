import { describe, it, expect, vi } from 'vitest';
import { IEmailQueueService, ISearchService, QueueJobData } from '../src/types';
import { BullMQEmailQueueService } from '../src/services/emailQueueService';

describe('Scheduling and Timing Calculations', () => {
  it('should calculate recipient scheduled times using startAt + recipientIndex * delaySeconds', () => {
    const startAt = new Date('2026-10-23T10:00:00.000Z');
    const delaySeconds = 5;
    const recipients = ['user1@test.com', 'user2@test.com', 'user3@test.com'];

    const scheduledTimes = recipients.map((_, index) => {
      return new Date(startAt.getTime() + index * delaySeconds * 1000);
    });

    expect(scheduledTimes[0].toISOString()).toBe('2026-10-23T10:00:00.000Z');
    expect(scheduledTimes[1].toISOString()).toBe('2026-10-23T10:00:05.000Z');
    expect(scheduledTimes[2].toISOString()).toBe('2026-10-23T10:00:10.000Z');
  });

  it('should generate deterministic BullMQ job IDs for idempotency', () => {
    const queueService = new BullMQEmailQueueService({} as any);
    const dbJobId = '550e8400-e29b-41d4-a716-446655440000';
    const deterministicId = queueService.getDeterministicJobId(dbJobId);

    expect(deterministicId).toBe('email-job-550e8400-e29b-41d4-a716-446655440000');
    // Repeating the call yields the exact same ID
    expect(queueService.getDeterministicJobId(dbJobId)).toBe(deterministicId);
  });

  it('should demonstrate Dependency Inversion with mock IEmailQueueService', async () => {
    const enqueuedJobs: { id: string; delay: number; data: QueueJobData }[] = [];

    const mockQueueService: IEmailQueueService = {
      async addDelayedJob(jobId, delayMs, data) {
        enqueuedJobs.push({ id: jobId, delay: delayMs, data });
      },
      async hasJob(jobId) {
        return enqueuedJobs.some((j) => j.id === jobId);
      },
      async getQueueMetrics() {
        return { waiting: 0, delayed: enqueuedJobs.length, active: 0, completed: 0, failed: 0 };
      },
    };

    await mockQueueService.addDelayedJob('job-1', 5000, {
      jobId: 'job-1',
      userId: 'u1',
      senderId: 's1',
      scheduleId: 'sch1',
      recipient: 'test@example.com',
      subject: 'Hello',
      body: 'World',
    });

    expect(enqueuedJobs).toHaveLength(1);
    expect(enqueuedJobs[0].delay).toBe(5000);
    expect(await mockQueueService.hasJob('job-1')).toBe(true);
    expect(await mockQueueService.hasJob('job-unknown')).toBe(false);
  });
});
